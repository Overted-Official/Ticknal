import webPush from 'web-push';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { orders, pushSubscriptions, signalNotifications, tickerAlerts } from '@/db/schema';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';
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

  if (!result.configured) {
    result.messages.push('Web Push is not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.');
    return result;
  }

  configureWebPush();

  const symbolFilter = new Set((options.symbols ?? []).map(normalizeTickerSymbol));
  
  // 1. Get explicit alerts from users who tapped the bell icon
  const explicitAlertRows = (await db.select().from(tickerAlerts).where(eq(tickerAlerts.enabled, true))).filter((alert) =>
    symbolFilter.size === 0 ? true : symbolFilter.has(alert.tickerSymbol),
  );

  // 2. Automatically include any ticker that currently has an open position
  const openOrderRows = await db.select({ tickerSymbol: orders.tickerSymbol }).from(orders).where(eq(orders.status, 'OPEN'));
  const openOrderTickers = new Set(
    openOrderRows
      .map(row => row.tickerSymbol)
      .filter(ticker => symbolFilter.size === 0 ? true : symbolFilter.has(ticker))
  );

  const subscriptionRows = await db.select().from(pushSubscriptions);
  const subscriptionsByDevice = groupBy(subscriptionRows, (subscription) => subscription.deviceId);
  const allDeviceIds = Object.keys(subscriptionsByDevice);

  // Merge explicit alerts and pseudo-alerts (for open positions) across all known devices
  const alertRows: { deviceId: string; tickerSymbol: string }[] = [...explicitAlertRows];
  
  for (const ticker of openOrderTickers) {
    for (const deviceId of allDeviceIds) {
      // Avoid duplicate alert rows if the device already explicitly enabled it
      if (!alertRows.some(a => a.deviceId === deviceId && a.tickerSymbol === ticker)) {
        alertRows.push({ deviceId, tickerSymbol: ticker });
      }
    }
  }

  const symbolSet = new Set(alertRows.map((alert) => alert.tickerSymbol));

  if (symbolSet.size === 0) {
    result.messages.push('No enabled ticker alerts matched the requested symbols.');
    return result;
  }

  const alertsByTicker = groupBy(alertRows, (alert) => alert.tickerSymbol);
  const lookbackBars = Math.max(1, options.lookbackBars ?? 1);

  for (const ticker of symbolSet) {
    result.checkedSymbols += 1;
    const bars = await getDailyPriceBars(ticker);
    if (bars.length === 0) {
      result.skipped += 1;
      continue;
    }

    const signal = getLatestSignalInLookback(ticker, bars, lookbackBars);
    if (!signal) {
      result.skipped += 1;
      continue;
    }

    const openOrderExists = await hasOpenOrder(ticker);
    const payload = JSON.stringify({
      title: buildNotificationTitle(ticker, signal, openOrderExists),
      body: buildNotificationBody(signal),
      url: `/charts?ticker=${ticker}&timeframe=D`,
      tag: `psi-${ticker}-${signal.date}-${signal.signal}`,
      symbol: ticker,
      signal: signal.signal,
      price: signal.price,
    });

    for (const alert of alertsByTicker[ticker] ?? []) {
      const alreadySent = await hasNotificationBeenSent(alert.deviceId, ticker, signal);
      if (alreadySent) {
        result.skipped += 1;
        continue;
      }

      const subscriptions = subscriptionsByDevice[alert.deviceId] ?? [];
      if (subscriptions.length === 0) {
        result.skipped += 1;
        continue;
      }

      let sentToDevice = false;
      for (const subscription of subscriptions) {
        const sent = await sendToSubscription(subscription, payload);
        if (sent === 'expired') {
          result.expiredSubscriptions += 1;
          await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, subscription.endpoint));
        } else if (sent === 'sent') {
          sentToDevice = true;
        }
      }

      if (sentToDevice) {
        result.sent += 1;
        await db
          .insert(signalNotifications)
          .values({
            deviceId: alert.deviceId,
            tickerSymbol: ticker,
            signalDate: signal.date,
            signal: signal.signal,
          })
          .onConflictDoNothing();
      } else {
        result.skipped += 1;
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

  webPush.setVapidDetails(
    process.env.WEB_PUSH_SUBJECT ?? 'mailto:alerts@quantegx.local',
    publicKey,
    privateKey,
  );
}

function getLatestSignalInLookback(
  ticker: string,
  bars: Awaited<ReturnType<typeof getDailyPriceBars>>,
  lookbackBars: number,
): PsiSignal | null {
  const dateWindow = new Set(bars.slice(-lookbackBars).map((bar) => bar.date));
  const result = runPsiStrategy(bars, resolvePsiParamsFromStore(ticker));
  return [...result.signals].reverse().find((signal) => dateWindow.has(signal.date)) ?? null;
}

async function hasOpenOrder(ticker: string): Promise<boolean> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.tickerSymbol, ticker), eq(orders.status, 'OPEN')))
    .limit(1);
  return rows.length > 0;
}

async function hasNotificationBeenSent(deviceId: string, ticker: string, signal: PsiSignal): Promise<boolean> {
  const rows = await db
    .select({ id: signalNotifications.id })
    .from(signalNotifications)
    .where(
      and(
        eq(signalNotifications.deviceId, deviceId),
        eq(signalNotifications.tickerSymbol, ticker),
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
    if (statusCode === 404 || statusCode === 410) return 'expired';
    console.error('Failed to send Web Push notification:', error);
    return 'failed';
  }
}

function buildNotificationTitle(ticker: string, signal: PsiSignal, openOrderExists: boolean): string {
  if (signal.signal === 'BUY') return `${ticker} has a buy opportunity`;
  if (openOrderExists) return `Sell the open ${ticker} position`;
  return `${ticker} has an exit signal`;
}

function buildNotificationBody(signal: PsiSignal): string {
  const price = `${Number(signal.price).toFixed(2)} EGP`;
  if (signal.signal === 'BUY') return `PSI buy signal at ${price}.`;
  return `PSI ${signal.signal.replace('SELL_', '').toLowerCase()} exit at ${price}.`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}
