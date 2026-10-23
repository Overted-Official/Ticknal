# EGX Company Financials & Fundamentals Drawer Design Spec

**Date**: 2026-10-24  
**Status**: Approved / In Review  
**Author**: Antigravity & User  
**Target Subsystem**: Chart Terminal Financials Drawer, Fundamentals API & 3-Statement Exploration Engine  

---

## 1. Executive Summary & Objective

This specification details the architecture, UI/UX design, and data flow for the **EGX Company Financials & Fundamentals Drawer** on Ticknal. It connects the 11,500+ audited historical statements and valuation multiples stored in PostgreSQL directly to active technical chart users on `/charts`.

### Core User Experience Goals
1. **Zero Context Switching**: Analysts and traders charting an EGX stock (e.g. `COMI`, `SWDY`, `TMGH`) can open multi-decade financial statements and valuation metrics in one click directly from the chart toolbar without losing their price crosshairs, open indicators, or drawn patterns.
2. **Comprehensive 3-Statement Model**: Full audited line-item inspection across **Income Statement**, **Balance Sheet**, and **Cash Flow**, toggling between **Annual (`FY`)** (up to 20 years back to 2003) and **Quarterly (`FQ`)** (up to 32 quarters).
3. **Institutional Quality & Solvency Scoring**: Point-in-time **Piotroski F-Score (0–9)** breakdown and Emerging Markets **Altman Z''-Score** safety zone gauges.
4. **Strict Design Token Adherence**: Pure pitch black (`#000000` / `bg-plt-base`), sharp square geometry (`rounded-none`), tabular typography (`font-sans tabular-nums`), and strict usage of semantic design tokens from `src/app/globals.css` with zero hardcoded CSS values.

---

## 2. Trigger Integration & Drawer Geometry

### 2.1 Toolbar Placement (`src/components/platform/chart/ChartTopBar.tsx`)
A dedicated `[Financials]` button is added to `ChartTopBar.tsx` immediately adjacent to the `[Strategy Report]` button:

```tsx
{/* Financials & Fundamentals Drawer Trigger */}
<button
  type="button"
  data-tour="chart-financials-btn"
  title={locale === 'ar' ? 'القوائم المالية والتحليل المالي' : 'Financial Statements & Fundamentals'}
  aria-label={locale === 'ar' ? 'القوائم المالية' : 'Financials'}
  onClick={() => setIsFinancialsOpen(true)}
  className="h-7 px-2.5 rounded-md text-[11px] font-medium text-plt-muted hover:text-plt-text hover:bg-plt-hover transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
>
  <Landmark size={13} />
  <span>{locale === 'ar' ? 'القوائم المالية' : 'Financials'}</span>
</button>
```

Keyboard shortcut: pressing `F` (when no search or order input is focused) toggles the drawer.

### 2.2 Drawer Geometry & Shell (`src/components/platform/chart/financials/FinancialsDrawer.tsx`)
* **Portal Rendering**: Mounted to `document.body` via `createPortal`.
* **Backdrop**: Smooth fade overlay `fixed inset-0 bg-plt-overlay backdrop-blur-sm cursor-pointer z-[90]` (`0.2s easeOut`).
* **Drawer Sheet**:
  * Desktop width: `w-full md:w-[75vw] lg:w-[70vw] max-w-[1300px] h-full`.
  * Mobile width: `w-full h-full` (full-screen).
  * Surface: `bg-plt-base` (strictly `#000000`).
  * Edges: `rounded-none` (strictly square, sharp corners; no pillowy rounded drawer headers).
  * Border: `border-l border-plt-border-soft`.

### 2.3 Drawer Header
* **Left Section**:
  * Company logo (with fallback initials square mark).
  * Ticker symbol (`COMI`) in `font-sans font-bold text-plt-text text-base`.
  * Full localized company name in `text-xs text-plt-muted truncate max-w-[240px]`.
  * Sector pill: `text-[11px] text-plt-subtle bg-plt-hover border border-plt-border-soft px-2 py-0.5 rounded-full`.
* **Center Section**:
  * Currency badge: `EGP` (or `USD` for GDRs/dual-quoted stocks).
  * Latest filing status badge: `Audited · FY 2025` or `Q2 2026`.
