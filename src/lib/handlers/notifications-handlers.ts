import { NextResponse } from 'next/server';
import { and, desc, eq, notInArray } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import { signalNotifications, tickers, pushSubscriptions, devicePushTokens, profiles, userStrategies } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';
import { sendFCMMessage } from '@/lib/fcm-v1';
import { isSignalEligibleEquity } from '@/lib/finance/signal-universe';
import { getCurrentProprietaryAccess, getProprietaryAccessForUser } from '@/lib/server/proprietary-strategy-access';
import { filterAccessibleSignals } from '@/lib/strategies/proprietary-access-policy';
import { PROPRIETARY_STRATEGY_IDS } from '@/lib/strategies/proprietary-access-policy';

const notificationsMemCache = new Map<string, { data: any[]; timestamp: number; canView: boolean }>();
const NOTIFS_CACHE_TTL = 30 * 1000; // 30s cache per user

export async function handleNotificationsGet() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await getCurrentProprietaryAccess();

  // Check in-memory debounce cache to eliminate redundant database egress
  const cached = notificationsMemCache.get(user.id);
  if (cached && cached.canView === access.canView && Date.now() - cached.timestamp < NOTIFS_CACHE_TTL) {
    return NextResponse.json({ notifications: filterAccessibleSignals(cached.data, access.canView) }, { headers: { 'Cache-Control': 'private, no-store' } });
  }

  try {
    let rows = await db
      .select({
        id: signalNotifications.id,
        tickerSymbol: signalNotifications.tickerSymbol,
        strategy: signalNotifications.strategy,
        strategyName: userStrategies.name,
        signalDate: signalNotifications.signalDate,
        signal: signalNotifications.signal,
        signalBarsAgo: signalNotifications.signalBarsAgo,
        dataAsOf: signalNotifications.dataAsOf,
        sentAt: signalNotifications.sentAt,
        companyName: tickers.companyName,
        logoUrl: tickers.logoUrl,
        sector: tickers.sector,
      })
      .from(signalNotifications)
      .leftJoin(tickers, eq(signalNotifications.tickerSymbol, tickers.symbol))
      .leftJoin(userStrategies, and(eq(signalNotifications.userId, userStrategies.userId), eq(signalNotifications.strategy, userStrategies.id)))
      .where(access.canView
        ? eq(signalNotifications.userId, user.id)
        : and(eq(signalNotifications.userId, user.id), notInArray(signalNotifications.strategy, [...PROPRIETARY_STRATEGY_IDS])))
      .orderBy(desc(signalNotifications.signalDate), desc(signalNotifications.sentAt))
      .limit(50);

    if (rows.length === 0) {
      notificationsMemCache.set(user.id, { data: [], timestamp: Date.now(), canView: access.canView });
      return NextResponse.json({ notifications: [] }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    const { getCachedIndustryRotationMap } = await import('@/lib/industry-rotation');
    const { tickerMap } = await getCachedIndustryRotationMap().catch(() => ({ tickerMap: new Map() }));

    const enhancedRows = rows.filter((r) => isSignalEligibleEquity(r.tickerSymbol, r)).map((r) => {
      const cleanSym = r.tickerSymbol.replace('.CA', '').toUpperCase();
      const meta = tickerMap.get(cleanSym) || tickerMap.get(r.tickerSymbol);
      return {
        ...r,
        industryGroup: meta?.industryGroup ?? r.sector ?? 'Unclassified',
        rotationRegime: meta?.rotationRegime ?? 'Leading',
      };
    });

    notificationsMemCache.set(user.id, { data: enhancedRows, timestamp: Date.now(), canView: access.canView });
    return NextResponse.json({ notifications: filterAccessibleSignals(enhancedRows, access.canView) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleNotificationsDelete(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      await db
        .delete(signalNotifications)
        .where(and(eq(signalNotifications.userId, user.id), eq(signalNotifications.id, Number(id))));
    } else {
      await Promise.all([
        db.delete(signalNotifications).where(eq(signalNotifications.userId, user.id)),
        db.update(profiles).set({ notificationsClearedAt: new Date(), updatedAt: new Date() }).where(eq(profiles.id, user.id)),
      ]);
    }

    notificationsMemCache.delete(user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleCheckNotifications(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbols = searchParams
    .get('symbols')
    ?.split(',')
    .map((symbol) => symbol.trim())
    .filter(Boolean);
  const lookbackBars = Number(searchParams.get('lookbackBars') ?? 1);

  try {
    const result = await dispatchSignalNotifications({
      symbols,
      lookbackBars: Number.isFinite(lookbackBars) ? lookbackBars : 1,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error checking notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleTestNotification(req?: Request) {
  let user: any = null;
  const authHeader = req?.headers.get('authorization');

  if (authHeader) {
    if (!authHeader.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = authHeader.replace('Bearer ', '').trim();
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.auth.getUser(token);
    user = data?.user;
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  } else {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [profile] = await db.select({ role: profiles.role })
    .from(profiles).where(eq(profiles.id, user.id)).limit(1);
  const access = await getProprietaryAccessForUser(user.id, user.email ?? null, profile?.role ?? null);
  if (!access.canView) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payloadData = {
    title: '(BUY) Commercial International Bank',
    body: 'COMI · α +16.4% · MAE 4.2% · Return/MAE 150%',
    url: '/charts?ticker=COMI.CA&strategy=psi_v2',
    tag: `signal-test-${Date.now()}`,
    symbol: 'COMI.CA',
    signal: 'BUY',
    price: '139.50',
    strategy: 'psi_v2',
    companyName: 'Commercial International Bank',
    logoUrl: 'https://kshqrzzohabbsjipkunh.supabase.co/storage/v1/object/public/ticker-logos/COMI.png',
    alpha: '+16.4%',
    adverseExcursion: '4.2%',
    returnToMae: '150%',
    color: '#00C896',
  };

  const payload = JSON.stringify(payloadData);
  let sent = 0;
  let failed = 0;

  // 1. Web Push Subscriptions
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:overted.technologies@gmail.com';

  if (vapidPublicKey && vapidPrivateKey) {
    try {
      webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
      const userSubscriptions = await db
        .select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.userId, user.id));

      for (const sub of userSubscriptions) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload
          );
          sent++;
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410 || statusCode === 403) {
            await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, sub.endpoint));
          }
          failed++;
        }
      }
    } catch (e) {
      console.warn('Web push dispatch error:', e);
    }
  }

  // 2. Android Device FCM Tokens
  try {
    const deviceRows = await db
      .select()
      .from(devicePushTokens)
      .where(eq(devicePushTokens.userId, user.id));

    for (const dev of deviceRows) {
      const fcmResult = await sendFCMMessage(dev.token, {
        title: payloadData.title,
        body: payloadData.body,
        url: payloadData.url,
        ticker: payloadData.symbol,
        strategy: payloadData.strategy,
        signal: payloadData.signal,
        companyName: payloadData.companyName,
        logoUrl: payloadData.logoUrl,
        alpha: payloadData.alpha,
        adverseExcursion: payloadData.adverseExcursion,
        returnToMae: payloadData.returnToMae,
        color: payloadData.color,
      });
      if (fcmResult.sent) {
        sent++;
      } else if (fcmResult.invalidToken) {
        await db
          .update(devicePushTokens)
          .set({ isActive: false, updatedAt: new Date() })
          .where(eq(devicePushTokens.id, dev.id));
      } else {
        // If not sent because neither Firebase SA nor FCM Key configured
        console.info(`FCM message skipped for device ${dev.id}: No Firebase credentials or token expired.`);
      }
    }
  } catch (e) {
    console.warn('Device push dispatch error:', e);
  }

  return NextResponse.json({
    success: sent > 0,
    sent,
    failed,
    message: sent > 0 ? 'Test notification dispatched to your registered device.' : 'No test notification could be delivered.',
  });
}
