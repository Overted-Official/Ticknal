import { db } from '@/db';
import { macroInflationRates } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';

export type CbeInflationRecord = {
  yearMonth: string;
  headlineYoY: number;
  coreYoY: number;
  headlineMoM?: number;
  coreMoM?: number;
  regulatedYoY?: number;
  fruitsVegYoY?: number;
  notes?: string | null;
};

const CBE_INFLATION_URL = 'https://www.cbe.org.eg/en/economic-research/statistics/inflation-rates';
const BLS_CPI_URL = 'https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0';

/**
 * Parses month string like "Jul 2026" to "2026-07"
 */
function parseMonthYear(text: string): string | null {
  const months: Record<string, string> = {
    jan: '01',
    feb: '02',
    mar: '03',
    apr: '04',
    may: '05',
    jun: '06',
    jul: '07',
    aug: '08',
    sep: '09',
    oct: '10',
    nov: '11',
    dec: '12',
  };

  const match = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
  if (!match) return null;

  const mKey = match[1].toLowerCase().slice(0, 3);
  const monthNum = months[mKey];
  const year = match[2];

  return monthNum ? `${year}-${monthNum}` : null;
}

/**
 * Scrapes the latest official inflation rates from Central Bank of Egypt (CBE)
 */
export async function scrapeLatestCbeInflation(): Promise<CbeInflationRecord | null> {
  try {
    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
    };

    const res = await fetch(CBE_INFLATION_URL, {
      headers,
      next: { revalidate: 86400 }, // Cache for 24h
    });

    if (!res.ok) {
      console.warn(`[CBE Scraper] HTTP ${res.status}: ${res.statusText}`);
      return null;
    }

    const html = await res.text();

    // 1. Extract Month Year (e.g. "Inflation for Last Month: Jul 2026")
    const monthMatch = html.match(/Inflation for Last Month:\s*([A-Za-z]+\s+\d{4})/i);
    const monthText = monthMatch ? monthMatch[1] : '';
    const yearMonth = parseMonthYear(monthText) || new Date().toISOString().slice(0, 7);

    // 2. Extract Table Cells
    const cellMatches = Array.from(html.matchAll(/<td[^>]*class="[^"]*table-cell[^"]*"[^>]*>([\s\S]*?)<\/td>/gi));
    const values = cellMatches.map((m) => m[1].replace(/[% \n\r\t]/g, '').trim());

    if (values.length >= 8) {
      const headlineMoM = parseFloat(values[0]);
      const coreMoM = parseFloat(values[1]);
      const headlineYoY = parseFloat(values[2]);
      const coreYoY = parseFloat(values[3]);
      const regulatedMoM = parseFloat(values[4]);
      const fruitsVegMoM = parseFloat(values[5]);
      const regulatedYoY = parseFloat(values[6]);
      const fruitsVegYoY = parseFloat(values[7]);

      if (!isNaN(headlineYoY) && headlineYoY > 0) {
        return {
          yearMonth,
          headlineYoY,
          coreYoY: !isNaN(coreYoY) ? coreYoY : headlineYoY,
          headlineMoM: !isNaN(headlineMoM) ? headlineMoM : undefined,
          coreMoM: !isNaN(coreMoM) ? coreMoM : undefined,
          regulatedYoY: !isNaN(regulatedYoY) ? regulatedYoY : undefined,
          fruitsVegYoY: !isNaN(fruitsVegYoY) ? fruitsVegYoY : undefined,
          notes: `Live synced from CBE for ${monthText}. Regulated: ${regulatedYoY}%, Fruits & Veg: ${fruitsVegYoY}%`,
        };
      }
    }
  } catch (err) {
    console.error('[CBE Scraper] Error scraping CBE inflation rate:', err);
  }

  return null;
}

/**
 * Fetches US CPI series directly from the U.S. Bureau of Labor Statistics (BLS) Public API
 * and calculates Year-over-Year (YoY) inflation rates for each month.
 */
