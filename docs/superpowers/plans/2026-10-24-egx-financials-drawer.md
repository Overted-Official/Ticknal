# EGX Company Financials & Fundamentals Drawer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and integrate the interactive **EGX Company Financials & Fundamentals Drawer** on `/charts`, enabling users to inspect 20 years of annual statements, 32 quarters of quarterly statements, valuation multiples, Piotroski F-Scores, and Altman Z''-Scores directly from the chart toolbar.

**Architecture:** A high-speed cached Next.js API route (`/api/companies/[symbol]/fundamentals`), an SWR client hook with client-side derived metrics, and a modular right slide-over drawer (`FinancialsDrawer.tsx`) built strictly with `globals.css` design tokens, featuring 3 specialized tabs: Overview & Valuation, 3-Statement Model Grid, and Financial Ratios.

**Tech Stack:** Next.js 16 (App Router / Turbopack), TypeScript, React 19, Framer Motion, SWR, Drizzle ORM / PostgreSQL, Tailwind CSS (Design Tokens).

**Spec:** [`docs/superpowers/specs/2026-10-24-egx-financials-drawer-design.md`](file:///c:/Users/abdelrahman.mamdouh_/Desktop/Overted%20Technologies/Ticknal/docs/superpowers/specs/2026-10-24-egx-financials-drawer-design.md)

---

## Global Constraints

- **Design System Tokens Only**: ONLY use semantic tokens from `src/app/globals.css` (`bg-plt-base`, `bg-plt-card`, `bg-plt-hover`, `bg-plt-active`, `border-plt-border-soft`, `text-plt-text`, `text-plt-subtle`, `text-plt-muted`, `text-plt-profit`, `text-plt-risk`, `text-plt-warning`). NEVER hardcode hex codes or arbitrary CSS styles.
- **Pure Pitch Black Surfaces**: Main drawer surface must strictly be pure black (`bg-plt-base` / `#000000`). Never use elevated dark grays (`#18181b`, `zinc-900`) for drawer backgrounds.
- **Sharp Geometry**: Drawers and main sheets must have square, sharp edges (`rounded-none`). No pillowy rounded drawer corners.
- **No Monospace Fonts**: NEVER use `font-mono`. Use modern sans-serif (`font-sans`) with CSS `tabular-nums` for all numeric alignment.
- **Brand Typography**: All-lowercase `ticknal`, font weight 600 (`font-euclid` or `ticknal-wordmark`).
- **Test & Scratch Files**: Scratch and test scripts must only be placed in `_technical_support/fundamentals/`.
- **Strict Verification**: Every task must verify `cmd /c npx tsc --noEmit` (code 0) and final build `cmd /c npm run build` (code 0).

## Review Focus

1. **Loss-Making Quarters (P/E Undefined)**: If Net Income is negative, P/E ratio must display as `N/A` without breaking numeric alignment or throwing NaN errors.
2. **Dual Currency Handling**: USD-denominated tickers (e.g. GDRs) must render `USD` badges and format currency symbols cleanly.
3. **Sparse & Missing Periods**: Tickers with fewer quarters or banks without standard Gross Profit must render `—` gracefully without table shifts or null pointer exceptions.
4. **Horizontal Scroll & Sticky Column Alignment**: The sticky left line-item column must remain pinned over pure black background without transparency bleed during horizontal scrolling.
5. **Hydration & SSR Safety**: Drawer portal mounting must be guarded by `mounted` state to prevent React SSR hydration mismatches.

---

### Task 1: Backend Fundamentals API & Data Query Endpoint

**Files:**
- Create: `src/app/api/companies/[symbol]/fundamentals/route.ts`
- Create: `_technical_support/fundamentals/test-fundamentals-api.ts`

**Interfaces:**
- Produces: `GET /api/companies/[symbol]/fundamentals` returning:
  ```typescript
  export interface CompanyFundamentalsResponse {
    symbol: string;
    currency: string;
    valuation: CompanyValuationMetric | null;
    statements: {
      annual: CompanyFinancialStatement[];
      quarterly: CompanyFinancialStatement[];
    };
  }
  ```

- [ ] **Step 1: Write test script `_technical_support/fundamentals/test-fundamentals-api.ts`**
  Queries the endpoint handler for `COMI`, `SWDY`, `TMGH`, and a loss-making/sparse ticker, validating JSON shape, statement segregation, and order dates.

- [ ] **Step 2: Implement `src/app/api/companies/[symbol]/fundamentals/route.ts`**
  - `export const dynamic = 'force-dynamic';`
  - Strip exchange suffixes (`.CA`, `EGX:`).
  - Query `companyValuationMetrics` for the latest snapshot for `symbol`.
  - Query `companyFinancialStatements` for `symbol` ordered by `reportDate DESC`.
  - Partition into `annual` (`periodType === 'ANNUAL'`) and `quarterly` (`periodType === 'QUARTERLY'`).
  - Cache headers: `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
  - Return JSON response.

- [ ] **Step 3: Run test script to verify endpoint execution**
  Run: `cmd /c npx tsx -r dotenv/config _technical_support/fundamentals/test-fundamentals-api.ts dotenv_config_path=.env.local`
  Expected: PASS with 200 responses and populated statement arrays.

- [ ] **Step 4: Verify typecheck**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 5: Commit**
  ```bash
  git add src/app/api/companies/[symbol]/fundamentals/route.ts _technical_support/fundamentals/test-fundamentals-api.ts
  git commit -m "feat(api): add company fundamentals and statements query route"
  ```

---

### Task 2: Client Data Layer, Formatters & TDD Unit Tests

**Files:**
- Create: `src/components/platform/chart/financials/types.ts`
- Create: `src/components/platform/chart/financials/formatters.ts`
- Create: `src/components/platform/chart/financials/formatters.test.ts`
- Create: `src/components/platform/chart/financials/useCompanyFundamentals.ts`

**Interfaces:**
- Produces:
  ```typescript
  export function formatSmartCompact(val: number | null | undefined, currency?: string): string;
  export function formatExactRaw(val: number | null | undefined, currency?: string): string;
  export function formatPercent(val: number | null | undefined, decimals?: number): string;
  export function formatYoYDelta(current: number | null | undefined, prior: number | null | undefined): { label: string; positive: boolean; neutral: boolean } | null;
  export function useCompanyFundamentals(symbol: string): { data: CompanyFundamentalsResponse | null; isLoading: boolean; error: any };
  ```

- [ ] **Step 1: Write unit tests in `src/components/platform/chart/financials/formatters.test.ts`**
  Tests:
  - Smart compact formatting: `230151557000` -> `230.15B EGP`, `48200000` -> `48.20M EGP`, `null` -> `—`.
  - YoY delta calculation: current vs prior with positive/negative tags and boundary zero checks.
  - Negative P/E normalization: returns `N/A`.
  - Altman Z score zone classification.
  - Piotroski score categorization (High / Stable / Weak).

- [ ] **Step 2: Run test to verify it fails**
  Run: `cmd /c npx tsx src/components/platform/chart/financials/formatters.test.ts`
  Expected: FAIL with module not found.

- [ ] **Step 3: Implement `formatters.ts`, `types.ts`, and `useCompanyFundamentals.ts`**
  - Implement formatting utilities and ratio calculators.
  - Implement SWR hook with `revalidateOnFocus: false`.

- [ ] **Step 4: Run test to verify it passes**
  Run: `cmd /c npx tsx src/components/platform/chart/financials/formatters.test.ts`
  Expected: PASS all tests.

- [ ] **Step 5: Verify typecheck**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/platform/chart/financials/
  git commit -m "feat(financials): add formatters, types, and SWR data hook with tests"
  ```

---

### Task 3: Chart Toolbar Trigger, CSV Export & Financials Drawer Shell

**Files:**
- Modify: `src/components/platform/chart/ChartTopBar.tsx`
- Modify: `src/components/platform/ChartWidget.tsx`
- Create: `src/components/platform/chart/financials/FinancialsDrawer.tsx`
- Create: `src/components/platform/chart/financials/FinancialsHeader.tsx`
- Create: `src/components/platform/chart/financials/FinancialsTabBar.tsx`
- Create: `src/components/platform/chart/financials/export-csv.ts`

**Interfaces:**
- Produces: Trigger button on `ChartTopBar.tsx`, portal-mounted `FinancialsDrawer`, responsive sheet, CSV export utility.

- [ ] **Step 1: Add trigger button in `src/components/platform/chart/ChartTopBar.tsx`**
  Add `[Financials]` button adjacent to `[Strategy Report]` using `Landmark` icon and `globals.css` tokens.

- [ ] **Step 2: Wire up drawer state in `src/components/platform/ChartWidget.tsx`**
  Add `isFinancialsOpen` state and `F` keyboard shortcut listener.

- [ ] **Step 3: Create `FinancialsDrawer.tsx`, `FinancialsHeader.tsx`, `FinancialsTabBar.tsx`, and `export-csv.ts`**
  - Drawer sheet: `w-full md:w-[75vw] lg:w-[70vw] max-w-[1300px] h-full bg-plt-base border-l border-plt-border-soft rounded-none`.
  - Header with company logo, ticker mark, sector pill, currency badge, export CSV, and close button.
  - Sticky tab bar with 3 tabs: Overview, Statements, Ratios.
  - CSV export helper for downloading statements data.

- [ ] **Step 4: Verify typecheck**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 5: Commit**
  ```bash
  git add src/components/platform/chart/ChartTopBar.tsx src/components/platform/ChartWidget.tsx src/components/platform/chart/financials/
  git commit -m "feat(financials): add chart toolbar trigger and financials drawer shell"
  ```

---

### Task 4: Tab 1 — Overview & Valuation (KPI Multiples, Piotroski & Altman Z Cards)

**Files:**
- Create: `src/components/platform/chart/financials/tabs/OverviewValuationTab.tsx`
- Create: `src/components/platform/chart/financials/components/ValuationMultiplesGrid.tsx`
- Create: `src/components/platform/chart/financials/components/PiotroskiScoreCard.tsx`
- Create: `src/components/platform/chart/financials/components/AltmanZScoreCard.tsx`
- Create: `src/components/platform/chart/financials/components/FiveYearTrendBars.tsx`

**Interfaces:**
- Consumes: `valuation`, `statements.annual`, `formatSmartCompact`, `formatPercent`
- Produces: `OverviewValuationTab` rendering KPI multiples grid, 9-point Piotroski breakdown, Altman Z safety zone meter, and 5-year mini revenue/profit bars.

- [ ] **Step 1: Implement `ValuationMultiplesGrid.tsx`**
  Renders responsive grid of KPI cards (Market Cap, EV, P/E, Forward P/E, P/B, P/S, EV/EBITDA, Dividend Yield, ROE, ROA, Debt/Equity, FCF Yield) using `bg-plt-card border-plt-border-soft font-sans tabular-nums`.

- [ ] **Step 2: Implement `PiotroskiScoreCard.tsx`**
  Renders score `0..9`, semantic badge, and 3-pillar breakdown (Profitability, Leverage, Efficiency) with pass/fail indicators.

- [ ] **Step 3: Implement `AltmanZScoreCard.tsx`**
  Renders score and visual meter for Safe ($Z > 2.6$), Grey ($1.1 \le Z \le 2.6$), and Distress ($Z < 1.1$) zones.

- [ ] **Step 4: Implement `FiveYearTrendBars.tsx`**
  Renders SVG/CSS dual-bar comparison of Revenue vs Net Income across the last 5 fiscal years with hover tooltips.

- [ ] **Step 5: Assemble `OverviewValuationTab.tsx` and verify in drawer**
  Connect components to `useCompanyFundamentals` data.

- [ ] **Step 6: Verify typecheck**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 7: Commit**
  ```bash
  git add src/components/platform/chart/financials/
  git commit -m "feat(financials): add overview and valuation tab with quality scoring cards"
  ```

---

### Task 5: Tab 2 & Tab 3 — 3-Statement Data Grid & Financial Ratios

**Files:**
- Create: `src/components/platform/chart/financials/tabs/FinancialStatementsTab.tsx`
- Create: `src/components/platform/chart/financials/tabs/FinancialRatiosTab.tsx`
- Create: `src/components/platform/chart/financials/components/StatementDataGrid.tsx`
- Create: `src/components/platform/chart/financials/components/RatioBenchmarkBadge.tsx`

**Interfaces:**
- Consumes: `statements.annual`, `statements.quarterly`, `formatSmartCompact`, `formatYoYDelta`
- Produces: Interactive 3-Statement table with Annual/Quarterly toggle and comprehensive Financial Ratios tab.

- [ ] **Step 1: Implement `StatementDataGrid.tsx`**
  Sticky left column for line-item titles (`bg-plt-base border-r border-plt-border-soft`), horizontally scrollable period columns, smart compact numbers, tooltip raw numbers, and YoY delta badges.

- [ ] **Step 2: Implement `FinancialStatementsTab.tsx`**
  Statement selector pills (`Income`, `Balance Sheet`, `Cash Flow`), period frequency toggle (`Annual FY` vs `Quarterly FQ`), and line-item search filter.

- [ ] **Step 3: Implement `FinancialRatiosTab.tsx`**
  Multi-year ratio comparison table across 4 pillars (Profitability, Liquidity, Leverage, Operating Efficiency) with health status badges and 5-year trend sparklines.

- [ ] **Step 4: Integrate all 3 tabs into `FinancialsDrawer.tsx`**
  Ensure smooth tab switching and zero layout jumps.

- [ ] **Step 5: Verify typecheck**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 6: Commit**
  ```bash
  git add src/components/platform/chart/financials/
  git commit -m "feat(financials): add 3-statement data grid and financial ratios tab"
  ```

---

### Task 6: End-to-End Build, Typecheck, and Runtime Verification

**Files:**
- Modify: (None, verification only)

- [ ] **Step 1: Verify TypeScript compiler**
  Run: `cmd /c npx tsc --noEmit`
  Expected: Exit code 0.

- [ ] **Step 2: Verify Next.js production build**
  Run: `cmd /c npm run build`
  Expected: Exit code 0.

- [ ] **Step 3: Runtime verification of `/api/companies/[symbol]/fundamentals`**
  Verify API returns 200 with populated statements and valuation metrics for benchmark equities (`COMI`, `SWDY`, `TMGH`, `MFPC`).
