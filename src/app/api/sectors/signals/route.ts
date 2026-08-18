import { NextResponse } from 'next/server';
import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { normalizeTickerSymbol, runPsiStrategy, type PriceBar } from '@/strategies/PSI/psiStrategy';
import { resolvePsiParamsFromStore } from '@/strategies/PSI/psiParameterStore';

export const dynamic = 'force-dynamic';

// In-memory cache for ultra-fast response (<1ms) and 0 egress
let memSignalsCache: { data: any; timestamp: number } | null = null;
let inFlightSignalsPromise: Promise<any> | null = null;
const SIGNALS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export interface TickerStrategySignalState {
  status: 'BUY_FRESH' | 'LONG_ACTIVE' | 'EXIT_RECENT' | 'FLAT';
  lastSignalDate?: string;
  lastSignalType?: string;
  tradeReturnPct?: number;
  entryPrice?: number;
  currentPrice?: number;
}

export interface SectorStrategySignalsResponse {
  summary: {
    totalFreshBuys: number;
    totalActiveLongs: number;
    totalRecentExits: number;
    totalScanned: number;
    lastScanTime: string;
  };
  signalsByTicker: Record<string, TickerStrategySignalState>;
  sectorSummary: Record<
    string,
    {
      freshBuysCount: number;
      activeLongsCount: number;
      recentExitsCount: number;
      totalStocks: number;
    }
  >;
}

export async function GET(request: Request) {
  try {
    const now = Date.now();
    if (memSignalsCache && now - memSignalsCache.timestamp < SIGNALS_CACHE_TTL) {
      return NextResponse.json(memSignalsCache.data);
    }

    if (inFlightSignalsPromise) {
      const data = await inFlightSignalsPromise;
      return NextResponse.json(data);
    }

    inFlightSignalsPromise = (async () => {
      const [tickerRows, priceRows] = await Promise.all([
        db.select().from(tickers),
        db.execute(sql`
          WITH ranked_prices AS (
            SELECT ticker_symbol, date, open, high, low, close, volume,
                   ROW_NUMBER() OVER(PARTITION BY ticker_symbol ORDER BY date DESC) AS rn
            FROM ${dailyPrices}
            WHERE volume > 0
          )
          SELECT ticker_symbol, date, open, high, low, close, volume
          FROM ranked_prices
          WHERE rn <= 300
          ORDER BY ticker_symbol, date ASC
        `),
      ]);

      const tickerMap = new Map(
        tickerRows.map((t) => [
          normalizeTickerSymbol(t.symbol),
          {
            companyName: t.companyName ?? t.symbol,
            sector: t.sector ?? 'Unclassified',
            logoUrl: t.logoUrl ?? null,
          },
        ]),
      );

      const barsByTicker = new Map<string, PriceBar[]>();
      for (const row of priceRows as any[]) {
        const symbol = normalizeTickerSymbol(String(row.ticker_symbol));
        const bars = barsByTicker.get(symbol) ?? [];
        bars.push({
          date: typeof row.date === 'string' ? row.date.split('T')[0] : new Date(row.date as Date).toISOString().split('T')[0],
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume),
        });
        barsByTicker.set(symbol, bars);
      }

      const signalsByTicker: Record<string, TickerStrategySignalState> = {};
      const sectorSummary: Record<string, { freshBuysCount: number; activeLongsCount: number; recentExitsCount: number; totalStocks: number }> = {};

      let totalFreshBuys = 0;
      let totalActiveLongs = 0;
      let totalRecentExits = 0;
      let totalScanned = 0;

      for (const [symbol, bars] of barsByTicker.entries()) {
        if (bars.length < 220) continue;

        const meta = tickerMap.get(symbol);
        const isIndexOrMacro = meta?.sector === 'Indices' || meta?.sector === 'Macro' || ['EGX30', 'EGX70', 'EGX100', 'USDEGP'].includes(symbol);
        const isFund = ['CI_QUANT', 'OSOUL', 'COF'].includes(symbol) || meta?.sector === 'Funds';
        if (isIndexOrMacro || isFund) continue;

        const sectorName = meta?.sector || 'Other';
        if (!sectorSummary[sectorName]) {
          sectorSummary[sectorName] = { freshBuysCount: 0, activeLongsCount: 0, recentExitsCount: 0, totalStocks: 0 };
        }
        sectorSummary[sectorName].totalStocks++;
        totalScanned++;

        const strategyResult = runPsiStrategy(bars, resolvePsiParamsFromStore(symbol, { startDate: bars[0].date }));
        const signals = strategyResult.signals;
        const lastBar = bars[bars.length - 1];
        const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;

        let status: 'BUY_FRESH' | 'LONG_ACTIVE' | 'EXIT_RECENT' | 'FLAT' = 'FLAT';
        let tradeReturnPct = 0;
        let entryPrice = 0;

        if (lastSignal) {
          const isRecent = (new Date(lastBar.date).getTime() - new Date(lastSignal.date).getTime()) <= (5 * 24 * 3600 * 1000);

          if (lastSignal.signal === 'BUY') {
            entryPrice = lastSignal.price;
            tradeReturnPct = lastSignal.price > 0 ? ((lastBar.close - lastSignal.price) / lastSignal.price) * 100 : 0;
            
            if (lastSignal.date === lastBar.date) {
              status = 'BUY_FRESH';
              totalFreshBuys++;
              sectorSummary[sectorName].freshBuysCount++;
            } else {
              status = 'LONG_ACTIVE';
              totalActiveLongs++;
              sectorSummary[sectorName].activeLongsCount++;
            }
          } else if (isRecent) {
            status = 'EXIT_RECENT';
            totalRecentExits++;
            sectorSummary[sectorName].recentExitsCount++;
          }
        }

        signalsByTicker[symbol] = {
          status,
          lastSignalDate: lastSignal?.date,
          lastSignalType: lastSignal?.signal,
          tradeReturnPct,
          entryPrice,
          currentPrice: lastBar.close,
        };
      }

      const payload: SectorStrategySignalsResponse = {
        summary: {
          totalFreshBuys,
          totalActiveLongs,
          totalRecentExits,
          totalScanned,
          lastScanTime: new Date().toISOString(),
        },
        signalsByTicker,
        sectorSummary,
      };

      memSignalsCache = { data: payload, timestamp: Date.now() };
      return payload;
    })();

    const result = await inFlightSignalsPromise;
    inFlightSignalsPromise = null;
    return NextResponse.json(result);
  } catch (error) {
    inFlightSignalsPromise = null;
    console.error('Error computing sector strategy signals:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
