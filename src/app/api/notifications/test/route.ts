import { NextResponse } from 'next/server';
import { dispatchTestNotification } from '@/lib/pushNotifications';

export async function POST(request: Request) {
  try {
    const result = await dispatchTestNotification();
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error dispatching test notification:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
