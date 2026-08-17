import { NextResponse } from 'next/server';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';

export async function GET(request: Request) {
  // Validate Vercel cron secret — always required
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable is not set.');
    return new Response('Server misconfigured', { status: 500 });
  }
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    console.error('Unauthorized cron invocation attempt.');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const result = await dispatchSignalNotifications();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Cron job failed:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
