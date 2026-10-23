import { NextResponse } from 'next/server';
import { verifyCronAuth } from '@/lib/cron-auth';
import { db } from '@/db';
import {
  companyFinancialStatements,
  companyValuationMetrics,
  marketNews,
  tickerAlerts,
  NewCompanyFinancialStatement,
  NewCompanyValuationMetric,
} from '@/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import {
  fetchEgxMarketFundamentals,
  fetchHistoricalStatements,
  calculateQualityScores,
  RawEgxScannerFundamental,
} from '@/lib/server/fundamentals-scraper';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SyncFundamentalsResult {
  success: boolean;
  scannedTickersCount: number;
  newReportsDetected: number;
  updatedTickers: string[];
  alertsGenerated: number;
  durationMs: number;
}

function epochToDateString(epochSec: number | null | undefined): string | null {
  if (!epochSec || epochSec <= 0) return null;
  const sec = epochSec > 1e11 ? Math.floor(epochSec / 1000) : epochSec;
  const d = new Date(sec * 1000);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function formatEgpAmount(num: number | null | undefined): string {
  if (num === null || num === undefined) return 'N/A';
  if (Math.abs(num) >= 1e9) {
    return `${(num / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(num) >= 1e6) {
    return `${(num / 1e6).toFixed(2)}M`;
  }
  return num.toLocaleString();
}

export async function GET(request: Request): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Verify cron authentication
  const authError = verifyCronAuth(request);
  if (authError) {
    return NextResponse.json({ error: authError.error }, { status: authError.status });
  }

  const url = new URL(request.url);
  const forceTicker = url.searchParams.get('forceTicker')?.trim().toUpperCase();

  try {
    // Step A: Run fetchEgxMarketFundamentals() to get the current market scan
    const marketScan = await fetchEgxMarketFundamentals();
    const scannedTickersCount = marketScan.length;

    const scanMap = new Map<string, RawEgxScannerFundamental>();
    for (const item of marketScan) {
      if (item.symbol) {
        scanMap.set(item.symbol, item);
      }
    }

    // Step B: Query latest stored report dates from companyFinancialStatements grouped by symbol
    const dbLatestRecords = await db.execute(sql`
      SELECT
        symbol,
        max(report_date) as max_report_date,
        max(case when period_type = 'QUARTERLY' then report_date end) as max_quarterly_report_date,
        max(case when period_type = 'ANNUAL' then fiscal_year end) as max_annual_fiscal_year,
        max(case when period_type = 'ANNUAL' then report_date end) as max_annual_report_date
      FROM company_financial_statements
      GROUP BY symbol;
    `);

    const dbLatestMap = new Map<
      string,
      {
        maxReportDate: string | null;
        maxQuarterlyReportDate: string | null;
        maxAnnualFiscalYear: number | null;
        maxAnnualReportDate: string | null;
      }
    >();

    for (const row of dbLatestRecords as any[]) {
      if (row.symbol) {
        dbLatestMap.set(row.symbol, {
          maxReportDate: row.max_report_date ?? null,
          maxQuarterlyReportDate: row.max_quarterly_report_date ?? null,
          maxAnnualFiscalYear: row.max_annual_fiscal_year ? Number(row.max_annual_fiscal_year) : null,
          maxAnnualReportDate: row.max_annual_report_date ?? null,
        });
      }
    }

    // Step C: For each ticker, detect if newly filed statements are present (or if symbol is missing from DB)
    interface TickerToProcess {
      symbol: string;
      scannerFund?: RawEgxScannerFundamental;
      isForced: boolean;
    }

    const tickersToProcess: TickerToProcess[] = [];

    for (const item of marketScan) {
      const symbol = item.symbol;
      const existing = dbLatestMap.get(symbol);

      if (!existing) {
        // Missing from DB entirely, but scanner has fundamental data
        if (item.revenueTtm !== null || item.totalAssets !== null || item.fiscalPeriodEndFq != null) {
          tickersToProcess.push({ symbol, scannerFund: item, isForced: false });
        }
      } else {
        const scannerFqDate = epochToDateString(item.fiscalPeriodEndFq);
        const scannerFyDate = epochToDateString(item.fiscalPeriodEndFy);
        const scannerFyYear = scannerFyDate ? new Date(scannerFyDate).getUTCFullYear() : null;
        const fyMonthOffset = scannerFyDate && new Date(scannerFyDate).getUTCMonth() < 6 ? 1 : 0;

        const hasNewQuarter =
          Boolean(scannerFqDate && existing.maxQuarterlyReportDate && scannerFqDate > existing.maxQuarterlyReportDate);
        const hasNewAnnual =
          Boolean(scannerFyYear && existing.maxAnnualFiscalYear && scannerFyYear > (existing.maxAnnualFiscalYear + fyMonthOffset));

        if (hasNewQuarter || hasNewAnnual) {
          tickersToProcess.push({ symbol, scannerFund: item, isForced: false });
        }
      }
    }

    // If a forced ticker was requested, ensure it is processed
    if (forceTicker) {
      const alreadyIncluded = tickersToProcess.some((t) => t.symbol === forceTicker);
      if (!alreadyIncluded) {
        tickersToProcess.push({
          symbol: forceTicker,
          scannerFund: scanMap.get(forceTicker),
          isForced: true,
        });
      } else {
        // Mark as forced so news event emission runs
        const target = tickersToProcess.find((t) => t.symbol === forceTicker);
        if (target) target.isForced = true;
      }
    }

    const updatedTickers: string[] = [];
    let alertsGenerated = 0;
    const todayStr = new Date().toISOString().slice(0, 10);

    // Step D: Process detected tickers
    for (const { symbol, scannerFund, isForced } of tickersToProcess) {
      try {
        const { annual, quarterly } = await fetchHistoricalStatements(symbol);
        const allStatements = [...annual, ...quarterly];

        if (allStatements.length === 0) {
          continue;
        }

        // 1. Upsert statements
        await db
          .insert(companyFinancialStatements)
          .values(allStatements)
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

        // 2. Recalculate quality scores & upsert valuation metrics
        const qualityScores = calculateQualityScores(
          allStatements,
          scannerFund?.marketCap ?? 0,
          scannerFund?.close ?? 0
        );

        const marketCap = scannerFund?.marketCap && scannerFund.marketCap > 0 ? scannerFund.marketCap : null;
        const latestAnnual =
          annual.length > 0
            ? [...annual].sort((a, b) => b.fiscalYear - a.fiscalYear)[0]
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

        // 3. Emit news disclosure & process alerts for new filings (or forced invocation)
        const sortedStatements = [...allStatements].sort((a, b) => b.reportDate.localeCompare(a.reportDate));
        const latestStatement = sortedStatements[0];

        if (latestStatement) {
          const period = `${latestStatement.fiscalPeriod} ${latestStatement.fiscalYear}`;
          const cleanPeriodTag = `${latestStatement.fiscalPeriod.toLowerCase()}-${latestStatement.fiscalYear}`;
          const newsId = `earnings-${symbol.toLowerCase()}-${cleanPeriodTag}-${Date.now()}`.slice(0, 64);
          const revStr = formatEgpAmount(latestStatement.totalRevenue);
          const niStr = formatEgpAmount(latestStatement.netIncome);

          await db
            .insert(marketNews)
            .values({
              id: newsId,
              title: `${symbol} Reports ${period} Results`,
              summary: `Revenue: EGP ${revStr}, Net Income: EGP ${niStr}`,
              category: 'earnings',
              categoryLabel: 'Earnings Disclosure',
              tickers: [symbol],
              sentiment: (latestStatement.netIncome ?? 0) >= 0 ? 'bullish' : 'bearish',
              source: 'EGX Disclosure',
              urgencyScore: 7,
              importance: 'high',
              readTime: '2 min read',
              publishedAt: new Date(),
            })
            .onConflictDoNothing();

          // Check tickerAlerts for followers
          const followers = await db
            .select({ userId: tickerAlerts.userId })
            .from(tickerAlerts)
            .where(and(eq(tickerAlerts.tickerSymbol, symbol), eq(tickerAlerts.enabled, true)));

          alertsGenerated += followers.length;
          if (followers.length > 0) {
            console.log(
              `[SyncFundamentals] Generated ${followers.length} alert(s) for ${symbol} earnings disclosure.`
            );
          }
        }

        updatedTickers.push(symbol);
      } catch (err: any) {
        console.error(`[SyncFundamentals] Failed updating ticker ${symbol}:`, err.message);
      }
    }

    const durationMs = Date.now() - startTime;
    const responsePayload: SyncFundamentalsResult = {
      success: true,
      scannedTickersCount,
      newReportsDetected: updatedTickers.length,
      updatedTickers,
      alertsGenerated,
      durationMs,
    };

    return NextResponse.json(responsePayload);
  } catch (err: any) {
    console.error('[SyncFundamentals] Fatal error during sync:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error',
        scannedTickersCount: 0,
        newReportsDetected: 0,
        updatedTickers: [],
        alertsGenerated: 0,
        durationMs: Date.now() - startTime,
      },
      { status: 500 }
    );
  }
}
