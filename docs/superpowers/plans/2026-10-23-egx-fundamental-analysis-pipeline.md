# EGX Fundamental Analysis & Financial Statements Data Pipeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete fundamental analysis pipeline for all companies listed on the Egyptian Exchange (EGX), including historical multi-year financial statements since listing, automated valuation multiples (P/E, P/B, ROE, FCF), quality scores (Piotroski F-Score, Altman Z-Score), and an automated daily post-market cron to ingest newly filed earnings reports.

**Architecture:** A dual-engine pipeline featuring a high-performance batch scraper interfacing with TradingView's Egyptian dataset, normalized PostgreSQL storage in Drizzle ORM (`company_financial_statements` and `company_valuation_metrics`), a resilient checkpointed backfill worker, and a lightweight daily delta cron (`/api/cron/sync-fundamentals`) that detects newly filed reports and emits earnings news alerts.

**Tech Stack:** Next.js 16 (Turbopack), TypeScript, PostgreSQL (Neon/Drizzle ORM), SWR, Node.js.

**Spec:** [`docs/superpowers/specs/2026-10-23-egx-fundamental-analysis-pipeline-design.md`](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-23-egx-fundamental-analysis-pipeline-design.md)

---

## Global Constraints

- Surfaces & Geometry: Pitch black (`bg-black`) or transparent surfaces only. Never use gray backgrounds (`#18181b`, `zinc-900`) for widgets.
- Typography: Strict sans-serif (`font-sans`), `tabular-nums` for all numeric metrics. No `font-mono`.
- Brand Name: All-lowercase `ticknal`, font weight 600, `font-euclid` or `ticknal-wordmark`.
- Test & Scratch Files: Any temporary test scripts or one-off scratch scripts must be placed in `_technical_support/fundamentals/`.
- Strict Verification: Every task must exit cleanly with `cmd /c npx tsc --noEmit` (code 0) and `cmd /c npm run build` (code 0).

## Review Focus

1. **Dual Currency Handling**: EGX stocks quoted in USD (or GDRs) must store their native currency and convert correctly without crashing EGP-denominated valuation aggregations.
2. **Sparse / Missing Early Quarters**: Newly listed companies or older listings with only annual reports prior to 2015 must not cause null pointer exceptions during TTM rolling window calculations.
3. **Negative Net Income (P/E Undefined)**: Loss-making quarters must store `pe_ratio_ttm` as `null` rather than negative infinity or zero.
4. **Rate-Limiting & Network Resilience**: The batch backfill runner must gracefully retry on HTTP 429 or network timeouts with exponential backoff.
5. **Idempotent Upserts**: Re-running the backfill or daily cron must update existing periods via `ON CONFLICT DO UPDATE` without creating duplicate records or altering primary keys.

---

### Task 1: Database Schema & Drizzle Migrations

**Files:**
- Modify: `src/db/schema.ts`
- Create: `_technical_support/fundamentals/test-schema-connection.ts`

**Interfaces:**
- Produces: `companyFinancialStatements` and `companyValuationMetrics` pgTable definitions and TypeScript types:
  ```typescript
  export type CompanyFinancialStatement = typeof companyFinancialStatements.$inferSelect;
  export type NewCompanyFinancialStatement = typeof companyFinancialStatements.$inferInsert;
  export type CompanyValuationMetric = typeof companyValuationMetrics.$inferSelect;
  export type NewCompanyValuationMetric = typeof companyValuationMetrics.$inferInsert;
  ```

- [ ] **Step 1: Write schema definitions in `src/db/schema.ts`**
  Add `companyFinancialStatements` and `companyValuationMetrics` with:
  - `(symbol, period_type, fiscal_year, fiscal_period)` unique composite index.
  - Core financial fields: `total_revenue`, `gross_profit`, `operating_income`, `net_income`, `ebitda`, `eps_basic`, `eps_diluted`, `total_assets`, `total_liabilities`, `total_debt`, `cash_and_equivalents`, `total_equity`, `operating_cash_flow`, `capital_expenditures`, `free_cash_flow`.
  - JSONB raw columns: `income_statement_raw`, `balance_sheet_raw`, `cash_flow_raw`.
  - Valuation metrics: `market_cap`, `enterprise_value`, `pe_ratio_ttm`, `forward_pe`, `pb_ratio`, `ps_ratio_ttm`, `ev_to_ebitda`, `dividend_yield`, `roe`, `roa`, `gross_margin`, `operating_margin`, `net_margin`, `debt_to_equity`, `current_ratio`, `quick_ratio`, `free_cash_flow_yield`, `piotroski_f_score`, `altman_z_score`.