* **Right Section**:
  * **Export CSV Button**: `<Download size={13} /> Export CSV` (`bg-plt-hover hover:bg-plt-active text-plt-muted hover:text-plt-text text-[11px] px-2.5 py-1 rounded-md border border-plt-border-soft flex items-center gap-1.5 cursor-pointer`).
  * **Close Button**: `p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-md transition-colors cursor-pointer`.

---

## 3. Navigation & Tab Bar

A sticky segmented tab bar underneath the header:
`bg-plt-base border-b border-plt-border-soft px-6 py-2.5 flex items-center gap-2`

### 3 Tabs
1. **Overview & Valuation**: `<Activity size={12} /> Overview`
2. **Financial Statements**: `<FileText size={12} /> Statements`
3. **Financial Ratios**: `<Scale size={12} /> Ratios`

**Tab Styling**:
* Active: `bg-plt-active text-plt-text border border-plt-border-strong font-medium text-xs px-3 py-1.5 rounded-md`
* Inactive: `text-plt-muted hover:text-plt-text hover:bg-plt-hover border border-transparent text-xs px-3 py-1.5 rounded-md transition-colors`

---

## 4. Tab 1: Overview & Valuation Specification

### 4.1 Valuation Multiples Grid
Responsive grid (4 columns desktop, 2 columns mobile) using `bg-plt-card border border-plt-border-soft p-3 rounded-md`:
* **Market Capitalization & EV**: e.g., `426.15B EGP` & `435.20B EGP`
* **Price Multiples**:
  * Trailing P/E (`peRatioTtm`): formatted as `6.0x`. If net profit is negative, renders as `N/A` in `text-plt-muted`.
  * Forward P/E: `5.4x`
  * Price-to-Book (P/B): `1.83x`
  * Price-to-Sales (P/S TTM): `3.17x`
  * EV / EBITDA: `11.2x`
* **Returns & Cash Yield**:
  * Dividend Yield: `4.79%`
  * Free Cash Flow Yield: `16.5%`
  * Return on Equity (ROE %): `34.36%` (`text-plt-profit` if positive, `text-plt-risk` if negative)
  * Return on Assets (ROA %): `4.22%`
* **Capital Structure**:
  * Debt-to-Equity: `0.35x`
  * Current Ratio: `1.42x`

### 4.2 Quality & Solvency Dual Cards
Side-by-side cards providing fundamental quality ratings:

#### Piotroski F-Score Card (0 to 9 Score)
* Score Gauge: Large numeric badge (e.g., `6 / 9`) with semantic status badge:
  * `8–9`: `text-plt-profit bg-plt-profit-soft border-plt-profit-border` (High Quality)
  * `5–7`: `text-plt-warning bg-plt-warning-soft border-plt-warning-border` (Stable / Moderate)
  * `0–4`: `text-plt-risk bg-plt-risk-soft border-plt-risk-border` (Weak / Deteriorating)
* Three Pillar Breakdown:
  1. **Profitability (4 pts)**: Positive ROA, Positive Operating Cash Flow, Increasing ROA, Cash Flow > Net Income.
  2. **Leverage & Liquidity (3 pts)**: Lower Debt/Assets, Higher Current Ratio, No Share Dilution.
  3. **Operating Efficiency (2 pts)**: Higher Gross Margin, Higher Asset Turnover.
* Checklist indicators: `✓ Passed (1 pt)` in `text-plt-profit`, `✕ Missed (0 pt)` in `text-plt-faint`.

#### Altman Z''-Score Card (Emerging Markets Solvency Metric)
* Formulation: $Z = 6.56X_1 + 3.26X_2 + 6.72X_3 + 1.05X_4$
* Score Badge: e.g. `12.02` with color-coded safety zone meter:
  * **Safe Zone** ($Z > 2.6$): `text-plt-profit bg-plt-profit-soft border-plt-profit-border` (Low probability of insolvency)
  * **Grey Zone** ($1.1 \le Z \le 2.6$): `text-plt-warning bg-plt-warning-soft border-plt-warning-border` (Caution advised)
  * **Distress Zone** ($Z < 1.1$): `text-plt-risk bg-plt-risk-soft border-plt-risk-border` (High financial risk)
* Explanatory micro-metrics: Working Capital ($X_1$), Retained Earnings ($X_2$), Operating Profit ($X_3$), Equity-to-Debt ($X_4$).

