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

/**
 * Scrapes all 4 official EGX investor flow segments (TOTAL, STOCKS, BONDS, BILLS)
 * directly from https://www.egx.com.eg/en/InvestorsTypeCharts.aspx using Playwright.
 */
export async function fetchOfficialEgxMultiSegmentFlows(): Promise<OfficialEgxSegmentRow[] | null> {
  let browser: any = null;
  try {
    const pw = await import('playwright').catch(() => null);
    if (!pw || !pw.chromium) {
      return null;
    }

    browser = await pw.chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      locale: 'en-US',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    const page = await context.newPage();

    // 1. Pass F5 BigIP JS challenge on homepage
    await page.goto('https://www.egx.com.eg/en/homepage.aspx', {
      waitUntil: 'commit',
      timeout: 25000,
    });
    await page.waitForTimeout(3000);

    // 2. Navigate to InvestorsTypeCharts.aspx
    await page.goto('https://www.egx.com.eg/en/InvestorsTypeCharts.aspx', {
      waitUntil: 'commit',
      timeout: 25000,
    });
    await page.waitForSelector('input[name="option"]', { timeout: 20000 });
    await page.waitForTimeout(1500);

    const extractTables = async (): Promise<Array<{ rows: string[][] }>> => {
      return page.evaluate(() => {
        const tables = Array.from(document.querySelectorAll('table'));
        const clean: Array<{ rows: string[][] }> = [];
        for (const t of tables) {
          if (t.querySelector('table')) continue;
          const rows = Array.from(t.querySelectorAll('tr')).map((tr) =>
            Array.from(tr.querySelectorAll('th, td')).map((td) => (td as HTMLElement).innerText.trim())
          );
          if (rows.length === 4 && rows[0]?.some((c) => /Sell Value/i.test(c))) {
            clean.push({ rows });
          }
        }
        return clean;
      });
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
        await page.waitForTimeout(2200);
        await page.waitForSelector('table', { timeout: 10000 }).catch(() => null);
      }

      const tables = await extractTables();
      const built = buildOfficialSegmentRow(opt.segment, tables);
      if (built) {
        results.push(built);
      }
    }

    if (results.length === 0) return null;
    return results;
  } catch (err) {
    console.warn('Official EGX Playwright multi-segment scrape warning:', err);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => null);
    }
  }
}
