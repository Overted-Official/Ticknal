import type { NewCompanyFinancialStatement } from '@/db/schema';

export interface RawEgxScannerFundamental {
  symbol: string;
  close: number;
  marketCap: number;
  peTtm: number | null;
  pb: number | null;
  epsTtm: number | null;
  roe: number | null;
  revenueTtm: number | null;
  netIncomeTtm: number | null;
  totalAssets: number | null;
  totalDebt: number | null;
  freeCashFlowTtm: number | null;
  dividendYield: number | null;
}

const TV_SCANNER_URL = 'https://scanner.tradingview.com/egypt/scan';

const SCANNER_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

function toNullableNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}

function cleanTickerSymbol(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  return raw
    .trim()
    .toUpperCase()
    .replace(/^EGX:/, '')
    .replace(/\.CA$/, '');
}

/**
 * Normalizes a raw TradingView scanner row array into a typed RawEgxScannerFundamental.
 */
export function parseEgxScannerRow(item: any): RawEgxScannerFundamental | null {
  if (!item || typeof item !== 'object' || !Array.isArray(item.d) || item.d.length < 2) {
    return null;
  }

  const rawSymbol = item.s || item.d[0];
  const symbol = cleanTickerSymbol(rawSymbol);
  if (!symbol) return null;

  const d = item.d;
  const close = toNullableNumber(d[1]) ?? 0;
  const marketCap = toNullableNumber(d[2]) ?? 0;

  let peTtm = toNullableNumber(d[3]);
  const pb = toNullableNumber(d[4]);
  const epsTtm = toNullableNumber(d[5]);
  const roe = toNullableNumber(d[6]);
  const revenueTtm = toNullableNumber(d[7]);
  const netIncomeTtm = toNullableNumber(d[8]);
  const totalAssets = toNullableNumber(d[9]);
  const totalDebt = toNullableNumber(d[10]);
  const freeCashFlowTtm = toNullableNumber(d[11]);
  const dividendYield = toNullableNumber(d[12]);

  // Normalization Rule: If net income is negative or PE is negative, set peTtm: null
  if ((netIncomeTtm !== null && netIncomeTtm < 0) || (peTtm !== null && peTtm < 0)) {
    peTtm = null;
  }

  return {
    symbol,
    close,
    marketCap,
    peTtm,
    pb,
    epsTtm,
    roe,
    revenueTtm,
    netIncomeTtm,
    totalAssets,
    totalDebt,
    freeCashFlowTtm,
    dividendYield,
  };
}

/**
 * Fetches real-time fundamental snapshot for all EGX equities from TradingView scanner.
 */
