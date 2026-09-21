import { db } from '@/db';
import { dailyPrices, tickers } from '@/db/schema';
import { sql } from 'drizzle-orm';
import { getCachedTickers } from '@/lib/data-cache';
import { normalizeTickerSymbol } from '@/strategies/PSI/psiStrategy';
import { aggregateSectorsFromStocks, type StockPerformanceItem } from './sectors-math';

export type RotationRegime = 'Leading' | 'Improving' | 'Weakening' | 'Lagging';

export interface TickerRotationMeta {
  symbol: string;
  companyName: string;
  sector: string;
  industryGroup: string;
  rotationRegime: RotationRegime;
  returnPct: number;
  alphaVsBenchmark: number;
}

let cachedTickerRotationMap: {
  tickerMap: Map<string, TickerRotationMeta>;
  industryMap: Map<string, RotationRegime>;
  timestamp: number;
} | null = null;

let inFlightRotationPromise: Promise<{
  tickerMap: Map<string, TickerRotationMeta>;
  industryMap: Map<string, RotationRegime>;
}> | null = null;

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function getCachedIndustryRotationMap(): Promise<{
  tickerMap: Map<string, TickerRotationMeta>;
  industryMap: Map<string, RotationRegime>;
}> {
  const now = Date.now();
  if (cachedTickerRotationMap && now - cachedTickerRotationMap.timestamp < CACHE_TTL_MS) {
    return {
      tickerMap: cachedTickerRotationMap.tickerMap,
      industryMap: cachedTickerRotationMap.industryMap,
    };
  }

  if (inFlightRotationPromise) return inFlightRotationPromise;

  inFlightRotationPromise = (async () => {
    try {
      const startDate = `${new Date().getFullYear()}-01-01`;
      const endDate = new Date().toISOString().split('T')[0];

      const allTickers = await getCachedTickers();
      const metaMap = new Map(allTickers.map((t) => [normalizeTickerSymbol(t.symbol), t]));

      const aggregationQuery = sql`
        SELECT 
          ticker_symbol,
          (array_agg(close::numeric ORDER BY date ASC))[1] as start_price,
          (array_agg(close::numeric ORDER BY date DESC))[1] as end_price,
          SUM(volume::numeric) as total_volume,
          SUM((close::numeric) * (volume::numeric)) as total_turnover
        FROM ${dailyPrices}
        WHERE date >= ${startDate} AND date <= ${endDate}
        GROUP BY ticker_symbol
        HAVING (array_agg(close::numeric ORDER BY date ASC))[1] > 0
           AND (array_agg(close::numeric ORDER BY date DESC))[1] > 0;
      `;

      const rawRows = (await db.execute(aggregationQuery)) as any[];

      const stockItems: StockPerformanceItem[] = [];
      let egx30Return: number | null = null;

      for (const row of rawRows) {
        const symbol = normalizeTickerSymbol(String(row.ticker_symbol));
        const startPrice = Number(row.start_price);
        const endPrice = Number(row.end_price);
        const returnPct = startPrice > 0 ? ((endPrice - startPrice) / startPrice) * 100 : 0;
        const turnover = Number(row.total_turnover || 0);
        const volume = Number(row.total_volume || 0);

        if (symbol === 'EGX30') {
          egx30Return = returnPct;
        }

        const meta = metaMap.get(symbol);
        if (!meta) continue;

        stockItems.push({
          symbol,
          companyName: meta.companyName || symbol,
          sector: meta.sector || 'Unclassified',
          industryGroup: meta.industryGroup || meta.sector || 'Unclassified',
          industry: meta.industry || null,
          subIndustry: meta.subIndustry || null,
          logoUrl: meta.logoUrl || null,
          startPrice,
          endPrice,
          returnPct,
          volume,
          turnover,
          turnoverShare: 0,
          isAdvancing: returnPct > 0,
        });
      }

      const { sectors } = aggregateSectorsFromStocks(stockItems, 'industryGroup', egx30Return ?? 0);

      const industryMap = new Map<string, RotationRegime>();
      for (const s of sectors) {
        industryMap.set(s.sector, s.rotationRegime);
      }

      const tickerMap = new Map<string, TickerRotationMeta>();
      for (const st of stockItems) {
        const group = st.industryGroup || st.sector || 'Unclassified';
        const regime = industryMap.get(group) || 'Lagging';
        const alpha = (egx30Return !== null) ? st.returnPct - egx30Return : 0;

        tickerMap.set(st.symbol, {
          symbol: st.symbol,
          companyName: st.companyName,
          sector: st.sector,
          industryGroup: group,
          rotationRegime: regime,
          returnPct: st.returnPct,
          alphaVsBenchmark: alpha,
        });
      }

      cachedTickerRotationMap = {
        tickerMap,
        industryMap,
        timestamp: Date.now(),
      };

      return { tickerMap, industryMap };
    } finally {
      inFlightRotationPromise = null;
    }
  })();

  return inFlightRotationPromise;
}
