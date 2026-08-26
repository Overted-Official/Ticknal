import webPush from 'web-push';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { positions, pushSubscriptions, signalNotifications, tickerAlerts, devicePushTokens } from '@/db/schema';
import { resolvePsiParamsAsync } from '@/strategies/PSI/psiParameterStore';
import { getDailyPriceBars } from '@/lib/strategyOrders';
import { normalizeTickerSymbol, runPsiStrategy, type PsiSignal } from '@/strategies/PSI/psiStrategy';

type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;

export type DispatchNotificationsResult = {
  configured: boolean;
  checkedSymbols: number;
  sent: number;
  skipped: number;
  expiredSubscriptions: number;
  messages: string[];
};

export function getVapidPublicKey(): string | null {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? null;
}

export function isPushConfigured(): boolean {
  return Boolean(getVapidPublicKey() && process.env.VAPID_PRIVATE_KEY);
}

export async function dispatchSignalNotifications(options: {
  symbols?: string[];
  lookbackBars?: number;
} = {}): Promise<DispatchNotificationsResult> {
  const result: DispatchNotificationsResult = {
    configured: isPushConfigured(),
    checkedSymbols: 0,
    sent: 0,
    skipped: 0,
    expiredSubscriptions: 0,
    messages: [],
  };

  if (result.configured) {
    configureWebPush();
  } else {
    result.messages.push('Web Push not configured, proceeding with Native Device & In-App notification dispatches.');
  }

  const symbolFilter = new Set((options.symbols ?? []).map(normalizeTickerSymbol));
  
  // 1. Get explicit alerts from users who tapped the bell icon
  const explicitAlertRows = (await db.select().from(tickerAlerts).where(eq(tickerAlerts.enabled, true))).filter((alert) =>
    symbolFilter.size === 0 ? true : symbolFilter.has(alert.tickerSymbol),
  );

  // 2. Automatically include any ticker that currently has an open position for that specific user
  const openOrderRows = await db.select({ tickerSymbol: positions.tickerSymbol, userId: positions.userId }).from(positions).where(eq(positions.status, 'OPEN'));
  
  // Merge explicit alerts and open positions directly
  const alertRows: { userId: string; tickerSymbol: string }[] = [...explicitAlertRows];
  
  for (const openOrder of openOrderRows) {
    if (symbolFilter.size === 0 || symbolFilter.has(openOrder.tickerSymbol)) {
      if (!alertRows.some(a => a.userId === openOrder.userId && a.tickerSymbol === openOrder.tickerSymbol)) {
        alertRows.push({ userId: openOrder.userId, tickerSymbol: openOrder.tickerSymbol });
      }
    }
  }

  if (alertRows.length === 0) {
    result.messages.push('No enabled ticker alerts or open positions matched.');
    return result;
  }

  const subscriptionRows = await db.select().from(pushSubscriptions);
  const subscriptionsByUser = groupBy(subscriptionRows, (subscription) => subscription.userId);

  const deviceTokenRows = await db.select().from(devicePushTokens).where(eq(devicePushTokens.isActive, true));
  const deviceTokensByUser = groupBy(
    deviceTokenRows.filter((d): d is typeof d & { userId: string } => Boolean(d.userId)),
    (d) => d.userId
  );

  // Group by ticker so we can fetch bars once per ticker
  const alertsByTicker = groupBy(alertRows, (alert) => alert.tickerSymbol);
  const lookbackBars = Math.max(1, options.lookbackBars ?? 5);

  // Fetch custom user strategy settings
  const { userStrategySettings } = await import('@/db/schema');
  const userSettingsRows = await db.select().from(userStrategySettings);
  const userSettingsMap = groupBy(userSettingsRows, (setting) => `${setting.userId}-${setting.tickerSymbol}`);

  for (const [ticker, userAlerts] of Object.entries(alertsByTicker)) {
    result.checkedSymbols += 1;
    const bars = await getDailyPriceBars(ticker);
    if (bars.length === 0) {
      result.skipped += userAlerts.length;
      continue;
    }

    const paramResolution = await resolvePsiParamsAsync(ticker, { startDate: '2025-01-01' });
    const defaultParams = paramResolution.params;
    const dateWindow = new Set(bars.slice(-lookbackBars).map((bar) => bar.date));

    for (const alert of userAlerts) {
      // Resolve user's global alert scope preference ('all' | 'psi' | 'thoth_egx_macro')
      const userGlobalScopeRow = userSettingsMap[`${alert.userId}-GLOBAL`]?.find(s => s.strategyName === 'alert_scope');
      let userScope: string = 'all';
      if (userGlobalScopeRow) {
        try {
          const parsed = JSON.parse(userGlobalScopeRow.params);
          userScope = parsed.scope || 'all';
        } catch (e) {}
      }

      // Check per-ticker alert scope if set
      const userSettingsKey = `${alert.userId}-${ticker}`;
      const userTickerScopeRow = userSettingsMap[userSettingsKey]?.find(s => s.strategyName === 'alert_scope');
      if (userTickerScopeRow) {
        try {
          const parsed = JSON.parse(userTickerScopeRow.params);
          if (parsed.scope) userScope = parsed.scope;
        } catch (e) {}
      }

      const signalsToDispatch: Array<{
        strategyId: string;
        strategyShort: string;
        strategyLabel: string;
        signal: any;
      }> = [];

      // 1. Evaluate PSI Strategy (using exact DB-tuned combinations)
      if (userScope === 'all' || userScope === 'psi') {
        const userSettingRow = userSettingsMap[userSettingsKey]?.find(s => s.strategyName === 'psi');
        let userParams = defaultParams;
        if (userSettingRow) {
          try {
            const parsed = JSON.parse(userSettingRow.params);
            userParams = { ...defaultParams, ...parsed };
          } catch (e) {
            console.error('Failed to parse user strategy settings', e);
          }
        }

        const psiResult = runPsiStrategy(bars, userParams);
        const signal = [...psiResult.signals].reverse().find((s) => dateWindow.has(s.date)) ?? null;
        if (signal) {
          signalsToDispatch.push({
            strategyId: 'psi',
            strategyShort: 'PSI',
            strategyLabel: 'PSI Strategy',
            signal,
          });
        }
      }

      // 2. Evaluate the frozen THOTH EGX V3.7P production strategy
      if (userScope === 'all' || userScope === 'thoth_egx_macro') {
        try {
          const { runThothV37PStrategy } = await import('@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy');
          const thothResult = await runThothV37PStrategy(bars, { ticker, startDate: '2025-01-01' });
          const signal = [...thothResult.signals].reverse().find((s) => dateWindow.has(s.date)) ?? null;
          if (signal) {
            signalsToDispatch.push({
              strategyId: 'thoth_egx_macro',
              strategyShort: 'THOTH',
              strategyLabel: 'THOTH EGX V3.7P',
              signal,
            });
          }
        } catch (e) {
          console.error('Failed to run Thoth strategy for alert', e);
        }
      }

      // 3. Evaluate the PSI V2 Strategy (GPT 3-PSI Architecture)
      if (userScope === 'all' || userScope === 'psi_v2') {
        try {
          const { runPsiV2Strategy } = await import('@/strategies/PSI_V2/psiV2Strategy');
          const psiV2Result = runPsiV2Strategy(bars, { ticker, startDate: '2025-01-01' });
          const signal = [...psiV2Result.signals].reverse().find((s) => dateWindow.has(s.date) && (s.signal === 'BUY' || s.signal === 'SELL')) ?? null;
          if (signal) {
            signalsToDispatch.push({
              strategyId: 'psi_v2',
              strategyShort: 'PSI V2',
              strategyLabel: 'PSI V2 Strategy',
              signal,
            });
          }
        } catch (e) {
          console.error('Failed to run PSI v2 strategy for alert', e);
        }
      }

      if (signalsToDispatch.length === 0) {
        result.skipped += 1;
        continue;
      }

      const openOrderExists = openOrderRows.some(o => o.userId === alert.userId && o.tickerSymbol === ticker);

      for (const item of signalsToDispatch) {
        const { strategyId, strategyShort, strategyLabel, signal } = item;

        const alreadySent = await hasNotificationBeenSent(alert.userId, ticker, strategyId, signal);
        if (alreadySent) {
          result.skipped += 1;
          continue;
        }

        // 1. Always record in-app notification in database for Notifications Drawer
        await db
          .insert(signalNotifications)
          .values({
            userId: alert.userId,
            tickerSymbol: ticker,
            strategy: strategyId,
            signalDate: signal.date,
            signal: signal.signal,
          })
          .onConflictDoNothing();

        // 2. If user has active Web Push subscriptions, send push notification to their devices
        const subscriptions = subscriptionsByUser[alert.userId] ?? [];
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: buildNotificationTitle(ticker, signal, openOrderExists, strategyShort),
            body: buildNotificationBody(signal, strategyLabel),
            url: `/invest?ticker=${ticker}&view=chart&strategy=${strategyId}`,
            tag: `${strategyId}-${ticker}-${signal.date}-${signal.signal}`,
            symbol: ticker,
            strategy: strategyId,
            signal: signal.signal,
            price: signal.price,
          });

          for (const subscription of subscriptions) {
            const sent = await sendToSubscription(subscription, payload);
            if (sent === 'expired') {
              result.expiredSubscriptions += 1;
              await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
            } else if (sent === 'sent') {
              result.sent += 1;
            }
          }
        }

        // 3. If user has active Android native tokens, dispatch high-priority FCM notification
        const nativeTokens = deviceTokensByUser[alert.userId] ?? [];
        if (nativeTokens.length > 0) {
          for (const device of nativeTokens) {
            await sendFCMNotification(device.token, {
              title: buildNotificationTitle(ticker, signal, openOrderExists, strategyShort),
              body: buildNotificationBody(signal, strategyLabel),
              url: `/invest?ticker=${ticker}&view=chart&strategy=${strategyId}`,
              ticker,
              strategy: strategyId,
              signal: signal.signal,
            });
          }
        }
      }
    }
  }

  return result;
}

