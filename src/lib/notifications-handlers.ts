import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import webpush from 'web-push';
import { db } from '@/db';
import { signalNotifications, tickers, pushSubscriptions } from '@/db/schema';
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
      .orderBy(desc(signalNotifications.sentAt))
      .limit(50);

    if (rows.length === 0) {
      try {
        await dispatchSignalNotifications({ lookbackBars: 5 });

        rows = await db
          .select({
            id: signalNotifications.id,
            tickerSymbol: signalNotifications.tickerSymbol,
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
          .orderBy(desc(signalNotifications.sentAt))
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

export async function handleTestNotification() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:admin@quantegx.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: 'Web Push is not configured' }, { status: 503 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  const userSubscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, user.id));

  if (userSubscriptions.length === 0) {
    return NextResponse.json({ message: 'No active push subscriptions found for your account' });
  }

  const payload = JSON.stringify({
    title: 'Test Notification',
    body: 'This is a test push notification from QuantEGX.',
    url: '/dashboard',
    tag: `test-notification-${Date.now()}`,
    symbol: 'TEST',
    signal: 'TEST',
    price: '0.00',
  });

  let sent = 0;
  let failed = 0;

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

  return NextResponse.json({ success: true, sent, failed });
}
