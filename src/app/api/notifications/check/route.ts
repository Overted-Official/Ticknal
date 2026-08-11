import { NextResponse } from 'next/server';
import { dispatchSignalNotifications } from '@/lib/pushNotifications';

export async function GET(request: Request) {
  return checkNotifications(request);
}

export async function POST(request: Request) {
  return checkNotifications(request);
}

async function checkNotifications(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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
