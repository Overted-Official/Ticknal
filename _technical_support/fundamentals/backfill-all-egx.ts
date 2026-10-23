import fs from 'fs';
import path from 'path';
import { db } from '../../src/db';
import {
  companyFinancialStatements,
  companyValuationMetrics,
  tickers,
  NewCompanyFinancialStatement,
  NewCompanyValuationMetric,
} from '../../src/db/schema';
import { eq, sql } from 'drizzle-orm';
import {
  fetchEgxMarketFundamentals,
  fetchHistoricalStatements,
  calculateQualityScores,
  RawEgxScannerFundamental,
} from '../../src/lib/server/fundamentals-scraper';

interface CheckpointData {
  completed: string[];
  lastRun: string;
}

const CHECKPOINT_PATH = path.resolve(
  process.cwd(),
  '_technical_support/fundamentals/backfill-checkpoint.json'
);

function loadCheckpoint(): CheckpointData {
  try {
    if (fs.existsSync(CHECKPOINT_PATH)) {
      const raw = fs.readFileSync(CHECKPOINT_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.completed)) {
        return {
          completed: parsed.completed,
          lastRun: parsed.lastRun || new Date().toISOString(),
        };
      }
    }
  } catch (err: any) {
    console.warn(`[Checkpoint] Could not read existing checkpoint: ${err.message}. Starting fresh.`);
  }
  return { completed: [], lastRun: new Date().toISOString() };
}

