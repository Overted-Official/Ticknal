# Current-Data 51 Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the agreed 51 indicators operational using only data and internal outputs Ticknal already has, raising the operational library from 299 to exactly 350 without weakening the remaining 61 availability barriers.

**Architecture:** Add a backward-compatible contextual input bundle to the canonical engine so each existing per-indicator `logic.ts` can consume aligned comparison series, macro series, completed trades, portfolio holdings, or versioned model outputs without importing the database, Next.js, or protected strategies. A server-side orchestration endpoint loads and authenticates the required inputs, evaluates contextual indicators, and returns the same canonical consumer result shape the Charts surfaces already render. Existing one-frame indicators continue through the current executor unchanged.

**Tech Stack:** TypeScript 5, Vitest 4, Next.js 16 App Router, React 19, Drizzle ORM, PostgreSQL/PGlite, existing `@ticknal/quant-engine` canonical engine.

**Spec:** `docs/superpowers/specs/2026-10-05-complete-411-indicator-library-design.md`

## Global Constraints

- Keep exactly one `logic.ts` per indicator; category files contain metadata and registration only.
- Do not modify `src/strategies/**` or `packages/quant-engine/src/strategies/**`.
- Canonical engine modules must not import React, Next.js, database, network, Supabase, charting, or strategy modules.
- Missing contextual inputs return typed `unavailable` diagnostics; formulas never fabricate comparison, trade, portfolio, macro, or model values.
- All inputs are timestamp-aligned without look-ahead; results carry source revisions in provenance and execution fingerprints.
- Portfolio data remains tenant-scoped and must not enter shared caches.
- Existing 299 operational definitions and their outputs remain unchanged.
- Only the agreed 51 backlog IDs become operational; the remaining 61 stay truthfully unavailable.
- Product and scratch verification files must follow `AGENTS.md`; non-product scripts belong under `_technical_support/current_data_51_indicators/`.
- Before the final response run `npm run build`, `npx tsc --noEmit`, affected tests, API/runtime checks, browser console checks, and protected-strategy diff verification with zero unresolved errors.

## Review Focus

- Non-overlapping calendars or duplicate timestamps must align deterministically and must not forward-fill future observations.
- A contextual request missing one required role must return `unavailable`, not an all-null `ok` result.
- Tenant portfolio/trade inputs must never be reused for another user or included in public cache keys.
- Execution fingerprints must change when any supplemental source revision, benchmark identity, model version, or portfolio revision changes.
- Strategy adapters may call existing exported strategy APIs but no protected strategy source file may change or be imported by canonical modules.

---

## Locked 51-indicator scope

- **Quantitative (4):** QNT-007–010.
- **Relative/intermarket (16):** REL-001–006, REL-009, REL-011–019.
- **Risk/portfolio (18):** RSK-013–016, RSK-020–027, RSK-030–035.
- **Egypt (6):** EGY-016, EGY-021–022, EGY-029–030, EGY-032.
- **Ticknal composites (7):** TKL-001–005, TKL-007, TKL-009.

## File structure

- `packages/quant-engine/src/canonical/contracts/contextual-inputs.ts`: dependency-free input-domain and provenance contracts.
- `packages/quant-engine/src/canonical/core/alignment/align-series.ts`: exact timestamp intersection/alignment primitives.
- `packages/quant-engine/src/canonical/core/contextual/`: shared return, covariance, regression, trade, portfolio, and consensus primitives.
- `packages/quant-engine/src/canonical/execution/execute-contextual-indicator.ts`: validation, execution, provenance, and fingerprint envelope for contextual inputs.
- Existing 51 per-indicator `logic.ts` files: formula ownership only.
- Existing category `definitions.ts`: defaults, parameters, required capabilities, and operational-set membership.
- `src/lib/indicators/server/load-contextual-indicator-inputs.ts`: database and tenant-safe input loading.
- `src/lib/indicators/server/build-strategy-output-context.ts`: read-only adapter over existing exported strategy APIs.
- `src/lib/indicators/server/evaluate-contextual-indicators.ts`: request planning, deduplicated loading, execution, and response shaping.
- `src/app/api/indicators/evaluate/route.ts`: authenticated contextual evaluation endpoint.
- `src/components/platform/chart/canonical/useCanonicalIndicatorExecutions.ts`: split local versus contextual execution and merge states/results.
- `src/components/platform/chart/canonical/IndicatorParameterEditor.tsx`: symbol/benchmark selection support.

