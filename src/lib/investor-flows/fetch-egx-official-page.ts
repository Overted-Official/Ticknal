export interface OfficialEgxSegmentRow {
  marketSegment: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
  totalTurnover: string;
  retailSharePct: string;
  instSharePct: string;
  egyptianBuy: string;
  egyptianSell: string;
  egyptianNet: string;
  arabBuy: string;
  arabSell: string;
  arabNet: string;
  foreignBuy: string;
  foreignSell: string;
  foreignNet: string;
  egyptianRetailBuy: string;
  egyptianRetailSell: string;
  egyptianRetailNet: string;
  arabRetailBuy: string;
  arabRetailSell: string;
  arabRetailNet: string;
  foreignRetailBuy: string;
  foreignRetailSell: string;
  foreignRetailNet: string;
  egyptianInstBuy: string;
  egyptianInstSell: string;
  egyptianInstNet: string;
  arabInstBuy: string;
  arabInstSell: string;
  arabInstNet: string;
  foreignInstBuy: string;
  foreignInstSell: string;
  foreignInstNet: string;
}

function parseNum(raw: string | undefined): number {
  if (!raw) return 0;
  const cleaned = raw.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

interface ParsedThreeRowTable {
  egSell: number;
  egBuy: number;
  egNet: number;
  arSell: number;
  arBuy: number;
  arNet: number;
  frSell: number;
  frBuy: number;
  frNet: number;
}

function parseNationalityTable(rows: string[][]): ParsedThreeRowTable | null {
  if (!rows || rows.length < 4) return null;
  let egSell = 0, egBuy = 0, egNet = 0;
  let arSell = 0, arBuy = 0, arNet = 0;
  let frSell = 0, frBuy = 0, frNet = 0;
  let foundEg = false, foundAr = false, foundFr = false;

  for (const r of rows) {
    if (r.length < 4) continue;
    const label = (r[0] || '').toLowerCase();
    const sell = parseNum(r[1]);
    const buy = parseNum(r[2]);
    const net = parseNum(r[3]);

    if (label.includes('egypt') || label.includes('مصري')) {
      egSell = sell;
      egBuy = buy;
      egNet = buy - sell; // Enforce exact Buy - Sell identity to avoid 1 EGP rounding drift
      if (Math.abs(egNet - net) > 5000) egNet = net;
      foundEg = true;
    } else if (label.includes('non-arab') || label.includes('foreign') || label.includes('أجانب') || label.includes('اجانب')) {
      frSell = sell;
      frBuy = buy;
      frNet = buy - sell;
      if (Math.abs(frNet - net) > 5000) frNet = net;
      foundFr = true;
    } else if (label.includes('arab') || label.includes('عرب')) {
      arSell = sell;
      arBuy = buy;
      arNet = buy - sell;
      if (Math.abs(arNet - net) > 5000) arNet = net;
      foundAr = true;
    }
  }

  if (!foundEg || !foundAr || !foundFr) return null;
  return { egSell, egBuy, egNet, arSell, arBuy, arNet, frSell, frBuy, frNet };
}

export function buildOfficialSegmentRow(
  segment: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS',
  tables: Array<{ rows: string[][] }>
): OfficialEgxSegmentRow | null {
  if (!tables || tables.length < 3) return null;

  const overall = parseNationalityTable(tables[0].rows);
  const retail = parseNationalityTable(tables[1].rows);
  const inst = parseNationalityTable(tables[2].rows);

  if (!overall || !retail || !inst) return null;

  const totalBuy = overall.egBuy + overall.arBuy + overall.frBuy;
  const totalSell = overall.egSell + overall.arSell + overall.frSell;
  const totalTurnover = Math.round((totalBuy + totalSell) / 2);

  // Zero-sum check across nationalities
  const netSum = overall.egNet + overall.arNet + overall.frNet;
  if (Math.abs(netSum) > 100000) {
    return null;
  }

  const retailVolume =
    retail.egBuy + retail.arBuy + retail.frBuy + retail.egSell + retail.arSell + retail.frSell;
  const instVolume =
    inst.egBuy + inst.arBuy + inst.frBuy + inst.egSell + inst.arSell + inst.frSell;
  const combinedVolume = retailVolume + instVolume;

  let retailShare = 0;
  let instShare = 0;
  if (combinedVolume > 0) {
    retailShare = Math.round((retailVolume / combinedVolume) * 10000) / 100;
    instShare = Math.round((100 - retailShare) * 100) / 100;
  }

  // Ensure exact zero-sum to the single EGP by adjusting Egyptian net/buy by any 1-EGP rounding residual
  const exactEgNet = -(overall.arNet + overall.frNet);
  const exactEgBuy = overall.egSell + exactEgNet;

  return {
    marketSegment: segment,
    totalTurnover: totalTurnover.toFixed(2),
    retailSharePct: retailShare.toFixed(2),
    instSharePct: instShare.toFixed(2),
    egyptianBuy: exactEgBuy.toFixed(2),
    egyptianSell: overall.egSell.toFixed(2),
    egyptianNet: exactEgNet.toFixed(2),
    arabBuy: overall.arBuy.toFixed(2),
    arabSell: overall.arSell.toFixed(2),
    arabNet: overall.arNet.toFixed(2),
    foreignBuy: overall.frBuy.toFixed(2),
    foreignSell: overall.frSell.toFixed(2),
    foreignNet: overall.frNet.toFixed(2),
    egyptianRetailBuy: retail.egBuy.toFixed(2),
    egyptianRetailSell: retail.egSell.toFixed(2),
    egyptianRetailNet: retail.egNet.toFixed(2),
    arabRetailBuy: retail.arBuy.toFixed(2),
    arabRetailSell: retail.arSell.toFixed(2),
    arabRetailNet: retail.arNet.toFixed(2),
    foreignRetailBuy: retail.frBuy.toFixed(2),
    foreignRetailSell: retail.frSell.toFixed(2),
    foreignRetailNet: retail.frNet.toFixed(2),
    egyptianInstBuy: inst.egBuy.toFixed(2),
    egyptianInstSell: inst.egSell.toFixed(2),
    egyptianInstNet: inst.egNet.toFixed(2),
    arabInstBuy: inst.arBuy.toFixed(2),
    arabInstSell: inst.arSell.toFixed(2),
    arabInstNet: inst.arNet.toFixed(2),
    foreignInstBuy: inst.frBuy.toFixed(2),
    foreignInstSell: inst.frSell.toFixed(2),
    foreignInstNet: inst.frNet.toFixed(2),
  };
}

async function waitForRealPage(page: any, label: string, maxAttempts = 20): Promise<boolean> {
  for (let i = 1; i <= maxAttempts; i++) {
    await page.waitForTimeout(1500);
    try {
      const textLen = await page.evaluate('document.body ? document.body.innerText.length : 0');
      if (textLen > 600) {
        return true;
      }
    } catch {}
  }
  return false;
}

/** Human-readable reason for the most recent scrape failure (surfaced in system_logs by the sync job). */
let lastScrapeFailure: string | null = null;
export function getLastEgxScrapeFailure(): string | null {
  return lastScrapeFailure;
}

/**
 * Scrapes all 4 official EGX investor flow segments (TOTAL, STOCKS, BONDS, BILLS)
 * directly from https://www.egx.com.eg/en/InvestorsTypeCharts.aspx using Playwright with stealth parameters.
 */
export async function fetchOfficialEgxMultiSegmentFlows(): Promise<OfficialEgxSegmentRow[] | null> {
  let browser: any = null;
  lastScrapeFailure = null;
  try {
    const pw = await import('playwright').catch(() => null);
    if (!pw || !pw.chromium) {
      lastScrapeFailure = 'playwright module/chromium unavailable';
      return null;
    }

    browser = await pw.chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled', '--no-sandbox', '--disable-setuid-sandbox'],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    const page = await context.newPage();

    // 1. Pass F5 BigIP JS challenge on homepage first to establish session cookies
    await page.goto('https://www.egx.com.eg/en/homepage.aspx', {
      waitUntil: 'commit',
      timeout: 30000,
    });
    const homeLoaded = await waitForRealPage(page, 'Home');
    if (!homeLoaded) {
      console.warn('EGX homepage challenge did not resolve in time.');
      lastScrapeFailure = 'EGX homepage F5 challenge did not resolve (possible datacenter IP block)';
      return null;
    }

    // 2. Navigate to InvestorsTypeCharts.aspx with session cookies active
    await page.goto('https://www.egx.com.eg/en/InvestorsTypeCharts.aspx', {
      waitUntil: 'commit',
      timeout: 30000,
    });
    const pageLoaded = await waitForRealPage(page, 'InvestorsTypeCharts');
    if (!pageLoaded) {
      console.warn('EGX InvestorsTypeCharts did not load in time.');
      lastScrapeFailure = 'EGX InvestorsTypeCharts page did not load in time';
      return null;
    }

    // IMPORTANT: this is a plain string on purpose. Passing a TS function to page.evaluate() gets transpiled by
    // tsx/esbuild (keepNames injects `__name(...)` calls) and then throws "ReferenceError: __name is not defined"
    // inside the browser. A string expression is evaluated verbatim and is immune to any transpiler.
    const EXTRACT_TABLES_SCRIPT = `(() => {
      var grid = function (id) {
        var div = document.getElementById(id);
        if (!div) return null;
        var table = div.querySelector('table');
        if (!table) return null;
        var rows = Array.prototype.slice.call(table.querySelectorAll('tr')).map(function (tr) {
          return Array.prototype.slice.call(tr.querySelectorAll('th, td')).map(function (td) { return td.innerText.trim(); });
        });
        return rows.length >= 4 ? rows : null;
      };
      var all = grid('AllGrd');
      var ind = grid('IndividualsGrd');
      var inst = grid('InstitutesGrd');
      if (all && ind && inst) return [{ rows: all }, { rows: ind }, { rows: inst }];

      var clean = [];
      Array.prototype.slice.call(document.querySelectorAll('table')).forEach(function (t) {
        if (t.querySelector('table')) return;
        var rows = Array.prototype.slice.call(t.querySelectorAll('tr')).map(function (tr) {
          return Array.prototype.slice.call(tr.querySelectorAll('th, td')).map(function (td) { return td.innerText.trim(); });
        });
        if (rows.length === 4 && rows[0] && rows[0].some(function (c) { return /Sell Value/i.test(c); })) {
          clean.push({ rows: rows });
        }
      });
      return clean;
    })()`;

    const extractTables = async (): Promise<Array<{ rows: string[][] }>> => {
      return (await page.evaluate(EXTRACT_TABLES_SCRIPT)) as Array<{ rows: string[][] }>;
    };

    const optionMap: Array<{ val: string; segment: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS' }> = [
      { val: '1', segment: 'TOTAL' },
      { val: '2', segment: 'STOCKS' },
      { val: '3', segment: 'BONDS' },
      { val: '4', segment: 'BILLS' },
    ];

    const results: OfficialEgxSegmentRow[] = [];

    for (const opt of optionMap) {
      if (opt.val !== '1') {
        const radio = await page.$(`input[name="option"][value="${opt.val}"]`);
        if (!radio) continue;
        await radio.click();
        await page.waitForTimeout(2500);
      }

      const tables = await extractTables();
      const built = buildOfficialSegmentRow(opt.segment, tables);
      if (built) {
        results.push(built);
      }
    }

    if (results.length === 0) {
      lastScrapeFailure = 'EGX tables loaded but no segment parsed/validated (zero-sum or layout change)';
      return null;
    }

    // Clone Protection:
    // If multiple segments have identical turnover or net figures, the radio buttons did not switch datasets.
    // In that scenario, only keep 'TOTAL' and discard any cloned segments so we NEVER poison STOCKS/BONDS/BILLS.
    const totalRow = results.find((r) => r.marketSegment === 'TOTAL');
    if (totalRow) {
      const distinctResults = results.filter((r) => {
        if (r.marketSegment === 'TOTAL') return true;
        const isCloneOfTotal =
          r.totalTurnover === totalRow.totalTurnover &&
          r.foreignNet === totalRow.foreignNet &&
          r.egyptianNet === totalRow.egyptianNet;
        if (isCloneOfTotal) {
          console.warn(
            `[EGX Scraper] Segment ${r.marketSegment} is identical to TOTAL (turnover=${r.totalTurnover}). Discarding cloned segment.`
          );
          return false;
        }
        return true;
      });
      return distinctResults;
    }

    return results;
  } catch (err) {
    console.warn('Official EGX Playwright multi-segment scrape warning:', err);
    lastScrapeFailure = `scrape exception: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}