export async function dispatchTestNotification(): Promise<DispatchNotificationsResult> {
  const result: DispatchNotificationsResult = {
    configured: isPushConfigured(),
    checkedSymbols: 0,
    sent: 0,
    skipped: 0,
    expiredSubscriptions: 0,
    messages: [],
  };

  if (!result.configured) {
    result.messages.push('Web Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
    return result;
  }

  configureWebPush();

  const subscriptionRows = await db.select().from(pushSubscriptions);
  if (subscriptionRows.length === 0) {
    result.messages.push('No active push subscriptions found.');
    return result;
  }

  const payload = JSON.stringify({
    title: 'Test Notification',
    body: 'This is a mock push notification to test the alert feature.',
    url: '/dashboard',
    tag: `test-notification-${Date.now()}`,
    symbol: 'TEST',
    signal: 'TEST',
    price: '0.00',
  });

  for (const subscription of subscriptionRows) {
    const sent = await sendToSubscription(subscription, payload);
    if (sent === 'expired') {
      result.expiredSubscriptions += 1;
      await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
    } else if (sent === 'sent') {
      result.sent += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}

function configureWebPush() {
  const publicKey = getVapidPublicKey();
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;

  const subject = (process.env.WEB_PUSH_SUBJECT && !process.env.WEB_PUSH_SUBJECT.includes('.local'))
    ? process.env.WEB_PUSH_SUBJECT
    : 'mailto:support@quantegx.com';

  webPush.setVapidDetails(
    subject,
    publicKey,
    privateKey,
  );
}



async function hasNotificationBeenSent(userId: string, ticker: string, strategy: string, signal: PsiSignal): Promise<boolean> {
  const rows = await db
    .select({ id: signalNotifications.id })
    .from(signalNotifications)
    .where(
      and(
        eq(signalNotifications.userId, userId),
        eq(signalNotifications.tickerSymbol, ticker),
        eq(signalNotifications.strategy, strategy),
        eq(signalNotifications.signalDate, signal.date),
        eq(signalNotifications.signal, signal.signal),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function sendToSubscription(
  subscription: PushSubscriptionRow,
  payload: string,
): Promise<'sent' | 'expired' | 'failed'> {
  try {
    await webPush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      },
      payload,
    );
    return 'sent';
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    if (statusCode === 404 || statusCode === 410 || statusCode === 403) return 'expired';
    console.error('Failed to send Web Push notification:', error);
    return 'failed';
  }
}

function buildNotificationTitle(
  ticker: string,
  signal: PsiSignal,
  openOrderExists: boolean,
  strategyShort: string = 'PSI'
): string {
  const prefix = `[${strategyShort}]`;
  if (signal.signal === 'BUY') return `${prefix} ${ticker} has a buy opportunity`;
  if (openOrderExists) return `${prefix} Sell the open ${ticker} position`;
  return `${prefix} ${ticker} has an exit signal`;
}

function buildNotificationBody(
  signal: PsiSignal,
  strategyLabel: string = 'PSI Strategy'
): string {
  const price = `${Number(signal.price).toFixed(2)} EGP`;
  if (signal.signal === 'BUY') return `${strategyLabel} buy signal at ${price}.`;
  return `${strategyLabel} ${signal.signal.replace('SELL_', '').toLowerCase()} exit at ${price}.`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}

async function sendFCMNotification(
  deviceToken: string,
  payload: {
    title: string;
    body: string;
    url: string;
    ticker: string;
    strategy: string;
    signal: string;
  }
) {
  const fcmServerKey = process.env.FCM_SERVER_KEY;
  if (!fcmServerKey) return;

  try {
    await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: deviceToken,
        priority: 'high',
        notification: {
          title: payload.title,
          body: payload.body,
          sound: 'default',
          android_channel_id: 'trading_signals',
        },
        data: {
          url: payload.url,
          ticker: payload.ticker,
          strategy: payload.strategy,
          signal: payload.signal,
        },
      }),
    });
  } catch (err) {
    console.error('Failed to send FCM notification:', err);
  }
}

