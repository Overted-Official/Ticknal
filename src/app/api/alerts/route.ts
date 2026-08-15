import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tickerAlerts } from '@/db/schema';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const rows = await db.select().from(tickerAlerts).where(eq(tickerAlerts.userId, user.id));
    return NextResponse.json({
      alerts: rows.map((alert) => ({
        symbol: alert.tickerSymbol,
        enabled: alert.enabled,
      })),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const symbol = normalizeTickerSymbol(String(body.symbol ?? ''));
    const enabled = body.enabled !== false;

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    const [alert] = await db
      .insert(tickerAlerts)
      .values({
        userId: user.id,
        tickerSymbol: symbol,
        enabled,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [tickerAlerts.userId, tickerAlerts.tickerSymbol],
        set: {
          enabled,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({
      alert: {
        symbol: alert.tickerSymbol,
        enabled: alert.enabled,
      },
    });
  } catch (error) {
    console.error('Error saving alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = normalizeTickerSymbol(searchParams.get('symbol') ?? '');

  if (!symbol) {
    return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
  }

  try {
    await db
      .delete(tickerAlerts)
      .where(and(eq(tickerAlerts.userId, user.id), eq(tickerAlerts.tickerSymbol, symbol)));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error deleting alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