### 4.3 5-Year Mini Performance Trend
* SVG / CSS bar chart visualizing 5-year trend of **Total Revenue** vs **Net Income**:
  * Revenue bar: `bg-plt-text-muted` (cold white/gray)
  * Net Income bar: `bg-plt-profit` (green) or `bg-plt-risk` (red if negative)
  * Interactive hover tooltips showing exact EGP figures and YoY growth %.

---

## 5. Tab 2: 3-Statement Financial Table Specification

### 5.1 Controls & Toggles
* **Statement Selector**: Segmented pills: `[Income Statement] [Balance Sheet] [Cash Flow]`.
* **Period Toggle**: Segmented pills: `[Annual (FY)] [Quarterly (FQ)]`.
  * Annual displays up to 20 fiscal years (`2025` back to `2006/2003`).
  * Quarterly displays up to 32 fiscal quarters (`2026-Q2` back to `2018-Q3`).
* **Line Item Filter Input**: Compact search input (`Search line items...`) to filter rows.

### 5.2 Table Layout & Sticky Navigation
* **Sticky First Column (`w-[220px] min-w-[220px] bg-plt-base border-r border-plt-border-soft z-10`)**: Line-item titles remain pinned while scrolling horizontally across decades of data.
* **Sticky Header Row (`bg-plt-base border-b border-plt-border-soft z-20`)**: Period badges (`FY 2025`, `FY 2024` or `Q2 2026`, `Q1 2026`) with report end dates.
* **Period Columns (`w-[140px] min-w-[140px] text-right px-3 py-2.5 tabular-nums font-sans`)**.

### 5.3 Line Items by Statement
1. **Income Statement**:
   * Total Revenue (bold top-line)
   * Gross Profit & Gross Margin %
   * Operating Income (EBIT) & Operating Margin %
   * EBITDA
   * Net Income (bold bottom-line, `text-plt-profit` / `text-plt-risk`)
   * Basic EPS & Diluted EPS
2. **Balance Sheet**:
   * Cash & Short-Term Investments
   * Total Assets (bold)
   * Total Debt (Short-Term + Long-Term)
   * Total Liabilities (bold)
   * Total Shareholders' Equity (bold)
   * Net Debt (`Total Debt - Cash`)
3. **Cash Flow**:
   * Operating Cash Flow (CFO)
   * Capital Expenditures (CapEx)
   * Free Cash Flow (FCF = CFO - CapEx)
   * Cash Flow from Investing Activities
   * Cash Flow from Financing Activities

### 5.4 Number Formatting & YoY Deltas
* Numbers use Smart Compact formatting: `230.15B EGP`, `71.38B EGP`, `850.2M EGP`.
* Tooltip on hover displays exact unrounded figure: `230,151,557,000 EGP`.
* Micro Year-over-Year (YoY) delta badge beneath each value:
  * `+18.4%` in `text-plt-profit text-[10px]`
  * `-6.2%` in `text-plt-risk text-[10px]`
  * `0.0%` in `text-plt-muted text-[10px]`

---

## 6. Tab 3: Financial Ratios Specification

### 6.1 Four Analytical Categories
1. **Profitability & Margins**:
   * Gross Margin % (`Gross Profit / Revenue`)
   * Operating Margin % (`Operating Income / Revenue`)
   * Net Profit Margin % (`Net Income / Revenue`)
   * Return on Equity (ROE %) (`Net Income / Shareholders' Equity`)
   * Return on Assets (ROA %) (`Net Income / Total Assets`)
2. **Liquidity & Working Capital**:
   * Current Ratio (`Current Assets / Current Liabilities`)
   * Quick Ratio (`(Current Assets - Inventory) / Current Liabilities`)
   * Cash Ratio (`Cash & Equivalents / Current Liabilities`)
3. **Leverage & Solvency**:
   * Debt-to-Equity Ratio (`Total Debt / Shareholders' Equity`)
   * Debt-to-Assets Ratio (`Total Debt / Total Assets`)
   * Financial Leverage Multiple (`Total Assets / Shareholders' Equity`)
   * Net Debt to EBITDA (`(Total Debt - Cash) / EBITDA`)
4. **Operating Efficiency & Cash Conversion**:
   * Asset Turnover Ratio (`Revenue / Total Assets`)
   * Free Cash Flow Margin % (`Free Cash Flow / Revenue`)
   * Cash Conversion Quality (`CFO / Net Income`)