function saveCheckpoint(data: CheckpointData): void {
  try {
    const dir = path.dirname(CHECKPOINT_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err: any) {
    console.error(`[Checkpoint] Failed to save checkpoint: ${err.message}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function upsertStatements(statements: NewCompanyFinancialStatement[]): Promise<void> {
  if (statements.length === 0) return;
  const BATCH_SIZE = 50;

  for (let i = 0; i < statements.length; i += BATCH_SIZE) {
    const batch = statements.slice(i, i + BATCH_SIZE);
    await db
      .insert(companyFinancialStatements)
      .values(batch)
      .onConflictDoUpdate({
        target: [
          companyFinancialStatements.symbol,
          companyFinancialStatements.periodType,
          companyFinancialStatements.fiscalYear,
          companyFinancialStatements.fiscalPeriod,
        ],
        set: {
          reportDate: sql`EXCLUDED.report_date`,
          filingDate: sql`EXCLUDED.filing_date`,
          currency: sql`EXCLUDED.currency`,
          totalRevenue: sql`EXCLUDED.total_revenue`,
          grossProfit: sql`EXCLUDED.gross_profit`,
          operatingIncome: sql`EXCLUDED.operating_income`,
          netIncome: sql`EXCLUDED.net_income`,
          ebitda: sql`EXCLUDED.ebitda`,
          epsBasic: sql`EXCLUDED.eps_basic`,
          epsDiluted: sql`EXCLUDED.eps_diluted`,
          totalAssets: sql`EXCLUDED.total_assets`,
          totalLiabilities: sql`EXCLUDED.total_liabilities`,
          totalDebt: sql`EXCLUDED.total_debt`,
          cashAndEquivalents: sql`EXCLUDED.cash_and_equivalents`,
          totalEquity: sql`EXCLUDED.total_equity`,
          operatingCashFlow: sql`EXCLUDED.operating_cash_flow`,
          capitalExpenditures: sql`EXCLUDED.capital_expenditures`,
          freeCashFlow: sql`EXCLUDED.free_cash_flow`,
          updatedAt: sql`NOW()`,
        },
      });
  }
}

async function upsertValuationSnapshot(
  symbol: string,
  todayStr: string,
  scannerFund: RawEgxScannerFundamental | undefined,
  annualStatements: NewCompanyFinancialStatement[],
  qualityScores: { piotroskiFScore: number; altmanZScore: number | null }
): Promise<void> {
  const marketCap = scannerFund?.marketCap && scannerFund.marketCap > 0 ? scannerFund.marketCap : null;
  const latestAnnual =
    annualStatements.length > 0
      ? [...annualStatements].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]
      : undefined;

  let enterpriseValue: number | null = null;
  if (marketCap !== null) {
    const debt = latestAnnual?.totalDebt ?? scannerFund?.totalDebt ?? 0;
    const cash = latestAnnual?.cashAndEquivalents ?? 0;
    enterpriseValue = marketCap + debt - cash;
  }

  let freeCashFlowYield: number | null = null;
  if (marketCap !== null && marketCap > 0) {
    if (scannerFund?.freeCashFlowTtm != null) {
      freeCashFlowYield = Number(((scannerFund.freeCashFlowTtm / marketCap) * 100).toFixed(4));
    } else if (latestAnnual?.freeCashFlow != null) {
      freeCashFlowYield = Number(((latestAnnual.freeCashFlow / marketCap) * 100).toFixed(4));
    }
  }

  const psRatioTtm =
    marketCap !== null && scannerFund?.revenueTtm && scannerFund.revenueTtm > 0
      ? Number((marketCap / scannerFund.revenueTtm).toFixed(4))
      : null;

  const evToEbitda =
    enterpriseValue !== null && latestAnnual?.ebitda && latestAnnual.ebitda > 0
      ? Number((enterpriseValue / latestAnnual.ebitda).toFixed(4))
      : null;

  const roe =
    scannerFund?.roe ??
    (latestAnnual?.totalEquity && latestAnnual.totalEquity > 0 && latestAnnual?.netIncome != null
      ? Number(((latestAnnual.netIncome / latestAnnual.totalEquity) * 100).toFixed(4))
      : null);

  const roa =
    latestAnnual?.totalAssets && latestAnnual.totalAssets > 0 && latestAnnual?.netIncome != null
      ? Number(((latestAnnual.netIncome / latestAnnual.totalAssets) * 100).toFixed(4))
      : null;

  const grossMargin =
    latestAnnual?.totalRevenue && latestAnnual.totalRevenue > 0 && latestAnnual?.grossProfit != null
      ? Number(((latestAnnual.grossProfit / latestAnnual.totalRevenue) * 100).toFixed(4))
      : null;

  const operatingMargin =
    latestAnnual?.totalRevenue && latestAnnual.totalRevenue > 0 && latestAnnual?.operatingIncome != null
      ? Number(((latestAnnual.operatingIncome / latestAnnual.totalRevenue) * 100).toFixed(4))
      : null;

  const netMargin =
    latestAnnual?.totalRevenue && latestAnnual.totalRevenue > 0 && latestAnnual?.netIncome != null
      ? Number(((latestAnnual.netIncome / latestAnnual.totalRevenue) * 100).toFixed(4))
      : null;

  const debtToEquity =
    latestAnnual?.totalEquity && latestAnnual.totalEquity > 0 && latestAnnual?.totalDebt != null
      ? Number((latestAnnual.totalDebt / latestAnnual.totalEquity).toFixed(4))
      : null;

  const metricRecord: NewCompanyValuationMetric = {
    symbol,
    date: todayStr,
    marketCap,
    enterpriseValue,
    peRatioTtm: scannerFund?.peTtm != null ? Number(scannerFund.peTtm.toFixed(4)) : null,
    forwardPe: null,
    pbRatio: scannerFund?.pb != null ? Number(scannerFund.pb.toFixed(4)) : null,
    psRatioTtm,
    evToEbitda,
    dividendYield: scannerFund?.dividendYield != null ? Number(scannerFund.dividendYield.toFixed(4)) : null,
    roe: roe != null ? Number(roe.toFixed(4)) : null,
    roa: roa != null ? Number(roa.toFixed(4)) : null,
    grossMargin,
    operatingMargin,
    netMargin,
    debtToEquity,
    currentRatio: null,
    quickRatio: null,
    freeCashFlowYield,
    piotroskiFScore: qualityScores.piotroskiFScore,
    altmanZScore: qualityScores.altmanZScore,
  };

  await db
    .insert(companyValuationMetrics)
    .values(metricRecord)
    .onConflictDoUpdate({
      target: [companyValuationMetrics.symbol, companyValuationMetrics.date],
      set: {
        marketCap: sql`EXCLUDED.market_cap`,
        enterpriseValue: sql`EXCLUDED.enterprise_value`,
        peRatioTtm: sql`EXCLUDED.pe_ratio_ttm`,
        forwardPe: sql`EXCLUDED.forward_pe`,
        pbRatio: sql`EXCLUDED.pb_ratio`,
        psRatioTtm: sql`EXCLUDED.ps_ratio_ttm`,
        evToEbitda: sql`EXCLUDED.ev_to_ebitda`,
        dividendYield: sql`EXCLUDED.dividend_yield`,
        roe: sql`EXCLUDED.roe`,
        roa: sql`EXCLUDED.roa`,
        grossMargin: sql`EXCLUDED.gross_margin`,
        operatingMargin: sql`EXCLUDED.operating_margin`,
        netMargin: sql`EXCLUDED.net_margin`,
        debtToEquity: sql`EXCLUDED.debt_to_equity`,
        currentRatio: sql`EXCLUDED.current_ratio`,
        quickRatio: sql`EXCLUDED.quick_ratio`,
        freeCashFlowYield: sql`EXCLUDED.free_cash_flow_yield`,
        piotroskiFScore: sql`EXCLUDED.piotroski_f_score`,
        altmanZScore: sql`EXCLUDED.altman_z_score`,
      },
    });
}

async function main() {
  const args = process.argv.slice(2);
  let limit: number | null = null;
  let force = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit' && args[i + 1]) {
      limit = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--force') {
      force = true;
    }
  }

  console.log('================================================================');
  console.log('EGX Historical Fundamentals & Quality Scoring Backfill Runner');
  console.log(`Flags: force=${force}, limit=${limit ?? 'None (all)'}`);
  console.log('================================================================\n');

  // 1. Fetch universe: Active DB tickers
  console.log('[Step 1/3] Fetching active tickers from database...');
  const activeDbTickers = await db
    .select({ symbol: tickers.symbol })
    .from(tickers)
    .where(eq(tickers.status, 'ACTIVE'));

  const activeSymbolsSet = new Set(activeDbTickers.map((t) => t.symbol.toUpperCase()));
  console.log(`Found ${activeDbTickers.length} active tickers in database.`);

  // 2. Fetch real-time market fundamentals snapshot from TradingView
  console.log('[Step 2/3] Fetching TradingView market fundamentals scan...');
  let scannerFunds: RawEgxScannerFundamental[] = [];
  try {
    scannerFunds = await fetchEgxMarketFundamentals();
    console.log(`TradingView scanner returned fundamentals for ${scannerFunds.length} companies.`);
  } catch (err: any) {
    console.warn(`[WARN] Market fundamentals scan failed: ${err.message}. Proceeding with historical statements only.`);
  }

  const scannerMap = new Map<string, RawEgxScannerFundamental>();
  for (const item of scannerFunds) {
    scannerMap.set(item.symbol.toUpperCase(), item);
  }

  // Prioritize universe: sort companies with marketCap descending, then remaining active tickers
  const sortedScannerSymbols = scannerFunds
    .sort((a, b) => (b.marketCap || 0) - (a.marketCap || 0))
    .map((f) => f.symbol.toUpperCase())
    .filter((sym) => activeSymbolsSet.has(sym));

  const allOrderedSymbols: string[] = [...sortedScannerSymbols];
  for (const t of activeDbTickers) {
    const sym = t.symbol.toUpperCase();
    if (!allOrderedSymbols.includes(sym)) {
      allOrderedSymbols.push(sym);
    }
  }

  // 3. Apply checkpoint filtering
  const checkpoint = loadCheckpoint();
  const completedSet = new Set(force ? [] : checkpoint.completed.map((s) => s.toUpperCase()));

  let targetsToProcess = allOrderedSymbols.filter((sym) => !completedSet.has(sym));
  if (limit !== null && limit > 0) {
    targetsToProcess = targetsToProcess.slice(0, limit);
  }

  console.log(`Total active universe: ${allOrderedSymbols.length}`);
  console.log(`Already completed: ${completedSet.size}`);
  console.log(`Queued to process in this run: ${targetsToProcess.length}\n`);

  if (targetsToProcess.length === 0) {
    console.log('All target tickers have already been backfilled. Use --force to re-run.');
    return;
  }

  // 4. Concurrency Queue (Concurrency: 4, 250ms polite pause between requests)
  const CONCURRENCY = 4;
  const POLITE_PAUSE_MS = 250;
  const todayStr = new Date().toISOString().split('T')[0];
  let processedCount = 0;
  const totalToProcess = targetsToProcess.length;

  let sharedIndex = 0;

  async function worker(workerId: number): Promise<void> {
    while (true) {
      let currentIndex: number;
      // Atomic increment
      currentIndex = sharedIndex++;
      if (currentIndex >= targetsToProcess.length) {
        break;
      }

      const symbol = targetsToProcess[currentIndex];
      const progressLabel = `[${currentIndex + 1}/${totalToProcess}]`;

      try {
        // Fetch historical annual and quarterly statements
        const { annual, quarterly } = await fetchHistoricalStatements(symbol);

        // Upsert statements if available
        const allStatements = [...annual, ...quarterly];
        if (allStatements.length > 0) {
          await upsertStatements(allStatements);
        }

        // Quality Scoring
        const scannerFund = scannerMap.get(symbol);
        const marketCap = scannerFund?.marketCap ?? 0;
        const close = scannerFund?.close ?? 0;
        const qualityScores = calculateQualityScores(annual, marketCap, close);

        // Valuation Metrics Snapshot Upsert
        await upsertValuationSnapshot(symbol, todayStr, scannerFund, annual, qualityScores);

        // Mark completed in checkpoint
        checkpoint.completed.push(symbol);
        checkpoint.lastRun = new Date().toISOString();
        saveCheckpoint(checkpoint);

        processedCount++;
        const altmanDisplay = qualityScores.altmanZScore != null ? qualityScores.altmanZScore.toFixed(2) : 'N/A';
        console.log(
          `${progressLabel} Ticker: ${symbol.padEnd(6)} | Annual: ${String(annual.length).padStart(2)} | Qtr: ${String(quarterly.length).padStart(2)} | Piotroski: ${qualityScores.piotroskiFScore} | Altman: ${altmanDisplay.padStart(5)}`
        );
      } catch (err: any) {
        console.error(`${progressLabel} [ERROR] Failed processing ${symbol}: ${err.message}`);
      }

      // Polite pause between requests
      await sleep(POLITE_PAUSE_MS);
    }
  }

  console.log(`Starting ${CONCURRENCY} concurrent workers...`);
  const workerPromises: Promise<void>[] = [];
  for (let w = 1; w <= CONCURRENCY; w++) {
    workerPromises.push(worker(w));
  }

  await Promise.all(workerPromises);

  console.log('\n================================================================');
  console.log(`Backfill finished! Processed: ${processedCount}/${totalToProcess} tickers.`);
  console.log(`Total completed in checkpoint: ${checkpoint.completed.length}`);
  console.log('================================================================\n');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error in backfill runner:', err);
    process.exit(1);
  });
