import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { userStrategySettings, tickers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ scope: 'all' });
  }

  try {
    // Find if user has a preference setting stored
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const scope = body.scope ?? 'all';

    // Get an existing ticker symbol to satisfy foreign key constraint if needed
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
