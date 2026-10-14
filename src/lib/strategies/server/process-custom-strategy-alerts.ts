import { randomUUID } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db } from '../../../db';
import { compileSavedStrategy } from './compile-saved-strategy';
import { actionableCustomSignal } from './custom-strategy-alerts';
import { parseSavedStrategy, parseSelectedSymbols } from './parse-saved-strategy';
import { runSimpleBacktestForSymbol } from './run-simple-backtest-for-symbol';

const SYMBOLS_PER_BATCH = 12;
const ASSUMPTIONS = { initialCapital: 100_000, feeBps: 10 } as const;

type Claim = {
  user_id: string;
  id: string;
  definition: unknown;
  selected_symbols: unknown;
  notification_cursor: number;
  notification_generation: number;
};

function rows<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object' && 'rows' in result && Array.isArray(result.rows)) return result.rows as T[];
  return [];
}

export async function processCustomStrategyAlertBatch(): Promise<{ session: string | null; checked: number; inserted: number; error?: string }> {
  // Never alert from a future or partial intraday bar. The shared frame loader
  // separately requires final daily bars and validates the exact session.
  const dateParts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => dateParts.find((entry) => entry.type === type)?.value ?? '';
  const marketDate = `${part('year')}-${part('month')}-${part('day')}`;
  const marketHour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  if (marketHour < 15) return { session: null, checked: 0, inserted: 0 };
  const sessionRows = rows<{ session: string | null }>(await db.execute(sql`
    SELECT MAX(date)::text AS session FROM public.daily_prices
    WHERE ticker_symbol IN ('COMI', 'COMI.CA', 'EAST', 'EAST.CA', 'ETEL', 'ETEL.CA', 'FWRY', 'FWRY.CA', 'TMGH', 'TMGH.CA')
      AND date <= ${marketDate}::date
  `));
  const session = sessionRows[0]?.session ?? null;
  if (!session || session !== marketDate) return { session, checked: 0, inserted: 0 };

  const token = randomUUID();
  const claimed = rows<Claim>(await db.execute(sql`
    WITH candidate AS (
      SELECT user_id, id FROM public.user_strategies
      WHERE notifications_enabled = true
        AND (notification_lease_until IS NULL OR notification_lease_until < NOW())
        AND (notification_session IS DISTINCT FROM ${session}::date
          OR notification_cursor >= 0
          OR notification_last_scanned_at < NOW() - INTERVAL '20 minutes')
      ORDER BY notification_last_scanned_at NULLS FIRST, updated_at
      LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    UPDATE public.user_strategies AS strategy
    SET notification_lease_token = ${token},
        notification_lease_until = NOW() + INTERVAL '2 minutes',
        notification_session = ${session}::date,
        notification_cursor = CASE WHEN strategy.notification_session IS DISTINCT FROM ${session}::date OR strategy.notification_cursor < 0 THEN 0 ELSE strategy.notification_cursor END,
        notification_last_scanned_at = NOW()
    FROM candidate
    WHERE strategy.user_id = candidate.user_id AND strategy.id = candidate.id
    RETURNING strategy.user_id, strategy.id, strategy.definition, strategy.selected_symbols,
      strategy.notification_cursor, strategy.notification_generation
  `));
  const claim = claimed[0];
  if (!claim) return { session, checked: 0, inserted: 0 };

  const release = async (cursor: number, error: string | null, enabled = true) => {
    await db.execute(sql`
      UPDATE public.user_strategies
      SET notification_cursor = ${cursor}, notification_error = ${error}, notifications_enabled = ${enabled},
          notification_lease_token = NULL, notification_lease_until = NULL,
          notification_last_scanned_at = NOW()
      WHERE user_id = ${claim.user_id}::uuid AND id = ${claim.id}
        AND notification_generation = ${claim.notification_generation}
        AND notification_lease_token = ${token}
    `);
  };

  try {
    const parsed = parseSavedStrategy(claim.definition);
    const selected = parseSelectedSymbols(claim.selected_symbols);
    if (!parsed.success || !selected?.length) {
      await release(-1, 'Saved strategy or selected universe is invalid. Re-save the strategy to resume alerts.', false);
      return { session, checked: 0, inserted: 0, error: 'Invalid saved strategy.' };
    }
    const compiled = compileSavedStrategy(parsed.value);
    if (compiled.status !== 'ready') {
      await release(-1, compiled.message, false);
      return { session, checked: 0, inserted: 0, error: compiled.message };
    }
    const cursor = Math.max(0, Number(claim.notification_cursor) || 0);
    const batch = selected.slice(cursor, cursor + SYMBOLS_PER_BATCH);
    let inserted = 0;
    let next = 0;
    const failures: unknown[] = [];
    await Promise.all(Array.from({ length: Math.min(3, batch.length) }, async () => {
      while (next < batch.length) {
        const symbol = batch[next++];
        try {
          const evaluated = await runSimpleBacktestForSymbol(symbol, compiled.program, ASSUMPTIONS);
          const signal = actionableCustomSignal(evaluated, session);
          if (!signal) continue;
          // The owner can opt out or edit while this batch runs. Recheck the
          // lease/generation atomically at insertion; the unique key dedupes.
          const written = rows<{ id: number }>(await db.execute(sql`
            INSERT INTO public.signal_notifications
              (user_id, ticker_symbol, strategy, signal_date, signal, signal_price,
               signal_bars_ago, signal_reason, data_as_of, parameter_version,
               push_delivery_status, push_next_attempt_at)
            SELECT strategy.user_id, ${symbol}, strategy.id, ${session}::date, ${signal.signal},
              ${String(signal.price)}::numeric, 0, ${signal.reason}, ${session}::date,
              ${`custom:${claim.notification_generation}`}, 'pending', NOW()
            FROM public.user_strategies AS strategy
            WHERE strategy.user_id = ${claim.user_id}::uuid AND strategy.id = ${claim.id}
              AND strategy.notifications_enabled = true
              AND strategy.notification_generation = ${claim.notification_generation}
              AND strategy.notification_lease_token = ${token}
            ON CONFLICT (user_id, ticker_symbol, strategy, signal_date, signal) DO NOTHING
            RETURNING id
          `));
          inserted += written.length;
        } catch (error) { failures.push(error); }
      }
    }));
    if (failures.length) throw failures[0];
    await release(cursor + batch.length >= selected.length ? -1 : cursor + batch.length, null);
    return { session, checked: batch.length, inserted };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Custom strategy scan failed.';
    // A transient data/database failure must not skip the affected symbols.
    await release(Math.max(0, Number(claim.notification_cursor) || 0), message).catch(() => {});
    return { session, checked: 0, inserted: 0, error: message };
  }
}