export async function fetchEgxMarketFundamentals(): Promise<RawEgxScannerFundamental[]> {
  const payload = {
    filter: [{ left: 'type', operation: 'in_range', right: ['stock', 'dr'] }],
    options: { lang: 'en' },
    symbols: { query: { types: [] }, tickers: [] },
    columns: [
      'name',
      'close',
      'market_cap_basic',
      'price_earnings_ttm',
      'price_book_ratio',
      'earnings_per_share_basic_ttm',
      'return_on_equity',
      'total_revenue_ttm',
      'net_income_ttm',
      'total_assets',
      'total_debt',
      'free_cash_flow_ttm',
      'dividend_yield_recent',
      'currency',
    ],
    sort: { sortBy: 'market_cap_basic', sortOrder: 'desc' },
    range: [0, 350],
  };

  const res = await fetch(TV_SCANNER_URL, {
    method: 'POST',
    headers: SCANNER_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`TradingView market fundamentals scan failed: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const rawData: any[] = Array.isArray(json?.data) ? json.data : [];

  const results: RawEgxScannerFundamental[] = [];
  for (const item of rawData) {
    const parsed = parseEgxScannerRow(item);
    if (parsed) {
      results.push(parsed);
    }
  }

  return results;
}

/**
 * Normalizes Free Cash Flow from Operating Cash Flow and Capital Expenditures.
 */
export function calculateFreeCashFlow(
  operatingCashFlow: number | null | undefined,
  capitalExpenditures: number | null | undefined,
  fallbackFcf?: number | null | undefined
): number | null {
  if (operatingCashFlow != null && capitalExpenditures != null) {
    return operatingCashFlow - capitalExpenditures;
  }
  if (operatingCashFlow != null && fallbackFcf != null) {
    return fallbackFcf;
  }
  if (fallbackFcf != null) {
    return fallbackFcf;
  }
  return null;
}

/**
 * Parses raw historical array data returned by TradingView into typed annual and quarterly statements.
 */
export function normalizeHistoricalStatements(
  item: any,
  symbol: string
): {
  annual: NewCompanyFinancialStatement[];
  quarterly: NewCompanyFinancialStatement[];
} {
  const cleanSymbol = cleanTickerSymbol(symbol);
  if (!item || typeof item !== 'object' || !Array.isArray(item.d)) {
    return { annual: [], quarterly: [] };
  }

  const d = item.d;
  const currency = typeof d[1] === 'string' && d[1].trim() ? d[1].trim().toUpperCase() : 'EGP';

  const annual: NewCompanyFinancialStatement[] = [];
  const quarterly: NewCompanyFinancialStatement[] = [];

  // 1. Process Annual Series
  const fyYears: any[] = Array.isArray(d[3]) ? d[3] : [];
  for (let i = 0; i < fyYears.length; i++) {
    const year = Number(fyYears[i]);
    if (!Number.isFinite(year) || year < 1990 || year > 2100) continue;

    annual.push({
      symbol: cleanSymbol,
      periodType: 'ANNUAL',
      fiscalYear: year,
      fiscalPeriod: 'FY',
      reportDate: `${year}-12-31`,
      currency,
      totalRevenue: toNullableNumber(d[4]?.[i]),
      grossProfit: toNullableNumber(d[6]?.[i]),
      operatingIncome: null,
      netIncome: toNullableNumber(d[8]?.[i]),
      ebitda: toNullableNumber(d[10]?.[i]),
      epsBasic: toNullableNumber(d[12]?.[i]),
      epsDiluted: toNullableNumber(d[13]?.[i]),
      totalAssets: toNullableNumber(d[15]?.[i]),
      totalLiabilities: null,
      totalDebt: toNullableNumber(d[17]?.[i]),
      cashAndEquivalents: null,
      totalEquity: null,
      operatingCashFlow: null,
      capitalExpenditures: null,
      freeCashFlow: toNullableNumber(d[19]?.[i]),
    });
  }

  // 2. Process Quarterly Series
  const fqRevenues: any[] = Array.isArray(d[5]) ? d[5] : [];
  if (fqRevenues.length > 0) {
    const rawEndFq = toNullableNumber(d[2]);
    const baseTimeSec = rawEndFq && rawEndFq > 0 ? rawEndFq : Math.floor(Date.now() / 1000);
    const baseDate = new Date(baseTimeSec * 1000);
    const baseYear = baseDate.getUTCFullYear();
    const baseMonth = baseDate.getUTCMonth() + 1; // 1..12
    const baseQuarter = Math.max(1, Math.min(4, Math.ceil(baseMonth / 3)));

    const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
    const quarterEndMonths = ['-03-31', '-06-30', '-09-30', '-12-31'] as const;

    for (let i = 0; i < fqRevenues.length; i++) {
      const totalQuarters = baseYear * 4 + (baseQuarter - 1) - i;
      const year = Math.floor(totalQuarters / 4);
      const qIndex = ((totalQuarters % 4) + 4) % 4;
      const fiscalPeriod = quarterNames[qIndex];
      const reportDate = `${year}${quarterEndMonths[qIndex]}`;

      quarterly.push({
        symbol: cleanSymbol,
        periodType: 'QUARTERLY',
        fiscalYear: year,
        fiscalPeriod,
        reportDate,
        currency,
        totalRevenue: toNullableNumber(d[5]?.[i]),
        grossProfit: toNullableNumber(d[7]?.[i]),
        operatingIncome: null,
        netIncome: toNullableNumber(d[9]?.[i]),
        ebitda: toNullableNumber(d[11]?.[i]),
        epsBasic: null,
        epsDiluted: toNullableNumber(d[14]?.[i]),
        totalAssets: toNullableNumber(d[16]?.[i]),
        totalLiabilities: null,
        totalDebt: toNullableNumber(d[18]?.[i]),
        cashAndEquivalents: null,
        totalEquity: null,
        operatingCashFlow: null,
        capitalExpenditures: null,
        freeCashFlow: toNullableNumber(d[20]?.[i]),
      });
    }
  }

  return { annual, quarterly };
}

/**
 * Fetches historical annual and quarterly financial statements for an EGX symbol from TradingView.
 */
export async function fetchHistoricalStatements(symbol: string): Promise<{
  annual: NewCompanyFinancialStatement[];
  quarterly: NewCompanyFinancialStatement[];
}> {
  const cleanSymbol = cleanTickerSymbol(symbol);
  if (!cleanSymbol) {
    return { annual: [], quarterly: [] };
  }

  const payload = {
    symbols: { tickers: [`EGX:${cleanSymbol}`] },
    columns: [
      'name',
      'currency',
      'fiscal_period_end_fq',
      'fiscal_period_fy_h',
      'total_revenue_fy_h',
      'total_revenue_fq_h',
      'gross_profit_fy_h',
      'gross_profit_fq_h',
      'net_income_fy_h',
      'net_income_fq_h',
      'ebitda_fy_h',
      'ebitda_fq_h',
      'earnings_per_share_basic_fy_h',
      'earnings_per_share_diluted_fy_h',
      'earnings_per_share_diluted_fq_h',
      'total_assets_fy_h',
      'total_assets_fq_h',
      'total_debt_fy_h',
      'total_debt_fq_h',
      'free_cash_flow_fy_h',
      'free_cash_flow_fq_h',
    ],
  };

  const res = await fetch(TV_SCANNER_URL, {
    method: 'POST',
    headers: SCANNER_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`TradingView historical statement scan failed for ${cleanSymbol}: ${res.status} ${res.statusText}`);
  }

  const json = await res.json();
  const firstItem = Array.isArray(json?.data) && json.data.length > 0 ? json.data[0] : null;

  return normalizeHistoricalStatements(firstItem, cleanSymbol);
}

/**
 * Calculates Piotroski F-Score (integer 0 to 9) comparing current period to prior fiscal year.
 */
export function calculatePiotroskiFScore(
  current: NewCompanyFinancialStatement,
  prior?: NewCompanyFinancialStatement
): number {
  if (!current) return 0;
  let score = 0;

  const currentCashFlow = current.operatingCashFlow ?? current.freeCashFlow;

  // --- Category 1: Profitability (4 points) ---
  // 1. ROA > 0 (Current net income > 0)
  if (current.netIncome != null && current.netIncome > 0) {
    score++;
  }

  // 2. CFO > 0 (Positive operating/free cash flow)
  if (currentCashFlow != null && currentCashFlow > 0) {
    score++;
  }

  // 3. ΔROA > 0 (ROA higher than prior year)
  if (
    prior &&
    current.totalAssets != null &&
    prior.totalAssets != null &&
    current.totalAssets > 0 &&
    prior.totalAssets > 0
  ) {
    const currentRoa = (current.netIncome ?? 0) / current.totalAssets;
    const priorRoa = (prior.netIncome ?? 0) / prior.totalAssets;
    if (currentRoa > priorRoa) {
      score++;
    }
  }

  // 4. Accrual (Cash Flow > Net Income)
  if (currentCashFlow != null && current.netIncome != null && currentCashFlow > current.netIncome) {
    score++;
  }

  // --- Category 2: Leverage, Liquidity, Source of Funds (3 points) ---
  if (prior) {
    // 5. ΔLeverage < 0 (lower debt/assets ratio than prior year, or remained zero-debt)
    if (
      current.totalAssets != null &&
      prior.totalAssets != null &&
      current.totalAssets > 0 &&
      prior.totalAssets > 0
    ) {
      const curLev = (current.totalDebt ?? 0) / current.totalAssets;
      const priLev = (prior.totalDebt ?? 0) / prior.totalAssets;
      if (curLev < priLev || (curLev === 0 && priLev === 0)) {
        score++;
      }
    }

    // 6. Stable or improving liquidity
    const getLiquidity = (s: NewCompanyFinancialStatement): number | null => {
      if ((s as any).currentAssets != null && (s as any).currentLiabilities != null && (s as any).currentLiabilities > 0) {
        return (s as any).currentAssets / (s as any).currentLiabilities;
      }
      if ((s as any).workingCapital != null && s.totalAssets && s.totalAssets > 0) {
        return (s as any).workingCapital / s.totalAssets;
      }
      if (s.cashAndEquivalents != null && s.totalAssets && s.totalAssets > 0) {
        return s.cashAndEquivalents / s.totalAssets;
      }
      if (s.totalAssets != null && s.totalDebt != null && s.totalAssets > 0) {
        return (s.totalAssets - s.totalDebt) / s.totalAssets;
      }
      return null;
    };
    const curLiq = getLiquidity(current);
    const priLiq = getLiquidity(prior);
    if (curLiq != null && priLiq != null && curLiq >= priLiq) {
      score++;
    }

    // 7. No dilution (shares / diluted EPS stable or higher)
    const curShares = (current as any).sharesOutstanding;
    const priShares = (prior as any).sharesOutstanding;
    if (curShares != null && priShares != null && priShares > 0) {
      if (curShares <= priShares * 1.01) {
        score++;
      }
    } else if (current.epsDiluted != null && prior.epsDiluted != null) {
      if (current.epsDiluted >= prior.epsDiluted) {
        score++;
      }
    }
  }

  // --- Category 3: Operating Efficiency (2 points) ---
  if (prior) {
    // 8. ΔGross Margin > 0
    if (
      current.totalRevenue != null &&
      prior.totalRevenue != null &&
      current.totalRevenue > 0 &&
      prior.totalRevenue > 0
    ) {
      if (current.grossProfit != null && prior.grossProfit != null) {
        const curMargin = current.grossProfit / current.totalRevenue;
        const priMargin = prior.grossProfit / prior.totalRevenue;
        if (curMargin > priMargin) {
          score++;
        }
      } else if (current.operatingIncome != null && prior.operatingIncome != null) {
        const curMargin = current.operatingIncome / current.totalRevenue;
        const priMargin = prior.operatingIncome / prior.totalRevenue;
        if (curMargin > priMargin) {
          score++;
        }
      } else if (current.netIncome != null && prior.netIncome != null) {
        const curMargin = current.netIncome / current.totalRevenue;
        const priMargin = prior.netIncome / prior.totalRevenue;
        if (curMargin > priMargin) {
          score++;
        }
      }
    }

    // 9. ΔAsset Turnover > 0 (Revenue / Total Assets)
    if (
      current.totalAssets != null &&
      prior.totalAssets != null &&
      current.totalAssets > 0 &&
      prior.totalAssets > 0
    ) {
      const curTurnover = (current.totalRevenue ?? 0) / current.totalAssets;
      const priTurnover = (prior.totalRevenue ?? 0) / prior.totalAssets;
      if (curTurnover > priTurnover) {
        score++;
      }
    }
  }

  return Math.max(0, Math.min(9, score));
}

/**
 * Calculates Altman Emerging Market Z''-Score for solvency & financial distress assessment:
 * Z = 6.56 * (NWC / TA) + 3.26 * (RE / TA) + 6.72 * (EBITDA / TA) + 1.05 * (Equity / Debt)
 */
export function calculateAltmanZScore(
  statement: NewCompanyFinancialStatement,
  marketCap?: number
): number | null {
  if (!statement || !statement.totalAssets || statement.totalAssets <= 0) {
    return null;
  }

  const assets = statement.totalAssets;

  // 1. Net Working Capital / Total Assets
  let nwc = 0;
  if ((statement as any).workingCapital != null) {
    nwc = (statement as any).workingCapital;
  } else if ((statement as any).currentAssets != null && (statement as any).currentLiabilities != null) {
    nwc = (statement as any).currentAssets - (statement as any).currentLiabilities;
  } else if (statement.cashAndEquivalents != null) {
    nwc = statement.cashAndEquivalents;
  } else if (statement.totalDebt != null) {
    nwc = assets - statement.totalDebt;
  }
  const x1 = nwc / assets;

  // 2. Retained Earnings or Net Income / Total Assets
  const re = (statement as any).retainedEarnings ?? statement.netIncome ?? 0;
  const x2 = re / assets;

  // 3. EBITDA or Operating Income / Total Assets
  const ebitda = statement.ebitda ?? statement.operatingIncome ?? statement.netIncome ?? 0;
  const x3 = ebitda / assets;

  // 4. Equity or Market Cap / Total Debt
  const equity = statement.totalEquity ?? marketCap ?? 0;
  const debt = statement.totalDebt ?? statement.totalLiabilities ?? 0;
  let x4 = 0;
  if (debt > 0) {
    x4 = equity / debt;
  } else if (equity > 0) {
    x4 = 10; // Debt-free entity cap
  }

  const z = 6.56 * x1 + 3.26 * x2 + 6.72 * x3 + 1.05 * x4;
  return Number(z.toFixed(2));
}

/**
 * Calculates integrated Piotroski F-Score and Altman Z-Score from company statements and market cap.
 */
export function calculateQualityScores(
  statements: NewCompanyFinancialStatement[],
  marketCap: number,
  closingPrice: number
): { piotroskiFScore: number; altmanZScore: number | null } {
  if (!statements || statements.length === 0) {
    return { piotroskiFScore: 0, altmanZScore: null };
  }

  // Prefer annual statements ordered descending by fiscalYear
  const annual = statements
    .filter((s) => s.periodType === 'ANNUAL')
    .sort((a, b) => b.fiscalYear - a.fiscalYear);

  const targetStatements =
    annual.length > 0
      ? annual
      : [...statements].sort((a, b) => b.reportDate.localeCompare(a.reportDate));

  const current = targetStatements[0];
  const prior = targetStatements[1];

  const piotroskiFScore = calculatePiotroskiFScore(current, prior);
  const altmanZScore = calculateAltmanZScore(current, marketCap);

  return { piotroskiFScore, altmanZScore };
}
