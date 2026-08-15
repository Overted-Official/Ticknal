import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
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
