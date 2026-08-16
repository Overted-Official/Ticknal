import { NextResponse } from 'next/server';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { signalNotifications, tickers } from '@/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await db
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

    return NextResponse.json({ notifications: rows });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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
      // Clear all notifications for this user
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
