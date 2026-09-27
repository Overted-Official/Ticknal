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
import type { TickerChampionInfo } from '@/lib/finance/sectors-math';

type PushSubscriptionRow = typeof pushSubscriptions.$inferSelect;
type DispatchStrategyId = Extract<StrategyId, 'psi' | 'psi_v2' | 'hydra'>;
type NotificationSignal = Pick<SignalEvent, 'barsAgo' | 'date' | 'price' | 'reason' | 'signal'>;

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
  const { userStrategySettings } = await import('@/db/schema');
  const userSettingsRows = await db.select().from(userStrategySettings);
  const userSettingsMap = groupBy(userSettingsRows, (setting) => `${setting.userId}-${setting.tickerSymbol}`);

  // Load precomputed bars and indicators cache
  const cache = await getOrInitPrecomputedCache();
  const barsByTicker = cache.barsByTicker;

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

    const userGlobalScopeRow = userSettingsMap[`${userId}-GLOBAL`]?.find(s => s.strategyName === 'alert_scope');
    let userDefaultScope = 'champion';
    if (userGlobalScopeRow) {
      try {
        const parsed = JSON.parse(userGlobalScopeRow.params);
        userDefaultScope = parsed.scope || 'champion';
      } catch (e) {}
    }

    const subscriptions = subscriptionsByUser[userId] ?? [];
    const nativeTokens = deviceTokensByUser[userId] ?? [];

    for (const [ticker, bars] of barsByTicker.entries()) {
      if (symbolFilter.size > 0 && !symbolFilter.has(ticker)) continue;
      if (!bars || bars.length < 80) continue;
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

      const signalsToDispatch: Array<{
        strategyId: DispatchStrategyId;
        strategyShort: string;
        strategyLabel: string;
        signal: NotificationSignal;
        metrics: StrategyMetrics;
        parameterVersion: string;
        analysisStart: string;
        analysisEnd: string;
        dataAsOf: string;
      }> = [];

      const strategies: Array<{
        id: DispatchStrategyId;
        short: string;
        label: string;
      }> = [
        { id: 'psi', short: 'TYPHON', label: 'Typhon Strategy' },
        { id: 'psi_v2', short: 'CERBERUS', label: 'Cerberus Strategy' },
        { id: 'hydra', short: 'HYDRA', label: 'Hydra Strategy' },
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
      const championAnalysis = analysesByStrategy.get(champion.strategyId);
      const champInfo: TickerChampionInfo = {
        champion: champion.strategyId,
        championName: champion.strategyName,
        alpha: champion.alpha,
        roi: championAnalysis?.metrics.totalReturn ?? 0,
        buyHoldRoi: championAnalysis?.metrics.buyHoldReturn ?? 0,
        hasPositiveAlpha: champion.hasPositiveAlpha,
      };

      for (const strategy of strategies) {
        const isInScope = userScope === 'all'
          || userScope === 'all_raw'
          || userScope === 'raw'
          || userScope === strategy.id
          || userScope === 'champion';
        if (!isInScope) continue;

        try {
          // The champion resolver already ran the canonical chart analysis for
          // every active model. Reusing it keeps the signal date and alpha
          // ranking identical across both surfaces.
          const analysis = analysesByStrategy.get(strategy.id);
          if (!analysis) continue;
          const signal = analysis.latestActionableSignal;
          if (signal) {
            // If tracked (held or alerted), dispatch both BUY and SELL. If untracked, dispatch BUY opportunities.
            if (signal.signal === 'BUY' || isTracked) {
              signalsToDispatch.push({
                strategyId: strategy.id,
                strategyShort: strategy.short,
                strategyLabel: strategy.label,
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

      // Only permit alerts from the designated highest-alpha model. Raw scopes
      // remain available for explicit diagnostic use.
      const isRawOptOut = userScope === 'all_raw' || userScope === 'raw';
      const eligibleSignals = isRawOptOut
        ? signalsToDispatch
        : champion.hasPositiveAlpha
          ? signalsToDispatch.filter((item) => item.strategyId === champion.strategyId)
          : [];

      if (eligibleSignals.length === 0) {
        result.skipped += 1;
        continue;
      }

      for (const item of eligibleSignals) {
        const {
          strategyId,
          strategyShort,
          strategyLabel,
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

        // Queue push deliveries
        if (subscriptions.length > 0) {
          const payload = JSON.stringify({
            title: buildNotificationTitle(ticker, signal, isPositionOpen, strategyShort, champInfo),
            body: buildNotificationBody(signal, strategyLabel, champInfo),
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
              const fcmSent = await sendFCMMessage(device.token, {
                title: buildNotificationTitle(ticker, signal, isPositionOpen, strategyShort, champInfo),
                body: buildNotificationBody(signal, strategyLabel, champInfo),
                url: `/charts?ticker=${ticker}&strategy=${strategyId}`,
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

function buildNotificationTitle(
  ticker: string,
  signal: NotificationSignal,
  openOrderExists: boolean,
  strategyShort: string = 'TYPHON',
  championInfo?: TickerChampionInfo
): string {
  const cleanTicker = ticker.replace('.CA', '').toUpperCase();
  const champTag = championInfo?.hasPositiveAlpha
    ? ` · 🏆 ${championInfo.championName}`
    : ` (${strategyShort.toUpperCase()})`;
  if (signal.signal === 'BUY') return `${cleanTicker} · BUY Signal${champTag}`;
  if (openOrderExists) return `${cleanTicker} · Exit Position${champTag}`;
  return `${cleanTicker} · Exit Signal${champTag}`;
}

function buildNotificationBody(
  signal: NotificationSignal,
  strategyLabel: string = 'Typhon Strategy',
  championInfo?: TickerChampionInfo
): string {
  const price = `${Number(signal.price).toFixed(2)} EGP`;
  const reason = signal.reason;
  const alphaSnippet = championInfo?.hasPositiveAlpha
    ? ` · 🏆 Best-Fit (+${championInfo.alpha > 0 ? '+' : ''}${championInfo.alpha.toFixed(1)}% α)`
    : '';

  if (reason) {
    return `Triggered at ${price}${alphaSnippet} · ${reason}`;
  }
  if (signal.signal === 'BUY') {
    return `Triggered at ${price}${alphaSnippet} · Entry criteria confirmed (${strategyLabel})`;
  }
  return `Triggered at ${price}${alphaSnippet} · Exit rule satisfied (${strategyLabel})`;
}

function groupBy<T>(items: T[], getKey: (item: T) => string): Record<string, T[]> {
  return items.reduce<Record<string, T[]>>((groups, item) => {
    const key = getKey(item);
    groups[key] ??= [];
    groups[key].push(item);
    return groups;
  }, {});
}

