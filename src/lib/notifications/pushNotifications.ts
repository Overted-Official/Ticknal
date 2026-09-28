import webPush from 'web-push';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { positions, pushSubscriptions, signalNotifications, tickerAlerts, devicePushTokens } from '@/db/schema';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { sendFCMMessage } from '@/lib/fcm-v1';
import {
  analyzeTickerChampion,
  type SignalEvent,
  type StrategyId,
  type StrategyMetrics,
  type TickerChampionAnalysis,
} from '@/lib/strategy-analysis';
import { getOrInitPrecomputedCache } from '@/lib/handlers/sectors-handlers';
import { getLatestBarDate, isSignalEligibleEquity } from '@/lib/finance/signal-universe';

type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
type DispatchStrategyId = Extract<StrategyId, 'psi' | 'psi_v2' | 'hydra'>;
type NotificationSignal = Pick<SignalEvent, 'barsAgo' | 'date' | 'price' | 'reason' | 'signal'>;

type SignalNotificationPresentation = {
  title: string;
  body: string;
  color: string;
  companyName: string;
  logoUrl?: string;
  alpha: string;
  adverseExcursion: string;
  returnToMae: string;
};

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

  // Load precomputed bars and indicators cache
  const cache = await getOrInitPrecomputedCache();
  const barsByTicker = cache.barsByTicker;
  const latestEquitySession = Array.from(barsByTicker.entries()).reduce<string | null>(
    (latest, [ticker, bars]) => {
      if (!isSignalEligibleEquity(ticker, cache.tickerMap.get(ticker))) return latest;
      const latestBarDate = getLatestBarDate(bars);
      return latestBarDate && (!latest || latestBarDate > latest) ? latestBarDate : latest;
    },
    null,
  );

  if (!latestEquitySession) {
    result.messages.push('No eligible equity market session found for notification dispatch.');
    return result;
  }

  const newNotificationsToInsert: Array<{
    userId: string;
    tickerSymbol: string;
    strategy: string;
    signalDate: string;
    signal: string;
  }> = [];

  const signalSnapshotsToUpsert: Array<{
    userId: string;
    tickerSymbol: string;
    strategy: string;
    signalDate: string;
    signal: string;
    signalPrice: string;
    signalBarsAgo: number;
    signalReason: string | null;
    analysisStart: string;
    analysisEnd: string;
    dataAsOf: string;
    metrics: StrategyMetrics;
    parameterVersion: string;
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

    const subscriptions = subscriptionsByUser[userId] ?? [];
    const nativeTokens = deviceTokensByUser[userId] ?? [];

    for (const [ticker, bars] of barsByTicker.entries()) {
      if (symbolFilter.size > 0 && !symbolFilter.has(ticker)) continue;
      if (!isSignalEligibleEquity(ticker, cache.tickerMap.get(ticker))) continue;
      if (!bars || bars.length < 80) continue;
      if (getLatestBarDate(bars) !== latestEquitySession) {
        result.skipped += 1;
        continue;
      }
      result.checkedSymbols += 1;

      const isPositionOpen = userOpenSymbols.has(ticker);
      const isAlerted = userAlertedSymbols.has(ticker);
      const isTracked = isPositionOpen || isAlerted;

      const signalsToDispatch: Array<{
        strategyId: DispatchStrategyId;
        signal: NotificationSignal;
        metrics: StrategyMetrics;
        parameterVersion: string;
        analysisStart: string;
        analysisEnd: string;
        dataAsOf: string;
      }> = [];

      const strategies: Array<{ id: DispatchStrategyId }> = [
        { id: 'psi' },
        { id: 'psi_v2' },
        { id: 'hydra' },
      ];

      // The same highest-alpha calculation is used for notification routing
      // and the chart's default strategy. Never determine the winner from a
      // strategy-specific signal snapshot.
      let champion: TickerChampionAnalysis;
      try {
        champion = await analyzeTickerChampion(ticker, bars, {
          startDate: '2025-01-01',
          timeframe: 'D',
          lookbackBars,
        });
      } catch {
        result.skipped += 1;
        continue;
      }
      const analysesByStrategy = new Map(
        champion.analyses.map((analysis) => [analysis.strategyId, analysis]),
      );
      for (const strategy of strategies) {
        if (strategy.id !== champion.strategyId) continue;

        try {
          // The champion resolver already ran the canonical chart analysis for
          // every active model. Reusing it keeps the signal date and alpha
          // ranking identical across both surfaces.
          const analysis = analysesByStrategy.get(strategy.id);
          if (!analysis) continue;
          const signal = analysis.latestActionableSignal;
          if (signal?.barsAgo === 0 && signal.date === latestEquitySession) {
            // If tracked (held or alerted), dispatch both BUY and SELL. If untracked, dispatch BUY opportunities.
            if (signal.signal === 'BUY' || isTracked) {
              signalsToDispatch.push({
                strategyId: strategy.id,
                signal,
                metrics: analysis.metrics,
                parameterVersion: analysis.parameterVersion,
                analysisStart: analysis.analysisStart,
                analysisEnd: analysis.analysisEnd,
                dataAsOf: analysis.dataAsOf,
              });
            }
          }
        } catch (e) {}
      }

      // Notifications always use the same positive highest-alpha model that
      // the chart opens by default.
      const eligibleSignals = champion.hasPositiveAlpha
        ? signalsToDispatch.filter((item) => item.strategyId === champion.strategyId)
        : [];

      if (eligibleSignals.length === 0) {
        result.skipped += 1;
        continue;
      }

      for (const item of eligibleSignals) {
        const {
          strategyId,
          signal,
          metrics,
          parameterVersion,
          analysisStart,
          analysisEnd,
          dataAsOf,
        } = item;
        // Refresh the canonical snapshot even when this notification was
        // already delivered. The opportunities endpoint can then read the
        // latest metrics without re-running the strategy during a request.
        signalSnapshotsToUpsert.push({
          userId,
          tickerSymbol: ticker,
          strategy: strategyId,
          signalDate: signal.date,
          signal: signal.signal,
          signalPrice: String(signal.price),
          signalBarsAgo: signal.barsAgo,
          signalReason: signal.reason || null,
          analysisStart,
          analysisEnd,
          dataAsOf,
          metrics,
          parameterVersion,
        });

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

        const presentation = buildSignalNotificationPresentation({
          ticker,
          signal,
          companyName: cache.tickerMap.get(ticker)?.companyName,
          logoUrl: cache.tickerMap.get(ticker)?.logoUrl,
          alpha: champion.alpha,
          metrics,
        });

        // Queue push deliveries
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            ...presentation,
            url: `/charts?ticker=${ticker}&strategy=${strategyId}`,
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
              const fcmResult = await sendFCMMessage(device.token, {
                ...presentation,
                url: `/charts?ticker=${ticker}&strategy=${strategyId}`,
                ticker,
                strategy: strategyId,
                signal: signal.signal,
              });
              if (fcmResult.sent) {
                result.sent += 1;
              } else if (fcmResult.invalidToken) {
                await db
                  .update(devicePushTokens)
                  .set({ isActive: false, updatedAt: new Date() })
                  .where(eq(devicePushTokens.id, device.id));
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

  // Migration 0007 adds the snapshot columns. Keep this processor compatible
  // while that migration is being applied: notifications still deliver and
  // the opportunities reader falls back to canonical request-time analysis.
  if (signalSnapshotsToUpsert.length > 0) {
    try {
      for (let i = 0; i < signalSnapshotsToUpsert.length; i += 50) {
        const slice = signalSnapshotsToUpsert.slice(i, i + 50);
        await db.insert(signalNotifications).values(slice).onConflictDoUpdate({
          target: [
            signalNotifications.userId,
            signalNotifications.tickerSymbol,
            signalNotifications.strategy,
            signalNotifications.signalDate,
            signalNotifications.signal,
          ],
          set: {
            signalPrice: sql`excluded.signal_price`,
            signalBarsAgo: sql`excluded.signal_bars_ago`,
            signalReason: sql`excluded.signal_reason`,
            analysisStart: sql`excluded.analysis_start`,
            analysisEnd: sql`excluded.analysis_end`,
            dataAsOf: sql`excluded.data_as_of`,
            metrics: sql`excluded.metrics`,
            parameterVersion: sql`excluded.parameter_version`,
          },
        });
      }
    } catch (error) {
      console.warn('Signal analysis snapshot persistence skipped; migration 0007 may be pending.', error);
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
    url: '/home',
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
    : 'mailto:overted.technologies@gmail.com';

  webPush.setVapidDetails(
    subject,
    publicKey,
    privateKey,
  );
}



async function hasNotificationBeenSent(userId: string, ticker: string, strategy: string, signal: NotificationSignal): Promise<boolean> {
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

function buildSignalNotificationPresentation({
  ticker,
  signal,
  companyName,
  logoUrl,
  alpha,
  metrics,
}: {
  ticker: string;
  signal: NotificationSignal;
  companyName?: string | null;
  logoUrl?: string | null;
  alpha: number;
  metrics: StrategyMetrics;
}): SignalNotificationPresentation {
  const symbol = ticker.replace('.CA', '').toUpperCase();
  const action = signal.signal === 'BUY' ? 'BUY' : 'SELL';
  const safeLogoUrl = logoUrl?.startsWith('https://') ? logoUrl : undefined;
  const adverseExcursion = Math.abs(
    metrics.avgAdverseExcursion ?? metrics.maxAdverseExcursion ?? 0,
  );
  const averageReturn = metrics.avgReturnPerTrade;
  const formattedAlpha = formatSignedPercentage(alpha);
  const formattedMae = `${adverseExcursion.toFixed(1)}%`;
  const hasReturnToMae =
    typeof averageReturn === 'number' &&
    Number.isFinite(averageReturn) &&
    adverseExcursion > 0;
  const formattedReturnToMae = hasReturnToMae
    ? `${((averageReturn / adverseExcursion) * 100).toFixed(0)}%`
    : '—';

  return {
    title: `(${action}) ${companyName || symbol}`,
    body: `${symbol} · α ${formattedAlpha} · MAE ${formattedMae} · Return/MAE ${formattedReturnToMae}`,
    color: signal.signal === 'BUY' ? '#00C896' : '#FF4055',
    companyName: companyName || symbol,
    logoUrl: safeLogoUrl,
    alpha: formattedAlpha,
    adverseExcursion: formattedMae,
    returnToMae: formattedReturnToMae,
  };
}

function formatSignedPercentage(value: number): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${safeValue >= 0 ? '+' : ''}${safeValue.toFixed(1)}%`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}

