import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { tickerAlerts, userStrategySettings, tickers } from '@/db/schema';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { createClient } from '@/lib/supabase/server';

export async function handleAlertsGet() {
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

export async function handleAlertsPost(request: Request) {
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

export async function handleAlertsDelete(request: Request) {
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

export async function handlePreferencesGet() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ scope: 'all' });
  }

  try {
    const rows = await db
      .select()
      .from(userStrategySettings)
      .where(
        and(
          eq(userStrategySettings.userId, user.id),
          eq(userStrategySettings.strategyName, 'alert_scope')
        )
      )
      .limit(1);

    if (rows.length > 0) {
      try {
        const parsed = JSON.parse(rows[0].params);
        return NextResponse.json({ scope: parsed.scope || 'all' });
      } catch (e) {
        return NextResponse.json({ scope: 'all' });
      }
    }

    return NextResponse.json({ scope: 'all' });
  } catch (error) {
    console.error('Error fetching alert preferences:', error);
    return NextResponse.json({ scope: 'all' });
  }
}

export async function handlePreferencesPost(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const scope = body.scope ?? 'all';

    const firstTicker = await db.select({ symbol: tickers.symbol }).from(tickers).limit(1);
    const anchorTicker = firstTicker.length > 0 ? firstTicker[0].symbol : 'COMI';

    await db
      .insert(userStrategySettings)
      .values({
        userId: user.id,
        tickerSymbol: anchorTicker,
        strategyName: 'alert_scope',
        params: JSON.stringify({ scope, updatedAt: new Date().toISOString() }),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userStrategySettings.userId, userStrategySettings.tickerSymbol, userStrategySettings.strategyName],
        set: {
          params: JSON.stringify({ scope, updatedAt: new Date().toISOString() }),
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true, scope });
  } catch (error) {
    console.error('Error saving alert preferences:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
