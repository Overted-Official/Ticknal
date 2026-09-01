import webPush from 'web-push';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { positions, pushSubscriptions, signalNotifications, tickerAlerts, devicePushTokens } from '@/db/schema';
import { resolvePsiParamsAsync } from '@/strategies/PSI/psiParameterStore';
import { getDailyPriceBars } from '@/lib/strategyOrders';
import { normalizeTickerSymbol, runPsiStrategy, type PsiSignal, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { sendFCMMessage } from '@/lib/fcm-v1';

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
  
  // 1. Fetch user alerts and open positions
  const [explicitAlertRows, openOrderRows, subscriptionRows, deviceTokenRows] = await Promise.all([
    db.select().from(tickerAlerts).where(eq(tickerAlerts.enabled, true)),
    db.select({ tickerSymbol: positions.tickerSymbol, userId: positions.userId }).from(positions).where(eq(positions.status, 'OPEN')),
    db.select().from(pushSubscriptions),
    db.select().from(devicePushTokens).where(eq(devicePushTokens.isActive, true)),
  ]);

  // Collect all distinct active user IDs
  const userIds = new Set<string>();
  subscriptionRows.forEach(s => { if (s.userId) userIds.add(s.userId); });
  deviceTokenRows.forEach(d => { if (d.userId) userIds.add(d.userId); });
  openOrderRows.forEach(o => { if (o.userId) userIds.add(o.userId); });
  explicitAlertRows.forEach(a => { if (a.userId) userIds.add(a.userId); });

  if (userIds.size === 0) {
    result.messages.push('No active users found for notification dispatch.');
    return result;
  }

  const subscriptionsByUser = groupBy(subscriptionRows, (subscription) => subscription.userId);
  const deviceTokensByUser = groupBy(
    deviceTokenRows.filter((d): d is typeof d & { userId: string } => Boolean(d.userId)),
    (d) => d.userId
  );

  const lookbackBars = Math.max(1, options.lookbackBars ?? 5);

  // Fetch custom user strategy settings
  const { userStrategySettings, tickers: tickersTable, dailyPrices } = await import('@/db/schema');
  const userSettingsRows = await db.select().from(userStrategySettings);
  const userSettingsMap = groupBy(userSettingsRows, (setting) => `${setting.userId}-${setting.tickerSymbol}`);

  // Fetch all stock price bars in a single high-performance bulk query
  const priceRows = await db.execute(sql`
    SELECT ticker_symbol, date, open, high, low, close, volume
    FROM ${dailyPrices}
    WHERE date >= CURRENT_DATE - INTERVAL '14 months' AND volume > 0
    ORDER BY ticker_symbol, date ASC
  `) as any[];

  const barsByTicker = new Map<string, PriceBar[]>();
  for (const row of priceRows) {
    const sym = normalizeTickerSymbol(String(row.ticker_symbol));
    if (symbolFilter.size > 0 && !symbolFilter.has(sym)) continue;

    const bars = barsByTicker.get(sym) ?? [];
    bars.push({
      date: typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date as Date).toISOString().split('T')[0],
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    });
    barsByTicker.set(sym, bars);
  }

  const { resolvePsiParamsFromStore } = await import('@/strategies/PSI/psiParameterStore');
  const { runThothV37PStrategy } = await import('@/strategies/THOTH_EGX_V3_7P/thothV37PStrategy');
  const { runPsiV2Strategy } = await import('@/strategies/PSI_V2/psiV2Strategy');

  const THOTH_FOCUS_TICKERS = new Set([
    'COMI', 'FWRY', 'EAST', 'TMGH', 'HRHO', 'SWDY', 'ETEL', 'ABUK',
    'EKHO', 'ORAS', 'ISPH', 'CIEB', 'AMOC', 'ESRS', 'ADIB', 'HELI',
    'AUTO', 'JUFO', 'SKPC', 'MNHD', 'EFID', 'ALCN', 'CERA', 'MFPC',
  ]);

  const newNotificationsToInsert: Array<{
    userId: string;
    tickerSymbol: string;
    strategy: string;
    signalDate: string;
    signal: string;
  }> = [];

  const pushTasks: Array<() => Promise<void>> = [];

  for (const userId of userIds) {
    const [userOpenRows, userAlertRows, existingNotifs] = await Promise.all([
      db.select({ tickerSymbol: positions.tickerSymbol }).from(positions).where(and(eq(positions.userId, userId), eq(positions.status, 'OPEN'))),
      db.select({ tickerSymbol: tickerAlerts.tickerSymbol }).from(tickerAlerts).where(and(eq(tickerAlerts.userId, userId), eq(tickerAlerts.enabled, true))),
      db.select({
        tickerSymbol: signalNotifications.tickerSymbol,
        strategy: signalNotifications.strategy,
        signalDate: signalNotifications.signalDate,
        signal: signalNotifications.signal,
      }).from(signalNotifications).where(eq(signalNotifications.userId, userId)),
    ]);

    const userOpenSymbols = new Set(userOpenRows.map(o => normalizeTickerSymbol(o.tickerSymbol)));
    const userAlertedSymbols = new Set(userAlertRows.map(a => normalizeTickerSymbol(a.tickerSymbol)));
    const sentSet = new Set(existingNotifs.map(n => `${n.tickerSymbol}-${n.strategy}-${n.signalDate}-${n.signal}`));

    const userGlobalScopeRow = userSettingsMap[`${userId}-GLOBAL`]?.find(s => s.strategyName === 'alert_scope');
    let userDefaultScope = 'all';
    if (userGlobalScopeRow) {
      try {
        const parsed = JSON.parse(userGlobalScopeRow.params);
        userDefaultScope = parsed.scope || 'all';
      } catch (e) {}
    }

    const subscriptions = subscriptionsByUser[userId] ?? [];
    const nativeTokens = deviceTokensByUser[userId] ?? [];

    for (const [ticker, bars] of barsByTicker.entries()) {
      if (bars.length < 80) continue;
      result.checkedSymbols += 1;

      const isPositionOpen = userOpenSymbols.has(ticker);
      const isAlerted = userAlertedSymbols.has(ticker);
      const isTracked = isPositionOpen || isAlerted;

      // Determine strategy scope for this ticker
      let userScope = userDefaultScope;
      const userTickerScopeRow = userSettingsMap[`${userId}-${ticker}`]?.find(s => s.strategyName === 'alert_scope');
      if (userTickerScopeRow) {
        try {
          const parsed = JSON.parse(userTickerScopeRow.params);
          if (parsed.scope) userScope = parsed.scope;
        } catch (e) {}
      }

      const dateWindow = new Set(bars.slice(-lookbackBars).map((bar) => bar.date));
      const signalsToDispatch: Array<{
        strategyId: string;
        strategyShort: string;
        strategyLabel: string;
        signal: any;
      }> = [];

      // 1. Evaluate PSI Strategy
      if (userScope === 'all' || userScope === 'psi') {
        try {
          const psiParams = resolvePsiParamsFromStore(ticker, { startDate: '2025-01-01' });
          const psiResult = runPsiStrategy(bars, psiParams);
          const signal = [...psiResult.signals].reverse().find((s) => dateWindow.has(s.date)) ?? null;
          if (signal) {
            // If tracked (held or alerted), dispatch both BUY and SELL. If untracked, dispatch BUY opportunities.
            if (signal.signal === 'BUY' || isTracked) {
              signalsToDispatch.push({
                strategyId: 'psi',
                strategyShort: 'PSI',
                strategyLabel: 'PSI Strategy',
                signal,
              });
            }
          }
        } catch (e) {}
      }

      // 2. Evaluate THOTH Strategy (targeted to focus tickers and tracked positions)
      if ((userScope === 'all' || userScope === 'thoth_egx_macro') && (isTracked || THOTH_FOCUS_TICKERS.has(ticker))) {
        try {
          const thothResult = await runThothV37PStrategy(bars, { ticker, startDate: '2025-01-01' });
          const signal = [...thothResult.signals].reverse().find((s) => dateWindow.has(s.date)) ?? null;
          if (signal) {
            if (signal.signal === 'BUY' || isTracked) {
              signalsToDispatch.push({
                strategyId: 'thoth_egx_macro',
                strategyShort: 'THOTH',
                strategyLabel: 'THOTH EGX V3.7P',
                signal,
              });
            }
          }
        } catch (e) {}
      }

      // 3. Evaluate PSI V2 Strategy
      if (userScope === 'all' || userScope === 'psi_v2') {
        try {
          const psiV2Result = runPsiV2Strategy(bars, { ticker, startDate: '2025-01-01' });
          const signal = [...psiV2Result.signals].reverse().find((s) => dateWindow.has(s.date) && (s.signal === 'BUY' || s.signal === 'SELL')) ?? null;
          if (signal) {
            if (signal.signal === 'BUY' || isTracked) {
              signalsToDispatch.push({
                strategyId: 'psi_v2',
                strategyShort: 'PSI V2',
                strategyLabel: 'PSI V2 Strategy',
                signal,
              });
            }
          }
        } catch (e) {}
      }

      if (signalsToDispatch.length === 0) {
        result.skipped += 1;
        continue;
      }

      for (const item of signalsToDispatch) {
        const { strategyId, strategyShort, strategyLabel, signal } = item;

        const notifKey = `${ticker}-${strategyId}-${signal.date}-${signal.signal}`;
        if (sentSet.has(notifKey)) {
          result.skipped += 1;
          continue;
        }
        sentSet.add(notifKey);

        // Queue in-app notification row
        newNotificationsToInsert.push({
          userId: userId,
          tickerSymbol: ticker,
          strategy: strategyId,
          signalDate: signal.date,
          signal: signal.signal,
        });

        // Queue push deliveries
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: buildNotificationTitle(ticker, signal, isPositionOpen, strategyShort),
            body: buildNotificationBody(signal, strategyLabel),
            url: `/invest?ticker=${ticker}&view=chart&strategy=${strategyId}`,
            tag: `${strategyId}-${ticker}-${signal.date}-${signal.signal}`,
            symbol: ticker,
            strategy: strategyId,
            signal: signal.signal,
            price: signal.price,
          });

          for (const sub of subscriptions) {
            pushTasks.push(async () => {
              const sent = await sendToSubscription(sub, payload);
              if (sent === 'expired') {
                result.expiredSubscriptions += 1;
                await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint)).catch(() => {});
              } else if (sent === 'sent') {
                result.sent += 1;
              }
            });
          }
        }

        if (nativeTokens.length > 0) {
          for (const device of nativeTokens) {
            pushTasks.push(async () => {
              const fcmSent = await sendFCMMessage(device.token, {
                title: buildNotificationTitle(ticker, signal, isPositionOpen, strategyShort),
                body: buildNotificationBody(signal, strategyLabel),
                url: `/invest?ticker=${ticker}&view=chart&strategy=${strategyId}`,
                ticker,
                strategy: strategyId,
                signal: signal.signal,
              });
              if (fcmSent) {
                result.sent += 1;
              }
            });
          }
        }
      }
    }
  }

  // 1. Batch insert in-app notifications
  if (newNotificationsToInsert.length > 0) {
    for (let i = 0; i < newNotificationsToInsert.length; i += 50) {
      const slice = newNotificationsToInsert.slice(i, i + 50);
      await db.insert(signalNotifications).values(slice).onConflictDoNothing();
    }
  }

  // 2. Parallel dispatch of push messages
  if (pushTasks.length > 0) {
    const PUSH_CONCURRENCY = 15;
    for (let i = 0; i < pushTasks.length; i += PUSH_CONCURRENCY) {
      const batch = pushTasks.slice(i, i + PUSH_CONCURRENCY);
      await Promise.allSettled(batch.map(fn => fn()));
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

