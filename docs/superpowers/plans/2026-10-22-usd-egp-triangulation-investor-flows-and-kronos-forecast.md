# USD/EGP Triangulation: Investor Net Flows & Kronos Forward Trajectory

**Date**: 2026-10-22  
**Status**: Ready for Execution  
**Goal**: Enhance the USD/EGP Triangulation engine by:
1. Adding a **Leading Investor Flow (Hot Money) Engine** across sovereign debt (T-Bills & T-Bonds) and EGX equities to capture forward balance-of-payments pressure.
2. Integrating a **Kronos 10-Session Forward Trajectory Engine** operating on the market-driven Composite Fair Value series to project forward clearing corridors.
3. Displaying both insights cleanly across the Markets page KPI rails and comparative charts.

---

## 1. Architectural Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          TICKNAL FX FAIR VALUE ENGINE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│ 1. Current Spot Triangulation (Coincident)                                  │
│    • 35% USDT/EGP P2P (Binance & Bybit)                                     │
│    • 30% CIB London GDR Implied Rate                                        │
│    • 25% Local Sagha Bullion Implied Rate                                   │
│    • 10% CBE Official Spot                                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2. Investor Net Flow Leading Indicator (Predictive Flow)                     │
│    • Query `egx_investor_flows` for last 10 & 30 trading sessions           │
│    • Sum Foreign + Arab net across STOCKS, BILLS, and BONDS                 │
│    • Flow Regime: Inflow Cushion (Surplus) vs Outflow Pressure (Rationing)  │
│    • Modulates Devaluation Risk Index score (-15 to +25 points)             │
├─────────────────────────────────────────────────────────────────────────────┤
│ 3. Kronos 10-Session Forward Trajectory (Dynamic Projection)                │
│    • Input: 120 historical daily Composite Fair Value points (OHLCV)        │
│    • Model: Autoregressive KronosPredictor with 3-path Monte Carlo sampling │
│    • Cache: Daily in-memory key `FX_KRONOS:${lastDate}:10:3:0.6`            │
│    • Output: 10-day projected rate, expected drift %, 80% confidence band   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Tasks Breakdown

### Task 1: Backend Investor Flow Aggregation & Devaluation Risk Modulation
- **File**: `src/lib/handlers/fx-fair-value-handler.ts`
- **Action**:
  1. Query `egxInvestorFlows` for the latest 10 and 30 sessions for `marketSegment = 'TOTAL'` (or aggregate `STOCKS`, `BILLS`, and `BONDS`).
  2. Compute:
     - `todayHotMoneyNet`: Total net flow in EGP millions for the latest session (`foreignNet + arabNet`).
     - `rolling10DayHotMoneyNet`: 10-session cumulative net flow (`foreignNet + arabNet`).
     - `rolling30DayHotMoneyNet`: 30-session cumulative net flow.
     - `capitalFlowRegime`: `'INFLOW_CUSHION' | 'BALANCED' | 'OUTFLOW_PRESSURE'`.
     - `flowSignalSummary`: Concise bilingual explanation for Egyptian traders.
  3. Modulate `devaluationRisk`:
     - If `rolling10DayHotMoneyNet > +1,500,000,000` (EGP): strong dollar supply in the interbank market; apply a $-10$ to $-15$ point relief discount to the risk score.
     - If `rolling10DayHotMoneyNet < -1,000,000,000` (EGP): heavy foreign repatriation; apply a $+15$ to $+25$ point warning premium to the risk score.
     - Add `capitalFlows` as factor D in `devaluationRisk.factors`.

---

### Task 2: Backend Kronos Forward Trajectory Engine on Composite Fair Value
- **File**: `src/lib/handlers/fx-fair-value-handler.ts`
- **Action**:
  1. Build historical daily series for Composite Fair Value (or USDT/EGP) from existing history rows.
  2. Construct OHLC synthetic daily bars using official USD volatility/range and proxy spreads to provide valid input for Kronos.
  3. Execute `KronosPredictor.predict()` for $N = 10$ sessions with `sampleCount = 3` and `temperature = 0.6`.
  4. Cache the result in-memory with key `FX_KRONOS:${lastDate}:10:3:0.6` so it runs once per trading day and returns in $< 2\text{ms}$ on subsequent visits.
  5. Include `kronosForecast` in `FxFairValueResponse`:
     - `projectedFairValue10D`: Number
     - `expectedDriftPct`: Number
     - `corridor80`: `{ lower: number, upper: number }`
     - `trajectoryVerdict`: `'STABLE_RANGE' | 'MODERATE_DRIFT' | 'ELEVATED_PRESSURE'`
     - `predictions`: Array of 10 daily points `{ date, fairValue, lower80, upper80 }`

---

### Task 3: Automated Test Verification
- **File**: `_technical_support/fx_kronos_tests/test_fx_flows_and_kronos.ts`
- **Action**:
  1. Execute `/api/macro/fx-fair-value` handler directly.
  2. Verify that `capitalFlows` returns valid hot money data for STOCKS + BILLS + BONDS.
  3. Verify that `kronosForecast` returns 10 projected sessions with an 80% confidence corridor.
  4. Verify that the daily cache works (second call completes in $< 5\text{ms}$).

---

### Task 4: Frontend KPI Rails & Cards in `FxDevaluationSection.tsx`
- **File**: `src/components/platform/markets/sections/FxDevaluationSection.tsx`
- **Action**:
  1. Add **Hot Money Capital Flow Card**:
     - Main Value: `${todayHotMoneyNet >= 0 ? '+' : ''}${todayHotMoneyNet}M EGP` (Emerald / Rose).
     - Subtext: `10-Day Balance: +X.XB EGP (Inflow Cushion / Outflow Pressure)`.
     - Icon: `ArrowRightLeft` / `Coins`.
  2. Add **Kronos 10-Session Trajectory Card**:
     - Main Value: `${projectedFairValue10D} EGP` (`expectedDriftPct%`).
     - Subtext: `80% Corridor: [${lower} - ${upper} EGP]`.
     - Icon: `Sparkles` with platform blue/purple gradient stroke.
  3. Update Devaluation Risk Factor breakdown to show Capital Flows alongside Spreads and ATR.

---

### Task 5: Frontend Forward Projection on `FxComparisonChartSection.tsx`
- **File**: `src/components/platform/markets/sections/FxComparisonChartSection.tsx`
- **Action**:
  1. When viewing the Fair Value chart, append the 10 future projected points as dashed forward lines (`strokeDasharray="4 4"`) extending past the current date.
  2. Render the 80% confidence corridor as a subtle shaded forecast area.

---

### Task 6: Strict Build and Typecheck Verification
- **Commands**:
  - `cmd /c npx tsc --noEmit`
  - `cmd /c npm run build`
- **Verification**: Zero errors, exit code 0, adherence to pitch-black design tokens and no `font-mono`.