- [ ] **Step 2: Create test script `_technical_support/fundamentals/test-schema-connection.ts`**
  Verify Drizzle ORM can query and insert mock records into both tables.

- [ ] **Step 3: Run migration / push to database**
  Execute `npx drizzle-kit push` or execute SQL via test script to ensure tables exist in the target PostgreSQL database.

- [ ] **Step 4: Verify typecheck**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 5: Commit**
  ```bash
  git add src/db/schema.ts _technical_support/fundamentals/test-schema-connection.ts
  git commit -m "feat(db): add company financial statements and valuation metrics schema"
  ```

---

### Task 2: Fundamentals Ingestion Engine & Quality Scoring Math

**Files:**
- Create: `src/lib/server/fundamentals-scraper.ts`
- Create: `src/lib/server/fundamentals-scraper.test.ts`

**Interfaces:**
- Produces:
  ```typescript
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

  export async function fetchEgxMarketFundamentals(): Promise<RawEgxScannerFundamental[]>;
  export async function fetchHistoricalStatements(symbol: string): Promise<{
    annual: NewCompanyFinancialStatement[];
    quarterly: NewCompanyFinancialStatement[];
  }>;
  export function calculateQualityScores(
    statements: NewCompanyFinancialStatement[],
    marketCap: number,
    closingPrice: number
  ): { piotroskiFScore: number; altmanZScore: number | null };
  ```

- [ ] **Step 1: Write test in `src/lib/server/fundamentals-scraper.test.ts`**
  Define test suite checking:
  - Scanner parser transforms raw array into typed `RawEgxScannerFundamental`.
  - Financial normalizer calculates Free Cash Flow (`operating_cash_flow - capital_expenditures`).
  - Piotroski F-Score produces an integer `0..9` based on accounting tests (positive ROA, positive CFO, CFO > Net Income, decreasing leverage, improving margins, etc.).
  - Altman Z-Score calculates solvency correctly for manufacturing/non-manufacturing entities.

- [ ] **Step 2: Run test to verify it fails**
  Run: `npx tsx src/lib/server/fundamentals-scraper.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement `src/lib/server/fundamentals-scraper.ts`**
  - Implement `fetchEgxMarketFundamentals()` via `https://scanner.tradingview.com/egypt/scan`.
  - Implement `fetchHistoricalStatements()` handling statement normalization, quarter classification, and currency mapping.
  - Implement `calculateQualityScores()` with 9-point Piotroski F-Score and Altman Z-Score.

- [ ] **Step 4: Run test to verify it passes**
  Run: `npx tsx src/lib/server/fundamentals-scraper.test.ts`
  Expected: PASS all tests.

- [ ] **Step 5: Commit**
  ```bash
  git add src/lib/server/fundamentals-scraper.ts src/lib/server/fundamentals-scraper.test.ts
  git commit -m "feat(fundamentals): add scraper engine and quality scoring model"
  ```

---

### Task 3: Historical Backfill CLI Runner

**Files:**
- Create: `_technical_support/fundamentals/backfill-all-egx.ts`
- Create: `_technical_support/fundamentals/verify-backfill-stats.ts`

**Interfaces:**
- Consumes: `fetchHistoricalStatements`, `calculateQualityScores`, `companyFinancialStatements`, `companyValuationMetrics`
- Produces: Complete database population across all active EGX tickers with persistent progress checkpointing.

- [ ] **Step 1: Write `_technical_support/fundamentals/backfill-all-egx.ts`**
  - Reads active tickers from `tickers` table where `status = 'ACTIVE'`.
  - Loads/saves checkpoint from `_technical_support/fundamentals/backfill-checkpoint.json`.
  - Employs concurrency queue (concurrency: 4) with polite rate-limiting.
  - Upserts statements and valuation metrics using `onConflictDoUpdate`.
  - Logs per-ticker summary and overall progress bar.

