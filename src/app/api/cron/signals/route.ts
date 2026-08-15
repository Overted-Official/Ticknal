import { NextResponse } from 'next/server';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';

export async function GET(request: Request) {
  // Validate Vercel cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