### Task 1: Contextual contracts and backward-compatible executor

**Files:**
- Create: `packages/quant-engine/src/canonical/contracts/contextual-inputs.ts`
- Create: `packages/quant-engine/src/canonical/execution/execute-contextual-indicator.ts`
- Modify: `packages/quant-engine/src/canonical/contracts/definition.ts`
- Modify: `packages/quant-engine/src/canonical/contracts/result.ts`
- Modify: `packages/quant-engine/src/canonical/contracts/index.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/shared/category-definition.ts`
- Modify: `packages/quant-engine/src/canonical/execution/execution-fingerprint.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`
- Test: `packages/quant-engine/test/contracts/contextual-executor.test.ts`

**Interfaces:**
- Produces: `IndicatorInputCapability`, `NumericSeriesFrame`, `CompletedTradeFrame`, `PortfolioInputFrame`, `ModelOutputFrame`, `IndicatorOutputFrame`, `IndicatorInputBundle`, `EMPTY_INDICATOR_INPUT_BUNDLE`, and `executeContextualIndicator(...)`.
- Extends: `IndicatorMetadata.requiredCapabilities: readonly IndicatorInputCapability[]`.
- Extends: `TimeSeriesIndicatorDefinition.compute(frame, parameters, inputs?)` without changing existing two-argument logic behavior.

- [ ] Write failing contract tests for immutable bundles, missing capability diagnostics, contextual source provenance, and fingerprint changes.
- [ ] Run `npx vitest run packages/quant-engine/test/contracts/contextual-executor.test.ts`; expect failures for missing types/executor.
- [ ] Add the contracts and backward-compatible third input argument.
- [ ] Add contextual validation and execution while preserving the current output-length contract against the primary frame.
- [ ] Include every supplemental identity/revision in result provenance and execution fingerprints.
- [ ] Run the contextual contract test and existing executor/consumer tests; expect all to pass.

### Task 2: Timestamp alignment and shared contextual mathematics

**Files:**
- Create: `packages/quant-engine/src/canonical/core/alignment/align-series.ts`
- Create: `packages/quant-engine/src/canonical/core/contextual/pair-statistics.ts`
- Create: `packages/quant-engine/src/canonical/core/contextual/trade-statistics.ts`
- Create: `packages/quant-engine/src/canonical/core/contextual/portfolio-statistics.ts`
- Test: `packages/quant-engine/test/core/contextual-primitives.test.ts`

**Interfaces:**
- Consumes: contextual frame contracts from Task 1.
- Produces: `alignNumericSeries`, `alignFrameCloses`, `simpleReturns`, `rollingPairStatistic`, `linearFit`, `summarizeCompletedTrades`, `portfolioCovariance`, and `normalizeWeights`.

- [ ] Write failing hand-calculated tests covering timestamp intersection, gaps, duplicate rejection, zero denominators, constant series, empty trades, short portfolios, and singular covariance.
- [ ] Run `npx vitest run packages/quant-engine/test/core/contextual-primitives.test.ts`; expect missing-module failures.
- [ ] Implement the smallest dependency-free primitives needed by the 51 formulas.
- [ ] Run the primitive tests; expect all cases to pass without NaN or Infinity outputs.

### Task 3: Four quantitative and sixteen relative/intermarket formulas

**Files:**
- Modify: `packages/quant-engine/src/canonical/indicators/quantitative/definitions.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/quantitative/rolling-correlation/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/quantitative/rolling-covariance/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/quantitative/rolling-beta/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/quantitative/rolling-alpha/logic.ts`
- Modify: the 16 scoped `packages/quant-engine/src/canonical/indicators/relative-intermarket/*/logic.ts` files and `definitions.ts`
- Test: `packages/quant-engine/test/references/current-data-quant-relative.test.ts`

**Interfaces:**
- Consumes: `comparison`, `benchmark`, `fund`, `sector`, `gold`, `usdEgp`, and selected-asset roles from `IndicatorInputBundle`.
- Produces: operational QNT-007–010 and the locked 16 REL definitions.

