import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';
import { getVapidPublicKey, isPushConfigured } from '@/lib/pushNotifications';

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function handleSubscribeGet() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await db
      .select({
        id: pushSubscriptions.id,
        endpoint: pushSubscriptions.endpoint,
        userAgent: pushSubscriptions.userAgent,
        createdAt: pushSubscriptions.createdAt,
        updatedAt: pushSubscriptions.updatedAt,
      })
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, user.id));

    return NextResponse.json({ devices: rows });
  } catch (error) {
    console.error('Error fetching push subscriptions:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleSubscribePost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const subscription = body.subscription as BrowserPushSubscription | undefined;

    if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
      return NextResponse.json({ error: 'A valid browser push subscription is required' }, { status: 400 });
    }

    const [savedSubscription] = await db
      .insert(pushSubscriptions)
      .values({
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          userId: user.id,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      subscription: {
        id: savedSubscription.id,
        userId: savedSubscription.userId,
      },
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleSubscribeDelete(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const endpoint = searchParams.get('endpoint');

    if (id) {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.id, Number(id))));
      return NextResponse.json({ ok: true });
    }

    if (endpoint) {
      await db
        .delete(pushSubscriptions)
        .where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)));
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'id or endpoint is required' }, { status: 400 });
  } catch (error) {
    console.error('Error deleting push subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function handleVapidKeyGet() {
  return NextResponse.json({
    publicKey: getVapidPublicKey(),
    configured: isPushConfigured(),
  });
}
