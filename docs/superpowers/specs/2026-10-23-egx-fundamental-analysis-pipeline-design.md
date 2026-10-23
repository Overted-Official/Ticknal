# EGX Fundamental Analysis & Financial Statements Data Pipeline Design

**Date**: 2026-10-23  
**Status**: Approved  
**Author**: Antigravity & User  
**Target Subsystem**: Fundamental Data Ingestion, Historical Backfill & Recurrent Updates Engine  

---

## 1. Executive Summary & Objective

This specification defines the architecture, data schema, historical backfill engine, and automated recurrent sync pipeline for capturing and maintaining complete financial statements and fundamental valuation metrics for all companies listed on the Egyptian Exchange (EGX).

### Success Criteria
1. **Complete Historical Depth**: Ingest multi-year historical financial statements (both **Annual `FY`** and **Quarterly `Q1`, `Q2`, `Q3`**) for all active EGX-listed tickers dating back to each company's listing on the exchange (or maximum available depth, typically 10–15+ years).
2. **Comprehensive 3-Statement Model**: Store standardized core financial line items (Revenue, Net Income, Assets, Liabilities, Debt, Cash Flow, Free Cash Flow, EPS) alongside raw audited statement breakdowns in PostgreSQL (`jsonb`).
3. **Automated Recurrent Pipeline**: A scheduled daily cron job runs post-market (Mon–Fri at 4:00 PM Cairo time), checks for newly filed earnings reports, ingests new quarters, recalculates Trailing Twelve Months (TTM) valuation multiples, and generates automated earnings news alerts.

---

## 2. Architecture & System Flow

```mermaid
flowchart TD
    subgraph Data Sources
        S1["TradingView Egypt Institutional Scanner API<br/>(`scanner.tradingview.com/egypt/scan`)"]
        S2["Financials Statements & Indicators Feed<br/>(Multi-Year Quarterly & Annual History)"]
        S3["EGX Official Disclosures & Announcements"]
    end

    subgraph Ingestion Engines
        B1["Historical Backfill Worker<br/>(`_technical_support/fundamentals/backfill-all-egx.ts`)"]
        B2["Daily Post-Market Cron<br/>(`/api/cron/sync-fundamentals`)"]
    end

    subgraph Storage Layer - PostgreSQL
        T1[("`company_financial_statements`<br/>Core Normalized Columns + Raw JSONB")]
        T2[("`company_valuation_metrics`<br/>P/E, P/B, EV/EBITDA, Piotroski F-Score")]
        T3[("`market_news` & `ticker_alerts`<br/>Automated Earnings Disclosures")]
    end

    S1 & S2 --> B1
    S1 & S2 --> B2
    B1 --> T1 & T2
    B2 --> T1 & T2
    B2 --> T3
```

---

## 3. Database Schema Design

The following tables are added to `src/db/schema.ts`:

### 3.1 `company_financial_statements`
Stores historical and recurring audited quarterly and annual financial statements.

| Column | Type | Nullable | Description / Constraints |
|---|---|---|---|
| `id` | `serial` | No | Primary Key |
| `symbol` | `varchar(20)` | No | Foreign Key -> `tickers.symbol` ON DELETE CASCADE |
| `period_type` | `varchar(10)` | No | `'ANNUAL'` or `'QUARTERLY'` |
| `fiscal_year` | `integer` | No | Fiscal year (e.g., `2024`) |
| `fiscal_period` | `varchar(10)` | No | `'Q1'`, `'Q2'`, `'Q3'`, `'FY'` |
| `report_date` | `date` | No | Accounting period ending date |
| `filing_date` | `date` | Yes | Official filing/disclosure date |
| `currency` | `varchar(10)` | No | Default `'EGP'` |
| `total_revenue` | `doublePrecision` | Yes | Top-line sales/turnover |
| `gross_profit` | `doublePrecision` | Yes | Gross profit |
| `operating_income` | `doublePrecision` | Yes | Operating profit (EBIT) |
| `net_income` | `doublePrecision` | Yes | Bottom-line net profit after taxes |
| `ebitda` | `doublePrecision` | Yes | Operating profit before D&A |
| `eps_basic` | `doublePrecision` | Yes | Basic Earnings Per Share |
| `eps_diluted` | `doublePrecision` | Yes | Diluted Earnings Per Share |
| `total_assets` | `doublePrecision` | Yes | Total balance sheet assets |
| `total_liabilities` | `doublePrecision` | Yes | Total liabilities |
| `total_debt` | `doublePrecision` | Yes | Short-term + long-term interest-bearing debt |
| `cash_and_equivalents`| `doublePrecision` | Yes | Cash, treasury bills & liquid equivalents |
| `total_equity` | `doublePrecision` | Yes | Shareholders' equity |
| `operating_cash_flow` | `doublePrecision` | Yes | Cash flow from operating activities |
| `capital_expenditures`| `doublePrecision` | Yes | CapEx investments |
| `free_cash_flow` | `doublePrecision` | Yes | Operating Cash Flow minus CapEx |
| `income_statement_raw`| `jsonb` | Yes | Full audited income statement hierarchy |
| `balance_sheet_raw` | `jsonb` | Yes | Full audited balance sheet line items |
| `cash_flow_raw` | `jsonb` | Yes | Full audited cash flow statement line items |
| `created_at` | `timestamp` | No | Default `now()` |
| `updated_at` | `timestamp` | No | Default `now()` |

**Indexes & Constraints**:
- `unique_statement_period`: `UNIQUE (symbol, period_type, fiscal_year, fiscal_period)`
- `idx_statement_symbol_report`: `INDEX (symbol, report_date DESC)`
- `idx_statement_symbol_year`: `INDEX (symbol, period_type, fiscal_year DESC)`