### 6.2 Visual Presentation
* Horizontal comparison table across the last 5 to 10 fiscal years.
* Benchmark health pill next to each ratio row:
  * Healthy: `text-plt-profit bg-plt-profit-soft border-plt-profit-border`
  * Neutral: `text-plt-warning bg-plt-warning-soft border-plt-warning-border`
  * Strained: `text-plt-risk bg-plt-risk-soft border-plt-risk-border`
* Mini inline directional sparkline showing the 5-year trajectory.

---

## 7. Backend API Specification

### Endpoint: `GET /api/companies/[symbol]/fundamentals`
* **File**: `src/app/api/companies/[symbol]/fundamentals/route.ts`
* **Dynamic**: `export const dynamic = 'force-dynamic';`
* **Caching**: Cache headers `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`.
* **Execution**:
  1. Normalizes ticker symbol (e.g. `COMI.CA` -> `COMI`).
  2. Queries latest snapshot from `company_valuation_metrics` for `symbol`.
  3. Queries all rows from `company_financial_statements` for `symbol` ordered by `report_date DESC`.
  4. Segregates statements into `annual: []` (`period_type = 'ANNUAL'`) and `quarterly: []` (`period_type = 'QUARTERLY'`).
  5. Returns structured JSON:
     ```json
     {
       "symbol": "COMI",
       "currency": "EGP",
       "valuation": { ... },
       "statements": {
         "annual": [ ... ],
         "quarterly": [ ... ]
       }
     }
     ```

---

## 8. Design System Token Compliance Matrix

| UI Element | Forbidden Hardcoded Value | Mandated Token from `globals.css` |
|---|---|---|
| Drawer sheet background | `#121212`, `#18181b`, `zinc-950` | `bg-plt-base` (strictly `#000000`) |
| Drawer sheet borders | `#333333`, `#27272a` | `border-plt-border-soft` |
| Drawer corner geometry | `rounded-t-2xl`, `rounded-xl` | `rounded-none` (square, sharp) |
| Card containers | Arbitrary gray hex | `bg-plt-card border border-plt-border-soft` |
| Hover states | Arbitrary hover colors | `hover:bg-plt-hover` (`rgba(255,255,255,0.04)`) |
| Active segmented tabs | Arbitrary blue/indigo | `bg-plt-active text-plt-text border-plt-border-strong` |
| Primary text | `#ffffff` | `text-plt-text` |
| Secondary / Muted text | `#888888` | `text-plt-muted`, `text-plt-subtle` |
| Numeric values | `font-mono` | `font-sans tabular-nums` |
| Positive returns / margins | Arbitrary green | `text-plt-profit`, `bg-plt-profit-soft` |
| Negative returns / losses | Arbitrary red | `text-plt-risk`, `bg-plt-risk-soft` |
| Warning / Neutral badges | Arbitrary orange | `text-plt-warning`, `bg-plt-warning-soft` |

---

## 9. Error Handling & Edge Cases

1. **Loss-Making Quarters/Years**: If Net Income is negative, P/E ratio is strictly rendered as `N/A` rather than negative or infinite numbers.
2. **Banks & Financial Institutions (e.g. `COMI`)**: Egyptian banks do not report traditional Cost of Goods Sold or Gross Profit. Gross Margin and Operating Profit rows gracefully display `—` without breaking table formatting.
3. **Sparse Early Reporting**: Newly listed tickers with fewer historical quarters render available data without distortion; empty historical slots do not throw undefined/null errors.
4. **Dual-Currency Stocks**: Stocks quoted in USD display currency `USD` in the header badge, with statement figures formatted accordingly.

---

## 10. Verification & Quality Gates

1. **TypeScript Verification**: `cmd /c npx tsc --noEmit` exits with code 0.
2. **Build Verification**: `cmd /c npm run build` compiles with code 0.
3. **Integration Verification**:
   - Open `/charts` and verify `[Financials]` button is present and styled with `globals.css` tokens.
   - Open drawer for `COMI`, `SWDY`, `TMGH`, and `MFPC`.
   - Verify 3 tabs load cleanly without hydration mismatches or layout shifts.
   - Verify Annual/Quarterly toggle switches seamlessly between 20 years and 32 quarters of data.
   - Verify CSV export generates clean tabular files.
