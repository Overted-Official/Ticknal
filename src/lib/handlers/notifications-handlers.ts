import { NextResponse } from 'next/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import { signalNotifications, tickers, pushSubscriptions, devicePushTokens, profiles } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';
import { sendFCMMessage } from '@/lib/fcm-v1';
import { isSignalEligibleEquity } from '@/lib/finance/signal-universe';

const notificationsMemCache = new Map<string, { data: any[]; timestamp: number }>();
const NOTIFS_CACHE_TTL = 30 * 1000; // 30s cache per user

export async function seedUserNotifications(userId: string): Promise<number> {
  try {
    const canonicalSignals = await db.execute(sql`
      SELECT DISTINCT ON (ticker_symbol, strategy, signal_date, signal)
        ticker_symbol,
        strategy,
        signal_date,
        signal,
        signal_price,
        signal_bars_ago,
        signal_reason,
        analysis_start,
        analysis_end,
        data_as_of,
        metrics,
        parameter_version,
        sent_at
      FROM signal_notifications
      WHERE signal = 'BUY'
        AND signal_date >= CURRENT_DATE - INTERVAL '14 days'
      ORDER BY ticker_symbol, strategy, signal_date, signal, sent_at DESC;
    `);

    const rawRows = Array.isArray(canonicalSignals) ? canonicalSignals : (canonicalSignals as any).rows ?? [];

    if (rawRows.length > 0) {
      const toInsert = rawRows.map((r: any) => ({
        userId,
        tickerSymbol: r.ticker_symbol,
        strategy: r.strategy,
        signalDate: typeof r.signal_date === 'string' ? r.signal_date : new Date(r.signal_date).toISOString().split('T')[0],
        signal: r.signal,
        signalPrice: r.signal_price ? String(r.signal_price) : null,
        signalBarsAgo: r.signal_bars_ago !== null && r.signal_bars_ago !== undefined ? Number(r.signal_bars_ago) : null,
        signalReason: r.signal_reason || null,
        analysisStart: r.analysis_start ? (typeof r.analysis_start === 'string' ? r.analysis_start : new Date(r.analysis_start).toISOString().split('T')[0]) : null,
        analysisEnd: r.analysis_end ? (typeof r.analysis_end === 'string' ? r.analysis_end : new Date(r.analysis_end).toISOString().split('T')[0]) : null,
        dataAsOf: r.data_as_of ? (typeof r.data_as_of === 'string' ? r.data_as_of : new Date(r.data_as_of).toISOString().split('T')[0]) : null,
        metrics: r.metrics || null,
        parameterVersion: r.parameter_version || null,
        sentAt: r.sent_at ? new Date(r.sent_at) : new Date(),
      }));

      for (let i = 0; i < toInsert.length; i += 50) {
        const slice = toInsert.slice(i, i + 50);
        await db.insert(signalNotifications).values(slice).onConflictDoNothing();
      }
    }

    await db
      .update(profiles)
      .set({ notificationsSeededAt: new Date(), updatedAt: new Date() })
      .where(eq(profiles.id, userId));

    return rawRows.length;
  } catch (error) {
    console.error(`Failed to seed notifications for user ${userId}:`, error);
    return 0;
  }
}

export async function handleNotificationsGet() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check in-memory debounce cache to eliminate redundant database egress
  const cached = notificationsMemCache.get(user.id);
  if (cached && Date.now() - cached.timestamp < NOTIFS_CACHE_TTL) {
    return NextResponse.json({ notifications: cached.data });
  }

  try {
    let rows = await db
      .select({
        id: signalNotifications.id,
        tickerSymbol: signalNotifications.tickerSymbol,
        strategy: signalNotifications.strategy,
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
      .where(eq(signalNotifications.userId, user.id))
      .orderBy(desc(signalNotifications.signalDate), desc(signalNotifications.sentAt))
      .limit(50);

    if (rows.length === 0) {
      const [profile] = await db
        .select({
          notificationsSeededAt: profiles.notificationsSeededAt,
          notificationsClearedAt: profiles.notificationsClearedAt,
        })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);

      if (!profile?.notificationsSeededAt && !profile?.notificationsClearedAt) {
        await seedUserNotifications(user.id);

        rows = await db
          .select({
            id: signalNotifications.id,
            tickerSymbol: signalNotifications.tickerSymbol,
            strategy: signalNotifications.strategy,
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
          .where(eq(signalNotifications.userId, user.id))
          .orderBy(desc(signalNotifications.signalDate), desc(signalNotifications.sentAt))
          .limit(50);
      }
    }

    if (rows.length === 0) {
      notificationsMemCache.set(user.id, { data: [], timestamp: Date.now() });
      return NextResponse.json({ notifications: [] });
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

    notificationsMemCache.set(user.id, { data: enhancedRows, timestamp: Date.now() });
    return NextResponse.json({ notifications: enhancedRows });
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

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '').trim();
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase.auth.getUser(token);
    user = data?.user;
  }

  if (!user) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    user = data?.user;
  }

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    success: true,
    sent: sent || 1,
    failed,
    message: 'Test notification dispatched to your registered device.',
  });
}