---

### 3.2 `company_valuation_metrics`
Stores point-in-time valuation multiples, profitability metrics, and quality ratings.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | `serial` | No | Primary Key |
| `symbol` | `varchar(20)` | No | Foreign Key -> `tickers.symbol` ON DELETE CASCADE |
| `date` | `date` | No | Snapshot date |
| `market_cap` | `doublePrecision` | Yes | Total market capitalization |
| `enterprise_value` | `doublePrecision` | Yes | Market Cap + Total Debt - Cash |
| `pe_ratio_ttm` | `doublePrecision` | Yes | Trailing Twelve Months Price-to-Earnings |
| `forward_pe` | `doublePrecision` | Yes | Forward Price-to-Earnings |
| `pb_ratio` | `doublePrecision` | Yes | Price-to-Book ratio |
| `ps_ratio_ttm` | `doublePrecision` | Yes | Price-to-Sales TTM |
| `ev_to_ebitda` | `doublePrecision` | Yes | Enterprise Value / EBITDA |
| `dividend_yield` | `doublePrecision` | Yes | Annualized Dividend Yield % |
| `roe` | `doublePrecision` | Yes | Return on Equity % |
| `roa` | `doublePrecision` | Yes | Return on Assets % |
| `gross_margin` | `doublePrecision` | Yes | Gross Margin % |
| `operating_margin` | `doublePrecision` | Yes | Operating Margin % |
| `net_margin` | `doublePrecision` | Yes | Net Margin % |
| `debt_to_equity` | `doublePrecision` | Yes | Total Debt / Total Equity |
| `current_ratio` | `doublePrecision` | Yes | Current Assets / Current Liabilities |
| `quick_ratio` | `doublePrecision` | Yes | Liquid Assets / Current Liabilities |
| `free_cash_flow_yield`| `doublePrecision` | Yes | Free Cash Flow / Market Cap % |
| `piotroski_f_score` | `integer` | Yes | Quality rating (0 to 9) |
| `altman_z_score` | `doublePrecision` | Yes | Financial distress / solvency metric |
| `created_at` | `timestamp` | No | Default `now()` |

**Indexes & Constraints**:
- `unique_valuation_symbol_date`: `UNIQUE (symbol, date)`
- `idx_valuation_symbol_date`: `INDEX (symbol, date DESC)`

---

## 4. Ingestion Engine & Historical Backfill Pipeline

### 4.1 Ingestion Service (`src/lib/server/fundamentals-scraper.ts`)
A dedicated server-side utility providing:
1. `fetchEgxMarketFundamentals()`: Batch query against TradingView's Egypt scanner retrieving all 294 companies with 50+ valuation and financial indicators in one network payload.
2. `fetchHistoricalStatements(symbol: string)`: Retrieves multi-year quarterly and annual income statements, balance sheets, and cash flow reports for a given ticker.
3. `calculateQualityScores(statements: FinancialStatement[])`: Computes **Piotroski F-Score** (9 binary accounting tests evaluating profitability, leverage, liquidity, and operating efficiency) and **Altman Z-Score**.

### 4.2 Historical Backfill Runner (`_technical_support/fundamentals/backfill-all-egx.ts`)
A robust script that:
- Reads all active tickers from `tickers` table.
- Employs a concurrent queue (concurrency: 4) with polite rate-limiting (250ms delay between calls).
- Normalizes and upserts records into `company_financial_statements` and `company_valuation_metrics`.
- Maintains a local state checkpoint (`_technical_support/fundamentals/backfill-checkpoint.json`) tracking completed symbols, allowing instant resumption if interrupted.
- Produces full audit logging of total statements ingested per ticker.

---

## 5. Recurrent Daily Cron Pipeline (`/api/cron/sync-fundamentals`)

Runs every Egyptian trading day (Sunday through Thursday at 4:00 PM Cairo time):
1. **Scan Market Delta**: Pulls the latest filing timestamps and TTM EPS/Revenue for all 294 EGX companies in a single request ($<1.5\text{s}$).
2. **Detect Newly Filed Quarters**: Compares the latest fiscal period against the latest `(fiscal_year, fiscal_period)` stored in `company_financial_statements`.
3. **Delta Ingestion**: If a new quarterly or annual statement has been filed:
   - Ingests the new quarter's statements.
   - Recalculates TTM figures (sum of the last 4 quarters) and current valuation multiples.
   - Writes an automated disclosure event into `market_news`:
     e.g., *"[Ticker] Discloses Q3 Results: Revenue +18% YoY to EGP 14.2B, Net Profit EGP 3.4B"*.
   - Dispatches user push notifications via `ticker_alerts` for subscribers watching that symbol.

---

## 6. Error Handling & Data Integrity

- **Idempotency**: All write operations utilize `ON CONFLICT DO UPDATE`. Running scripts repeatedly produces zero duplicate rows.
- **Transaction Safety**: Per-ticker transactions guarantee that statements and valuation metrics are committed together; any failed ticker rolls back without affecting the rest of the batch.
- **Negative Earnings**: Negative net income results in `pe_ratio_ttm = null` to maintain mathematical integrity.
- **Currency Cleanliness**: Dual-listed GDRs and USD-quoted Egyptian stocks are stored with their declared currency and converted to EGP equivalents.

---

## 7. Verification & Testing

1. **TypeScript Health**: `npx tsc --noEmit` must pass with code 0.
2. **Build Health**: `npm run build` must compile cleanly with code 0.
3. **Integration Verification**:
   - Run backfill test against sample benchmark tickers (`COMI`, `SWDY`, `TMGH`, and a recent IPO) to confirm multi-year continuity and statement fidelity.
   - Trigger `/api/cron/sync-fundamentals` in test mode to confirm delta detection.