- [ ] Add failing golden-vector tests for every output, including non-overlapping dates and explicitly selected comparison symbols.
- [ ] Run the focused reference test; expect all 20 scoped definitions to return `unavailable` before implementation.
- [ ] Add `comparisonSymbol`, `benchmarkSymbol`, period, annualization, and currency parameters where each reviewed formula requires them.
- [ ] Implement each formula in its own existing `logic.ts`; shared calculations stay in Task 2 primitives.
- [ ] Replace unconditional capability barriers with role-based availability checks only for these 20 definitions.
- [ ] Run focused tests plus registry/architecture tests; expect all to pass.

### Task 4: Four benchmark-risk and six Egypt formulas

**Files:**
- Modify: the scoped RSK-013–016 `logic.ts` files and `risk-portfolio/definitions.ts`
- Modify: the scoped EGY-016, EGY-021–022, EGY-029–030, EGY-032 `logic.ts` files and `egypt/definitions.ts`
- Test: `packages/quant-engine/test/references/current-data-risk-egypt.test.ts`

**Interfaces:**
- Consumes: benchmark, USD/EGP, gold, silver, fund, and M2 frames; `riskFreeAnnualPct` remains an explicit parameter until an official rate series is acquired.
- Produces: operational information ratio, Treynor ratio, Jensen alpha, tracking error, official USD/EGP trend, EGP-per-gram metals, M2 growth/divergence, and user-selected fund tracking difference.

- [ ] Add failing golden tests for all ten indicators and unit tests proving gold/silver units are not converted twice.
- [ ] Run the focused test; expect unavailable results.
- [ ] Implement the ten formulas in their existing individual logic files.
- [ ] Require a user-selected benchmark for fund tracking; do not invent a fund benchmark mapping.
- [ ] Run focused and architecture tests; expect all to pass.

### Task 5: Nine completed-trade risk metrics

**Files:**
- Modify: RSK-020–027 and RSK-030 `logic.ts` files
- Modify: `packages/quant-engine/src/canonical/indicators/risk-portfolio/definitions.ts`
- Test: `packages/quant-engine/test/references/current-data-trade-risk.test.ts`

**Interfaces:**
- Consumes: `CompletedTradeFrame` with side, entry/exit, realized return/P&L, and authenticated in-trade adverse/favorable excursion.
- Produces: cumulative, timestamp-aligned MAE, MFE, profit factor, win rate, expectancy, payoff, Kelly, risk of ruin, and recovery factor series.

- [ ] Add failing tests with a hand-calculated mixed win/loss ledger, zero-loss ledger, empty ledger, short trade, and invalid chronology.
- [ ] Run the focused test; expect unavailable results.
- [ ] Implement all nine formulas in their existing individual logic files.
- [ ] Emit values only from each trade's exit observation onward; never use a later trade in an earlier output.
- [ ] Run focused tests; expect exact values and no look-ahead.

### Task 6: Five portfolio risk metrics

**Files:**
- Modify: RSK-031–035 `logic.ts` files
- Modify: `packages/quant-engine/src/canonical/indicators/risk-portfolio/definitions.ts`
- Test: `packages/quant-engine/test/references/current-data-portfolio-risk.test.ts`

**Interfaces:**
- Consumes: tenant-scoped holdings/weights, aligned holding return series, benchmark returns, and valuation revision.
- Produces: portfolio beta, marginal/percentage risk contribution, HHI/effective holdings, diversification ratio, and correlation-stress results.

- [ ] Add failing tests for two-asset hand calculations, one-asset portfolios, zero/negative market values, missing holding history, and singular covariance.
- [ ] Run the focused test; expect unavailable results.
- [ ] Implement all five formulas in their existing individual logic files.
- [ ] Treat invalid/non-positive total portfolio value as unavailable rather than normalizing nonsense weights.
- [ ] Run focused tests; expect exact values and stable failure semantics.

### Task 7: Seven protected-model and indicator-consensus adapters

**Files:**
- Create: `src/lib/indicators/server/build-strategy-output-context.ts`
- Create: `src/lib/indicators/server/build-indicator-consensus-context.ts`
- Modify: TKL-001–005, TKL-007, and TKL-009 `logic.ts` files and `ticknal-composites/definitions.ts`
- Test: `packages/quant-engine/test/references/current-data-composites.test.ts`
- Test: `src/lib/indicators/server/build-strategy-output-context.test.ts`

**Interfaces:**
- Consumes: versioned output-only frames created by app-layer adapters over existing exported Typhon, PSI 40, Cerberus, HYDRA, and champion APIs.
- Produces: canonical chart outputs without canonical-to-strategy imports and without protected source changes.