- [ ] **Step 2: Write verification script `_technical_support/fundamentals/verify-backfill-stats.ts`**
  Queries PostgreSQL and outputs:
  - Total companies seeded.
  - Total financial statements stored (Annual vs. Quarterly).
  - Earliest and latest report dates per benchmark sector.
  - Verification of top blue chips (`COMI`, `SWDY`, `TMGH`, `MFPC`, `ETEL`).

- [ ] **Step 3: Test runner on small batch (first 5 tickers)**
  Run: `npx tsx _technical_support/fundamentals/backfill-all-egx.ts --limit 5`
  Verify that 5 tickers insert without errors.

- [ ] **Step 4: Execute full backfill for all EGX tickers**
  Run: `npx tsx _technical_support/fundamentals/backfill-all-egx.ts`
  Verify all active tickers are populated.

- [ ] **Step 5: Run verification script**
  Run: `npx tsx _technical_support/fundamentals/verify-backfill-stats.ts`
  Expected: Confirms all active companies have multi-year statements and metrics recorded.

- [ ] **Step 6: Commit**
  ```bash
  git add _technical_support/fundamentals/backfill-all-egx.ts _technical_support/fundamentals/verify-backfill-stats.ts
  git commit -m "feat(fundamentals): add resilient historical backfill CLI runner"
  ```

---

### Task 4: Automated Recurrent Daily Cron Pipeline & Earnings Alerts

**Files:**
- Create: `src/app/api/cron/sync-fundamentals/route.ts`
- Create: `_technical_support/fundamentals/test-sync-cron.ts`

**Interfaces:**
- Consumes: `fetchEgxMarketFundamentals`, `fetchHistoricalStatements`, `marketNews`, `tickerAlerts`
- Produces: Endpoint `GET /api/cron/sync-fundamentals` returning:
  ```typescript
  interface SyncFundamentalsResult {
    success: boolean;
    scannedTickersCount: number;
    newReportsDetected: number;
    updatedTickers: string[];
    alertsGenerated: number;
    durationMs: number;
  }
  ```

- [ ] **Step 1: Write `src/app/api/cron/sync-fundamentals/route.ts`**
  - Verify `Authorization: Bearer ${CRON_SECRET}` or local developer invocation.
  - Query current market scan from `fetchEgxMarketFundamentals()`.
  - For each ticker, compare latest reported fiscal period against database max period.
  - If a new period is detected:
    - Ingest statements and recalculate TTM metrics.
    - Write an earnings event to `market_news`:
      `title: "[Ticker] Reports [Period] Results"`
      `summary: "Revenue EGP [X]B, Net Income EGP [Y]B"`
      `category: "EARNINGS"`
    - If ticker alerts exist for that symbol, dispatch push notification.
  - Returns JSON response.

- [ ] **Step 2: Write test script `_technical_support/fundamentals/test-sync-cron.ts`**
  Triggers `/api/cron/sync-fundamentals` in dry-run and live modes to verify delta detection and news generation.

- [ ] **Step 3: Run test script to verify cron execution**
  Run: `npx tsx _technical_support/fundamentals/test-sync-cron.ts`
  Expected: Returns `{ success: true, ... }` with execution time $<3\text{s}$ when no new filings exist.

- [ ] **Step 4: Register cron schedule in `vercel.json`**
  Add cron entry:
  ```json
  {
    "path": "/api/cron/sync-fundamentals",
    "schedule": "0 14 * * 0-4"
  }
  ```
  *(14:00 UTC = 4:00 PM Cairo time, Sunday to Thursday).*

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/cron/sync-fundamentals/route.ts _technical_support/fundamentals/test-sync-cron.ts vercel.json
  git commit -m "feat(cron): add daily automated fundamentals sync and earnings alerts"
  ```

---

### Task 5: End-to-End Build, Typecheck, and Runtime Verification

**Files:**
- Modify: (None, verification only)

- [ ] **Step 1: Verify TypeScript compiler**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 2: Verify Next.js production build**
  Run: `cmd /c npm run build`
  Expected: Exit code 0 with route `/api/cron/sync-fundamentals` compiled as dynamic server handler.

- [ ] **Step 3: Query and audit database state**
  Verify statements and valuation ratios exist for top tickers across diverse EGX sectors (Banking, Real Estate, Industrials, Fertilizers, Telecom).
