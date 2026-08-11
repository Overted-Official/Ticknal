import { NextResponse } from 'next/server';
import { db } from '@/db';
import { pushSubscriptions } from '@/db/schema';

type BrowserPushSubscription = {
  endpoint?: string;
  keys?: {
    p256dh?: string;
    auth?: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const deviceId = typeof body.deviceId === 'string' ? body.deviceId : '';
    const subscription = body.subscription as BrowserPushSubscription | undefined;

    if (!/^[a-zA-Z0-9-]{12,64}$/.test(deviceId) || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
      return NextResponse.json({ error: 'A valid deviceId and browser push subscription are required' }, { status: 400 });
    }

    const [savedSubscription] = await db
      .insert(pushSubscriptions)
      .values({
        deviceId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          deviceId,
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
        deviceId: savedSubscription.deviceId,
      },
    });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