export async function fetchLatestUsCpiSeries(): Promise<Map<string, number>> {
  const yoyMap = new Map<string, number>();
  try {
    const res = await fetch(BLS_CPI_URL, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Ticknal/1.0',
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.warn(`[BLS API] HTTP ${res.status}: ${res.statusText}`);
      return yoyMap;
    }

    const json = await res.json();
    const data = json.Results?.series?.[0]?.data || [];

    const cpiIndexMap = new Map<string, number>();
    for (const item of data) {
      if (item.period?.startsWith('M') && item.period !== 'M13') {
        const monthNum = item.period.slice(1).padStart(2, '0');
        const ym = `${item.year}-${monthNum}`;
        const val = parseFloat(item.value);
        if (!isNaN(val) && val > 0) {
          cpiIndexMap.set(ym, val);
        }
      }
    }

    for (const [ym, val] of cpiIndexMap.entries()) {
      const [yStr, mStr] = ym.split('-');
      const prevYear = parseInt(yStr, 10) - 1;
      const prevYm = `${prevYear}-${mStr}`;
      const prevVal = cpiIndexMap.get(prevYm);
      if (prevVal && prevVal > 0) {
        const yoy = ((val - prevVal) / prevVal) * 100;
        if (!isNaN(yoy)) {
          yoyMap.set(ym, parseFloat(yoy.toFixed(2)));
        }
      }
    }
  } catch (err) {
    console.error('[BLS API] Error fetching US CPI from BLS:', err);
  }

  return yoyMap;
}

/**
 * Full Sync: updates both CBE Egypt inflation and US CPI in macro_inflation_rates
 */
export async function syncAllMacroInflation(): Promise<{ cbeSynced: boolean; usCpiSynced: boolean }> {
  let cbeSynced = false;
  let usCpiSynced = false;

  try {
    const [cbeData, usCpiMap] = await Promise.all([
      scrapeLatestCbeInflation(),
      fetchLatestUsCpiSeries(),
    ]);

    if (cbeData) {
      await db
        .insert(macroInflationRates)
        .values({
          yearMonth: cbeData.yearMonth,
          cbeHeadlineInflation: String(cbeData.headlineYoY),
          cbeCoreInflation: String(cbeData.coreYoY),
          notes: cbeData.notes,
        })
        .onConflictDoUpdate({
          target: macroInflationRates.yearMonth,
          set: {
            cbeHeadlineInflation: String(cbeData.headlineYoY),
            cbeCoreInflation: String(cbeData.coreYoY),
            notes: cbeData.notes,
            updatedAt: sql`now()`,
          },
        });
      cbeSynced = true;
    }

    if (usCpiMap.size > 0) {
      for (const [ym, rate] of usCpiMap.entries()) {
        await db
          .insert(macroInflationRates)
          .values({
            yearMonth: ym,
            cbeHeadlineInflation: null,
            usCpiInflation: String(rate),
          })
          .onConflictDoUpdate({
            target: macroInflationRates.yearMonth,
            set: {
              usCpiInflation: String(rate),
              updatedAt: sql`now()`,
            },
          });
      }
      usCpiSynced = true;
    }
  } catch (err) {
    console.error('[Macro Sync] Error syncing inflation rates:', err);
  }

  return { cbeSynced, usCpiSynced };
}

/**
 * Gets latest inflation rates (both CBE and US CPI)
 */
export async function getLatestInflationRate(): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(macroInflationRates)
      .where(sql`${macroInflationRates.cbeHeadlineInflation} IS NOT NULL AND ${macroInflationRates.cbeHeadlineInflation} > 0`)
      .orderBy(desc(macroInflationRates.yearMonth))
      .limit(1);

    if (rows.length > 0 && Number(rows[0].cbeHeadlineInflation) > 0) {
      return Number(rows[0].cbeHeadlineInflation);
    }
  } catch (err) {
    console.error('[CBE DB] Error querying inflation rate:', err);
  }

  const live = await scrapeLatestCbeInflation();
  if (live) {
    return live.headlineYoY;
  }

  return 14.9; // Fallback
}

/**
 * Gets latest US CPI rate from DB or BLS API
 */
export async function getLatestUsCpiRate(): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(macroInflationRates)
      .where(sql`${macroInflationRates.usCpiInflation} IS NOT NULL`)
      .orderBy(desc(macroInflationRates.yearMonth))
      .limit(1);

    if (rows.length > 0 && Number(rows[0].usCpiInflation) > 0) {
      return Number(rows[0].usCpiInflation);
    }
  } catch (err) {
    console.error('[BLS DB] Error querying US CPI rate:', err);
  }

  return 2.8; // Fallback standard US CPI rate
}

/**
 * Retrieves full historical series from DB
 */
export async function getHistoricalInflationSeries() {
  try {
    return await db
      .select()
      .from(macroInflationRates)
      .orderBy(desc(macroInflationRates.yearMonth));
  } catch (err) {
    console.error('[CBE DB] Error querying historical inflation series:', err);
    return [];
  }
}
