import { NextResponse } from 'next/server';
import { db } from '@/db';
import { systemLogs } from '@/db/schema';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';
import { verifyCronAuth } from '@/lib/cron-auth';

export async function GET(req: Request) {
  const authErr = verifyCronAuth(req);
  if (authErr) return NextResponse.json({ error: authErr.error }, { status: authErr.status });

  try {
    const notificationResult = await dispatchSignalNotifications({ lookbackBars: 1 });
    
    await db.insert(systemLogs).values({
      source: 'cron-signals',
      level: 'INFO',
      message: 'Successfully processed and dispatched trade signals.',
      metadata: { notificationResult }
    });

    return NextResponse.json({ message: 'Signals processed successfully', notificationResult }, { status: 200 });
  } catch (error) {
    console.error('Error dispatching signal notifications:', error);
    await db.insert(systemLogs).values({
      source: 'cron-signals',
      level: 'ERROR',
      message: 'Failed to process and dispatch trade signals',
      metadata: { error: (error as Error).message }
    });
    return NextResponse.json({ error: 'Internal Server Error', details: (error as Error).message }, { status: 500 });
  }
}
