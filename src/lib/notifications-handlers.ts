import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import { signalNotifications, tickers, pushSubscriptions, devicePushTokens } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';

export async function handleNotificationsGet() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let rows = await db
      .select({
        id: signalNotifications.id,
        tickerSymbol: signalNotifications.tickerSymbol,
        strategy: signalNotifications.strategy,
        signalDate: signalNotifications.signalDate,
        signal: signalNotifications.signal,
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

    const newestSentAt = rows[0]?.sentAt ? new Date(rows[0].sentAt).getTime() : 0;
    const needsRefresh = rows.length === 0 || (Date.now() - newestSentAt > 15 * 60 * 1000);

    if (needsRefresh) {
      try {
        await dispatchSignalNotifications({ lookbackBars: 5 });

        rows = await db
          .select({
            id: signalNotifications.id,
            tickerSymbol: signalNotifications.tickerSymbol,
            strategy: signalNotifications.strategy,
            signalDate: signalNotifications.signalDate,
            signal: signalNotifications.signal,
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
      } catch (syncErr) {
        console.error('Error during notifications lazy sync:', syncErr);
      }
    }

    return NextResponse.json({ notifications: rows });
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
      await db
        .delete(signalNotifications)
        .where(eq(signalNotifications.userId, user.id));
    }

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
    title: '🟢 [PSI V2] COMI Buy Opportunity',
    body: 'Commercial International Bank triggered a BUY signal at 139.50 EGP (Target: 152.00, Stop: 134.00)',
    url: '/invest?ticker=COMI.CA&view=chart',
    tag: `test-notification-${Date.now()}`,
    symbol: 'COMI.CA',
    signal: 'BUY',
    price: '139.50',
  };

  const payload = JSON.stringify(payloadData);
  let sent = 0;
  let failed = 0;

  // 1. Web Push Subscriptions
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@quantegx.com';

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

    const fcmServerKey = process.env.FCM_SERVER_KEY;
    for (const dev of deviceRows) {
      if (fcmServerKey) {
        try {
          const fcmRes = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: dev.token,
              priority: 'high',
              notification: {
                title: payloadData.title,
                body: payloadData.body,
                sound: 'default',
                android_channel_id: 'trading_signals',
              },
              data: {
                url: payloadData.url,
                ticker: payloadData.symbol,
                signal: payloadData.signal,
              },
            }),
          });
          if (fcmRes.ok) sent++;
          else failed++;
        } catch {
          failed++;
        }
      } else {
        sent++;
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
