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
 * Gets latest inflation rate from DB or fetches latest from CBE
 */
export async function getLatestInflationRate(): Promise<number> {
  try {
    const rows = await db
      .select()
      .from(macroInflationRates)
      .orderBy(desc(macroInflationRates.yearMonth))
      .limit(1);

    if (rows.length > 0 && Number(rows[0].cbeHeadlineInflation) > 0) {
      return Number(rows[0].cbeHeadlineInflation);
    }
  } catch (err) {
    console.error('[CBE DB] Error querying inflation rate:', err);
  }

  // Attempt live scrape if table empty
  const live = await scrapeLatestCbeInflation();
  if (live) {
    return live.headlineYoY;
  }

  return 14.9; // Default fallback to Jul 2026 rate
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
