# Wave 2 Trend, Momentum, and Volatility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add formula-complete canonical definitions, bilingual presentation metadata, and Charts integration for all 112 Trend, Momentum, and Volatility backlog rows, bringing the platform to 132 integrated indicators.

**Architecture:** Reusable dependency-free rolling math primitives power data-driven category specs. Each spec owns exact defaults, parameter validation, required fields, typed outputs, and a deterministic formula kernel; the existing registry, browser, execution, overlay, and pane infrastructure consumes the resulting definitions without category-specific UI code.

**Tech Stack:** TypeScript 5, Vitest 4.1, React 19.2, Next.js 16.3, Lightweight Charts 5.2.

**Spec:** `docs/superpowers/specs/2026-10-05-complete-411-indicator-library-design.md`

## Global Constraints

- Never edit `src/strategies/**` or `packages/quant-engine/src/strategies/**`.
- Every indicator preserves input length, uses `null` for warm-up/unavailable observations, rejects invalid parameters, and never fabricates absent fields.
- Definitions and presentation entries are registry-owned, formula-versioned, bilingual, and neutral to React/chart libraries.
- New UI surfaces remain pure black/transparent, square-edged, sans-serif, and `tabular-nums` where numeric alignment is needed.
- Tests and diagnostic scripts live under `_technical_support/indicator-wave-2/`.

## Review Focus

- Short histories return aligned warm-up nulls instead of throwing or shifting timestamps.
- Zero denominators yield null/diagnostics rather than infinity or a fabricated zero.
- Volume-dependent PVO/KVO definitions become unavailable when authentic volume coverage is absent.
- Boolean/category event outputs remain typed through the chart consumer and route to marker/legend surfaces.
- Appending a final bar does not alter already confirmed non-repainting outputs except explicitly recursive latest values.

---

### Task 1: Shared rolling mathematics and category factory

**Files:**
- Create: `packages/quant-engine/src/canonical/core/series/statistics.ts`
- Create: `packages/quant-engine/src/canonical/core/series/smoothing.ts`
- Create: `packages/quant-engine/src/canonical/indicators/shared/category-definition.ts`
- Create: `_technical_support/indicator-wave-2/math-primitives.test.ts`

**Interfaces:** Produces aligned `sma`, `ema`, `rma`, `wma`, `rollingMin`, `rollingMax`, `rollingSum`, `rollingStdDev`, `trueRange`, `atr`, `rsi`, `percentileRank`, `linearRegressionEnd`, `crossUp`, `crossDown`, and `defineCategoryIndicator(spec)`.

- [ ] Write failing primitive tests against hand-calculated series, null warm-up, non-finite rejection, and zero denominators.
- [ ] Run the focused suite and verify missing-module failures.
- [ ] Implement the primitives and strict generic parameter/output validation.
- [ ] Run focused, package, and type checks; commit.

### Task 2: Forty Trend definitions and presentations

**Files:**
- Create: `packages/quant-engine/src/canonical/indicators/trend/definitions.ts`
- Create: `packages/quant-engine/src/canonical/indicators/trend/presentation.ts`
- Modify: canonical root definition/presentation registries
- Modify: `packages/quant-engine/src/canonical/program/categories/trend.ts`
- Create: `_technical_support/indicator-wave-2/trend-library.test.ts`

**Interfaces:** Produces `TREND_DEFINITIONS` and `TREND_PRESENTATION_ENTRIES`, one per TRD-001..040, with exact manifest identity, defaults, required fields, outputs, and overlay/pane/event descriptors.

- [ ] Write failing coverage tests for 40 unique definitions, representative hand-calculated SMA/MACD/Aroon/Supertrend/Ichimoku/Mass Index values, invalid parameters, and missing volume for PVO.
- [ ] Run the focused suite and verify failure.
- [ ] Implement all 40 kernels and presentation entries using Task 1 primitives.
- [ ] Register, mark exactly 40 Trend rows integrated, and verify browser count 60 enabled.
- [ ] Run full suites/type checks; commit.

### Task 3: Forty Momentum definitions and presentations

**Files:**
- Create: `packages/quant-engine/src/canonical/indicators/momentum/definitions.ts`
- Create: `packages/quant-engine/src/canonical/indicators/momentum/presentation.ts`
- Modify: canonical registries and `program/categories/momentum.ts`
- Create: `_technical_support/indicator-wave-2/momentum-library.test.ts`

**Interfaces:** Produces `MOMENTUM_DEFINITIONS` and `MOMENTUM_PRESENTATION_ENTRIES` for MOM-001..040.

- [ ] Write failing coverage and golden tests for RSI, Stochastic, CCI, Williams %R, ROC, TSI, Fisher, KST, divergence confirmation, and consensus typing.
- [ ] Run the focused suite and verify failure.
- [ ] Implement all 40 kernels/presentations, including authentic-volume gating for KVO.
- [ ] Register and mark exactly 40 Momentum rows integrated; verify browser count 100 enabled.
- [ ] Run full suites/type checks; commit.

### Task 4: Thirty-two Volatility definitions and presentations

**Files:**
- Create: `packages/quant-engine/src/canonical/indicators/volatility/definitions.ts`
- Create: `packages/quant-engine/src/canonical/indicators/volatility/presentation.ts`
- Modify: canonical registries and `program/categories/volatility.ts`
- Create: `_technical_support/indicator-wave-2/volatility-library.test.ts`

**Interfaces:** Produces `VOLATILITY_DEFINITIONS` and `VOLATILITY_PRESENTATION_ENTRIES` for VOL-001..032.

- [ ] Write failing coverage and golden tests for ATR, Bollinger Bands, historical/range estimators, Choppiness, Ulcer, trailing stops, expected move, and semivolatility.
- [ ] Run the focused suite and verify failure.
- [ ] Implement all 32 kernels/presentations with explicit annualization/confidence defaults.
- [ ] Register and mark exactly 32 Volatility rows integrated; verify browser count 132 enabled.
- [ ] Run full suites/type checks; commit.

### Task 5: Wave 2 integration and release gate

**Files:**
- Create: `_technical_support/indicator-wave-2/wave-2-acceptance.test.ts`
- Create: `_technical_support/indicator-wave-2/chart-page-smoke.ts`
- Modify: `docs/product/indicator-library-backlog.md`

**Interfaces:** Proves 132 integrated/279 disabled rows, all 132 resolvable definitions/presentations, generic chart activation, URL persistence, and no protected-strategy changes.

- [ ] Write the failing acceptance test for exact counts, identities, output coverage, bilingual copy, and surface routing.
- [ ] Run all package/support tests, package/root type checks, production build, authentic-data validation, and category performance benchmarks.
- [ ] Run production endpoint and browser smoke checks at desktop/mobile/RTL widths with zero console, hydration, request, or runtime errors.
- [ ] Verify `git diff --exit-code baefa1b -- src/strategies packages/quant-engine/src/strategies` and inspect the full diff.
- [ ] Update the backlog status and commit the Wave 2 release state.