- [ ] Snapshot hashes for both protected strategy directories before any Task 7 edits.
- [ ] Add failing canonical pass-through/consensus tests and app-adapter mapping tests.
- [ ] Implement app-layer adapters using existing public strategy exports only.
- [ ] Implement seven canonical output formulas in their individual logic files.
- [ ] Add cycle detection and minimum-coverage rules for user-selected indicator consensus.
- [ ] Recompute protected-directory hashes and assert byte-for-byte equality.
- [ ] Run focused tests and dependency-boundary tests; expect all to pass.

### Task 8: Server-side contextual loading and evaluation API

**Files:**
- Create: `src/lib/indicators/server/contextual-request.ts`
- Create: `src/lib/indicators/server/load-contextual-indicator-inputs.ts`
- Create: `src/lib/indicators/server/evaluate-contextual-indicators.ts`
- Create: `src/app/api/indicators/evaluate/route.ts`
- Modify: `src/lib/indicators/server/types.ts`
- Test: `src/lib/indicators/server/evaluate-contextual-indicators.test.ts`

**Interfaces:**
- Consumes: symbol, timeframe, and canonical selections; current authenticated user where portfolio data is requested.
- Produces: one result per selection in request order, with deduplicated input loading and no-store semantics for user-specific results.

- [ ] Read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`, `06-fetching-data.md`, and `08-caching.md` before writing the route.
- [ ] Add failing tests for request validation, deduplicated series loads, M2 loading, unauthorized portfolio access, mixed local/contextual selections, and missing-role diagnostics.
- [ ] Run the focused server test; expect missing-module failures.
- [ ] Implement a pure request planner and evaluator first, then thin database/auth adapters and the POST route.
- [ ] Never share-cache portfolio/trade/model contexts; public comparison-price inputs may use revision-keyed request-local reuse.
- [ ] Run focused server tests and route type checking; expect all to pass.

### Task 9: Charts integration, operational registry, and end-to-end verification

**Files:**
- Modify: `packages/quant-engine/src/canonical/registry/category-registry.ts`
- Modify: scoped category operational-definition exports
- Modify: scoped presentation operational-entry exports
- Modify: `packages/quant-engine/test/registry/complete-registry.test.ts`
- Modify: `src/components/platform/chart/canonical/useCanonicalIndicatorExecutions.ts`
- Modify: `src/components/platform/chart/canonical/evaluate-active-indicators.ts`
- Modify: `src/components/platform/chart/canonical/IndicatorParameterEditor.tsx`
- Modify: `src/indicators/canonical/types.ts`
- Test: `packages/quant-engine/test/registry/current-data-51-operational.test.ts`
- Test/support: `_technical_support/current_data_51_indicators/`

**Interfaces:**
- Consumes: server evaluation response from Task 8 and existing local evaluation results.
- Produces: a single merged execution/state collection rendered by existing pane, market, card, and legend surfaces.

- [ ] Add a failing registry test asserting exactly 350 operational definitions, the exact 51 newly operational IDs, and exactly 61 remaining unavailable definitions.
- [ ] Add failing component tests for benchmark/symbol parameters, loading, cancellation, unavailable diagnostics, and merged result order.
- [ ] Update operational sets and presentation filtering only after all 51 formula tests pass.
- [ ] Add contextual fetching to the existing hook; do not refetch shared series once per active indicator.
- [ ] Render existing canonical visual descriptors without new monolithic indicator-specific UI branches.
- [ ] Run all canonical tests and confirm 411 definitions, 350 operational, 61 unavailable, and one logic file per indicator.
- [ ] Run `npm run build` and `npx tsc --noEmit`; both must exit 0.
- [ ] Start the production server and verify `/api/indicators/frame` and `/api/indicators/evaluate` return no 500 responses for representative price, benchmark, M2, trade, portfolio, and composite requests.
- [ ] Verify Charts desktop/mobile/RTL behavior, hydration, console, and uncaught-promise health with representative indicators from all five categories.
- [ ] Verify `git diff -- src/strategies packages/quant-engine/src/strategies` is empty.

## Execution order and stopping rule

Tasks run sequentially because every formula family depends on the contextual contracts and shared alignment rules. Do not mark an indicator operational until its formula test and its authentic input adapter both pass. If an item in the locked 51 proves to require a dataset not currently present, leave that one unavailable, record the evidence, and continue with the remaining items rather than substituting a proxy.

