# Wave A Canonical Indicator Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the canonical indicator-engine foundation, register all 411 backlog IDs, implement and verify the 20 Price and Return indicators, connect authentic database data without frequency fallback, and prove that new chart/rule/scanner/alert consumers share the same calculations.

**Architecture:** Add a dependency-clean `@ticknal/quant-engine/canonical` sub-entry beside the existing package exports, leaving HYDRA, PSI, and PSI V2 untouched. The canonical subtree accepts validated, provenance-rich time-series frames and returns versioned typed results; server-only adapters load authentic database rows at the requested frequency, while consumers call the same executor. Indicator modules remain one-folder-per-indicator and registries are composed from category manifests rather than one monolithic file.

**Tech Stack:** TypeScript 5, Node.js 20+/24, npm workspaces, Vitest 4.1.11, Next.js 16.3.5 App Router, React 19.2.8, Drizzle ORM, PostgreSQL, Lightweight Charts 5.2.0.

**Spec:** `docs/superpowers/specs/2026-10-04-canonical-indicator-engine-design.md`

## Global Constraints

- Production calculations use authentic stored or streamed data at the exact requested frequency; absent data returns `unavailable`, never a fabricated value or a different timeframe.
- Test data is limited to immutable hand-calculated reference vectors or provenance-recorded authentic snapshots and is never imported by production modules.
- `src/strategies/**` and `packages/quant-engine/src/strategies/**` are read-only. HYDRA, PSI, and PSI V2 files, imports, parameters, registries, backtests, and behavior must not change.
- Existing `@ticknal/quant-engine` root exports remain backward compatible. New work imports `@ticknal/quant-engine/canonical` only.
- The canonical subtree must not import Next.js, React, Drizzle, Supabase, database clients, network clients, Lightweight Charts, existing indicator implementations, or any strategy module.
- Each indicator owns a focused folder with `definition.ts`, `compute.ts`, `README.md`, `index.ts`, and its own test file.
- Every indicator uses backlog ID, stable machine ID, formula version `1.0.0`, definition schema version `1`, explicit defaults, declared units, deterministic warm-up nulls, and English/Arabic explanations.
- No runtime input may replace missing volume or trades with zero. Authentic observed zero remains zero; missing remains `null`.
- No result may expose NaN or Infinity. Expected warm-up is `null`; invalid input, unavailable capability, and numerical warnings use typed diagnostics.
- Calculations use full JavaScript number precision. Display rounding belongs to consumers; numeric tests use output-specific tolerances.
- A provisional bar may produce a provisional chart value but cannot be treated as a confirmed alert evaluation.
- Do not modify `getCachedHourlyPrices` or its behavior in this wave. The new indicator adapter bypasses it and never performs its daily fallback.
- Before any Next.js route or client integration edit, read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`, `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, and `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`.
- Before every implementation completion response, `cmd /c npm run build` and `cmd /c npx tsc --noEmit` must exit `0`, affected API routes must avoid unhandled exceptions/500 responses, and affected pages must have no hydration or browser-console errors.
- UI changes use pure black or transparent main surfaces, sans-serif text, `tabular-nums` for aligned numbers, and no `font-mono`.

## Review Focus

1. **Frequency substitution:** an unavailable `1H`/`15M` request must return `DATA_FREQUENCY_UNAVAILABLE`; it must never receive daily rows. Task 13 pins this with live adapter and route verification.
2. **Missing versus zero volume:** PRC-020 must accept authentic zero-volume bars, preserve zero, return null for a zero-sum window, and reject unavailable/partial volume instead of substituting zero. Tasks 2 and 11 pin these cases.
3. **Malformed chronology/OHLC:** duplicate or unordered timestamps, non-finite values, and impossible OHLC relationships must return `invalid` with stable diagnostics. Task 2 owns these tests.
4. **Window/anchor ambiguity:** lookbacks are positive safe integers, warm-up arrays stay input-aligned, and an absent explicit cumulative-return anchor is invalid. Tasks 8–11 pin these cases.
5. **Provisional/repainting behavior:** confirmed historical outputs must remain prefix-stable; the latest provisional bar is identified and scanner/alert consumers cannot present it as confirmed. Tasks 12, 13, and 15 own these tests.

---

## Locked Wave A contracts and formulas

These decisions are part of the plan, not choices left to an implementer.

### Canonical public interfaces

```ts
export type ObservationTime = string | number;
export type BarFinality = 'final' | 'provisional';
export type FieldCoverage = 'observed' | 'partial' | 'unavailable';
export type AdjustmentMode = 'raw' | 'split-adjusted' | 'total-return-adjusted' | 'as-stored';

export interface MarketBar {
  readonly time: ObservationTime;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number | null;
  readonly trades: number | null;
  readonly finality: BarFinality;
}

export interface TimeSeriesFrame {
  readonly domain: 'time-series';
  readonly meta: MarketFrameMeta;
  readonly bars: readonly MarketBar[];
}

export interface ExecutionContext {
  readonly calculatedAt: string;
}

export interface TimeSeriesIndicatorDefinition<P extends object> {
  readonly backlogId: string;
  readonly id: string;
  readonly formulaVersion: '1.0.0';
  readonly definitionSchemaVersion: 1;
  readonly metadata: IndicatorMetadata;
  parseParameters(raw: Readonly<Record<string, unknown>>): ParameterParseResult<P>;
  compute(frame: TimeSeriesFrame, parameters: P): ComputationResult;
}

export function executeTimeSeriesIndicator<P extends object>(
  definition: TimeSeriesIndicatorDefinition<P>,
  frame: TimeSeriesFrame,
  rawParameters: Readonly<Record<string, unknown>>,
  context: ExecutionContext,
): IndicatorResult;
```

`MarketFrameMeta` contains instrument ID/symbol, exchange, asset class, quote currency, requested/effective timeframe, source ID/type/revision, as-of/received-at timestamps, adjustment mode/revision, session completeness, continuity status, field coverage/counts, and any documented adapter transformations. `IndicatorResult` has status `ok | unavailable | invalid`, identity/version/normalized parameters, aligned typed outputs, provenance, execution fingerprint, result finality, coverage, and diagnostics.

### Price/return formula matrix

All lookbacks count observed bars, include the current bar, require complete windows, and default to the values below.

| ID | Machine ID | Exact outputs/formula | Parameters and warm-up |
|---|---|---|---|
| PRC-001 | `close-price` | `close[i] = bar.close` | No parameters; no warm-up. |
| PRC-002 | `open-price` | `open[i] = bar.open` | No parameters; no warm-up. |
| PRC-003 | `high-low` | `high`, `low`, `range = high - low` | No parameters; no warm-up. |
| PRC-004 | `hl2-median-price` | `hl2 = (high + low) / 2` | No parameters; no warm-up. |
| PRC-005 | `hlc3-typical-price` | `hlc3 = (high + low + close) / 3` | No parameters; no warm-up. |
| PRC-006 | `ohlc4-average-price` | `ohlc4 = (open + high + low + close) / 4` | No parameters; no warm-up. |
| PRC-007 | `weighted-close` | `hlcc4 = (high + low + 2 * close) / 4` | No parameters; no warm-up. |
| PRC-008 | `absolute-change` | `change[i] = close[i] - close[i-lookback]` | `lookback` positive safe integer, default `1`; first `lookback` values null. |
| PRC-009 | `percentage-change` | `return_pct = (close[i] / close[i-lookback] - 1) * 100` | `lookback` default `1`; prices used as divisors must be positive; warm-up null. |
| PRC-010 | `log-return` | `log_return = ln(close[i] / close[i-lookback])` | `lookback` default `1`; both prices must be positive; warm-up null. Unit is decimal log return, not percent. |
| PRC-011 | `cumulative-return` | `cumulative_return = (close[i] / close[anchor] - 1) * 100` | `anchor` defaults to `first-observation` or is an exact observation time; unmatched explicit anchor is invalid; values before anchor are null; anchor value is `0`. |
| PRC-012 | `gap-percentage` | `gap_pct = (open[i] / close[i-1] - 1) * 100`; direction is `up`, `down`, or `flat` from exact sign | First value null; previous close must be positive. |
| PRC-013 | `intrabar-return` | `body_return_pct = (close / open - 1) * 100` | Open must be positive; no warm-up. |
| PRC-014 | `high-low-range-percentage` | `range_pct = ((high - low) / close) * 100` | Close must be positive; no warm-up. |
| PRC-015 | `true-range` | `max(high-low, abs(high-prevClose), abs(low-prevClose))`; first bar is `high-low` | No parameters; no warm-up. |
| PRC-016 | `rolling-high-low` | `highest = max(high window)`, `lowest = min(low window)` | `lookback` default `20`; first `lookback-1` values null. |
| PRC-017 | `distance-from-high-low` | `distance_from_high_pct = (close/highest-1)*100`; `distance_from_low_pct = (close/lowest-1)*100` | Uses PRC-016 high/low windows; `lookback` default `20`; positive denominators; complete-window warm-up. |
| PRC-018 | `drawdown-series` | `peak = running max(close)`; `drawdown_pct = (close/peak-1)*100` | Close must be positive; first drawdown is `0`; no warm-up. |
| PRC-019 | `price-percentile-rank` | `(close - rollingMinClose) / (rollingMaxClose - rollingMinClose) * 100` | `lookback` default `20`; complete-window warm-up; zero-width window yields null plus `NUMERIC_DIVIDE_BY_ZERO`. |
| PRC-020 | `rolling-vwap-source` | `rolling_vwap = sum(source * volume) / sum(volume)` | `lookback` default `20`; `source` default `hlc3`, allowed `close | hl2 | hlc3 | ohlc4`; complete observed-volume windows only; zero volume sum yields null plus diagnostic. |

The OHLC-derived formulas and true-range convention are cross-checked against TradingView's official chart-information and Pine v6 reference documentation. Rolling VWAP is deliberately a fixed-window volume-weighted mean, not TradingView's session-anchored `ta.vwap`; its distinction is documented in PRC-020.

Formula-reference URLs recorded in the relevant READMEs:

- `https://www.tradingview.com/pine-script-docs/concepts/chart-information/` for OHLC fields, HL2, HLC3, OHLC4, HLCC4, observed volume, and provisional realtime-bar behavior.
- `https://www.tradingview.com/pine-script-reference/v6/` for `ta.tr` and the documented HLC3 basis of TradingView's session VWAP, used only to explain why PRC-020 is a distinct rolling calculation.

### Locked plain-language Arabic descriptions

English descriptions are copied exactly from the corresponding canonical backlog rows. Arabic descriptions are fixed as follows so implementation does not improvise financial meaning:

| ID | Arabic description |
|---|---|
| PRC-001 | آخر سعر تداول مسجل في كل فترة. |
| PRC-002 | أول سعر تداول مسجل في كل فترة. |
| PRC-003 | أعلى وأدنى سعر تم تسجيلهما في كل فترة، والفارق بينهما. |
| PRC-004 | منتصف المسافة بين أعلى وأدنى سعر في الفترة. |
| PRC-005 | متوسط أعلى سعر وأدنى سعر وسعر الإغلاق في الفترة. |
| PRC-006 | متوسط أسعار الافتتاح والأعلى والأدنى والإغلاق في الفترة. |
| PRC-007 | متوسط يعطي سعر الإغلاق وزناً مضاعفاً مع أعلى وأدنى سعر. |
| PRC-008 | مقدار ارتفاع أو انخفاض سعر الإغلاق بوحدات السعر خلال عدد محدد من الفترات. |
| PRC-009 | نسبة ارتفاع أو انخفاض سعر الإغلاق خلال عدد محدد من الفترات. |
| PRC-010 | العائد اللوغاريتمي المستمر بين سعرين يفصل بينهما عدد محدد من الفترات. |
| PRC-011 | إجمالي العائد المتراكم منذ نقطة بداية محددة. |
| PRC-012 | الفارق النسبي بين سعر افتتاح الفترة وسعر إغلاق الفترة السابقة. |
| PRC-013 | نسبة حركة السعر من الافتتاح إلى الإغلاق داخل الفترة نفسها. |
| PRC-014 | نطاق أعلى وأدنى سعر كنسبة من سعر الإغلاق. |
| PRC-015 | نطاق الحركة بعد احتساب الفجوة عن سعر الإغلاق السابق. |
| PRC-016 | أعلى قمة وأدنى قاع خلال عدد محدد من الفترات. |
| PRC-017 | المسافة النسبية بين سعر الإغلاق وأعلى قمة وأدنى قاع في النافذة المحددة. |
| PRC-018 | نسبة تراجع سعر الإغلاق عن أعلى إغلاق مسجل حتى تلك النقطة. |
| PRC-019 | موضع سعر الإغلاق بين أدنى وأعلى إغلاق ضمن نافذة متحركة. |
| PRC-020 | متوسط السعر المرجح بحجم التداول خلال نافذة متحركة ثابتة. |

### Shared five-bar hand-calculated reference

All task tests use this immutable reference vector where applicable; it never enters production code.

```ts
const bars = [
  { time: '2026-01-04', open: 100, high: 110, low: 90,  close: 105, volume: 1000 },
  { time: '2026-01-05', open: 106, high: 112, low: 101, close: 108, volume: 1200 },
  { time: '2026-01-06', open: 107, high: 115, low: 104, close: 114, volume: 800  },
  { time: '2026-01-07', open: 113, high: 118, low: 109, close: 110, volume: 1500 },
  { time: '2026-01-08', open: 111, high: 116, low: 107, close: 115, volume: 900  },
];
```

The reference frame identifies its source type as `hand-calculated-reference`, uses a fixed revision, has all bars final, and lives only under `packages/quant-engine/test/references/`.

---

### Task 1: Establish the canonical sub-entry and Vitest harness

**Files:**
- Modify: `packages/quant-engine/package.json`
- Modify: `packages/quant-engine/tsconfig.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `packages/quant-engine/vitest.config.ts`
- Create: `packages/quant-engine/src/canonical/index.ts`
- Create: `packages/quant-engine/test/architecture/canonical-entry.test.ts`
- Create: `packages/quant-engine/test/architecture/dependency-boundary.test.ts`

**Interfaces:**
- Consumes: Existing npm workspace and unchanged `@ticknal/quant-engine` root entry.
- Produces: `@ticknal/quant-engine/canonical`; package scripts `test`, `test:watch`, and `type-check`; an import-boundary test for canonical production files.

- [ ] **Step 1: Install the exact test-runner version and add scripts**

  Run: `cmd /c npm install --save-dev --save-exact vitest@4.1.11 --workspace @ticknal/quant-engine`

  Add `test: "vitest run"` and `test:watch: "vitest"` to the quant package without changing existing dependencies or root exports.

- [ ] **Step 2: Write the failing canonical-entry and dependency-boundary tests**

  `canonical-entry.test.ts` imports `../../src/canonical` and expects a frozen `CANONICAL_ENGINE_SCHEMA_VERSION` equal to `1`. `dependency-boundary.test.ts` recursively reads `src/canonical/**/*.ts` and fails imports containing `next`, `react`, `drizzle`, `supabase`, `lightweight-charts`, `/strategies/`, `src/indicators`, or network/database clients.

- [ ] **Step 3: Run the focused tests and verify the entry test fails**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/architecture/canonical-entry.test.ts test/architecture/dependency-boundary.test.ts`

  Expected: FAIL because the canonical schema export does not exist.

- [ ] **Step 4: Add the package subpath, TS path, config, and minimal entry**

  Add package export `./canonical -> ./src/canonical/index.ts`, root TS path `@ticknal/quant-engine/canonical`, Vitest's Node environment/include pattern, package TypeScript includes for `src/**/*.ts`, `test/**/*.ts`, and `vitest.config.ts`, and `export const CANONICAL_ENGINE_SCHEMA_VERSION = 1 as const`.

- [ ] **Step 5: Run tests and type checks**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: both exit `0`.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/quant-engine/package.json packages/quant-engine/tsconfig.json packages/quant-engine/vitest.config.ts packages/quant-engine/src/canonical/index.ts packages/quant-engine/test/architecture package-lock.json tsconfig.json
  git commit -m "test(quant): establish canonical engine boundary"
  ```

### Task 2: Implement canonical contracts, validation, diagnostics, and executor

**Files:**
- Create: `packages/quant-engine/src/canonical/contracts/market.ts`
- Create: `packages/quant-engine/src/canonical/contracts/definition.ts`
- Create: `packages/quant-engine/src/canonical/contracts/diagnostic.ts`
- Create: `packages/quant-engine/src/canonical/contracts/result.ts`
- Create: `packages/quant-engine/src/canonical/contracts/index.ts`
- Create: `packages/quant-engine/src/canonical/validation/validate-market-frame.ts`
- Create: `packages/quant-engine/src/canonical/validation/validate-outputs.ts`
- Create: `packages/quant-engine/src/canonical/execution/execute-time-series-indicator.ts`
- Create: `packages/quant-engine/src/canonical/execution/execution-fingerprint.ts`
- Create: `packages/quant-engine/test/references/five-bar-frame.ts`
- Create: `packages/quant-engine/test/contracts/market-frame.test.ts`
- Create: `packages/quant-engine/test/contracts/executor.test.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: `CANONICAL_ENGINE_SCHEMA_VERSION` from Task 1.
- Produces: The exact contracts in this plan, `validateMarketFrame(frame)`, `validateIndicatorOutputs(definition, outputs, barCount)`, `createExecutionFingerprint(...)`, and `executeTimeSeriesIndicator(...)`.

- [ ] **Step 1: Write failing market-frame tests**

  Assert the five-bar reference is valid; duplicate/unordered times yield `INPUT_DUPLICATE_TIMESTAMP`/`INPUT_TIMESTAMP_ORDER`; NaN yields `INPUT_NON_FINITE`; `low > high` or OHLC outside `[low, high]` yields `INPUT_INVALID_OHLC`; negative observed volume yields `INPUT_NEGATIVE_VOLUME`; `null` volume stays missing while `0` stays observed zero; blank source revision is invalid; and an undocumented requested/effective timeframe mismatch is invalid.

- [ ] **Step 2: Run the frame tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/contracts/market-frame.test.ts`

  Expected: FAIL because contracts/validator do not exist.

- [ ] **Step 3: Implement contracts and `validateMarketFrame(frame: TimeSeriesFrame): ValidationResult`**

  The validator never sorts, deduplicates, fills, resamples, or mutates input. It recomputes field counts, verifies metadata coverage, and returns diagnostics rather than throwing for user/data errors.

- [ ] **Step 4: Run frame tests and verify pass**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/contracts/market-frame.test.ts`

  Expected: PASS.

- [ ] **Step 5: Write failing executor tests**

  Use an inline test-only definition to assert parameter parse failure returns `invalid`, missing required volume returns `unavailable`, output length mismatch returns `OUTPUT_INVARIANT_FAILED`, NaN output is rejected, warm-up null is accepted, output arrays remain time-aligned, and identical requests receive identical fingerprints.

- [ ] **Step 6: Implement executor, output validation, and fingerprinting**

  `executeTimeSeriesIndicator` performs definition resolution inputs in the exact order: frame validation, required-capability check, parameter parsing, pure compute, output validation, result-envelope creation. It catches only typed computation failures; unexpected programmer exceptions remain observable.

- [ ] **Step 7: Run Task 2 tests and package type-check**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/contracts`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: both exit `0`.

- [ ] **Step 8: Commit**

  ```bash
  git add packages/quant-engine/src/canonical packages/quant-engine/test/contracts packages/quant-engine/test/references
  git commit -m "feat(quant): add canonical indicator contracts and executor"
  ```

### Task 3: Add the typed 411-entry program-manifest model

**Files:**
- Create: `packages/quant-engine/src/canonical/program/types.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/index.ts`
- Create: `packages/quant-engine/src/canonical/program/program-manifest.ts`
- Create: `packages/quant-engine/test/program/program-manifest-schema.test.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: Stable IDs and metadata from `docs/product/indicator-library-backlog.md`.
- Produces: `ProgramEntry`, `ProgramState`, `DeliveryStage`, `DataRequirementCode`, `PROGRAM_MANIFEST`, and `getProgramEntry(backlogId)`. `ProgramEntry.canonicalId` is `string | null`: it remains null until that entry's formula review fixes an implementation ID.

- [ ] **Step 1: Write the failing schema test**

  Assert accepted program states are exactly `unimplemented | formula-review | implementation | data-gated | verified | integrated | retired`; delivery stages exactly `T0 | T1 | T2 | T3 | R`; duplicate backlog IDs or duplicate non-null canonical IDs throw; unknown data/view/status values fail construction.

- [ ] **Step 2: Run the schema test and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/program/program-manifest-schema.test.ts`

  Expected: FAIL because the program types do not exist.

- [ ] **Step 3: Implement the typed manifest model and empty category composer**

  `createProgramManifest(categoryEntries)` freezes entries, validates IDs against `/^[A-Z]{3}-\d{3}$/`, rejects duplicate backlog IDs and duplicate non-null canonical IDs, and provides read-only lookup without parsing Markdown at runtime.

- [ ] **Step 4: Run the schema test and verify pass**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/program/program-manifest-schema.test.ts`

  Expected: PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/program packages/quant-engine/test/program packages/quant-engine/src/canonical/index.ts
  git commit -m "feat(quant): define indicator program manifest contracts"
  ```

### Task 4: Populate the first seven modular program categories

**Files:**
- Create: `packages/quant-engine/src/canonical/program/categories/price-return.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/trend.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/momentum.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/volatility.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/volume-flow.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/market-structure.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/cycles.ts`
- Create: `packages/quant-engine/test/program/first-category-set.test.ts`
- Modify: `packages/quant-engine/src/canonical/program/categories/index.ts`

**Interfaces:**
- Consumes: `ProgramEntry` from Task 3 and the matching Markdown backlog tables.
- Produces: 226 immutable entries: PRC 20, TRD 40, MOM 40, VOL 32, FLW 38, STR 32, CYC 24.

- [ ] **Step 1: Write the failing category-count/identity test**

  Parse only these seven Markdown sections in test code and assert the typed fragments have the exact same ordered IDs, names, stage, status, data codes, and view. Assert the total equals `226`.

- [ ] **Step 2: Run the test and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/program/first-category-set.test.ts`

  Expected: FAIL because category fragments do not exist.

- [ ] **Step 3: Transcribe the seven category fragments exactly**

  Do not infer or rewrite backlog fields. Use the 20 exact PRC canonical IDs from the formula matrix; leave every not-yet-reviewed category's `canonicalId` null. Record state `unimplemented` except PRC entries, which begin as `implementation` for this wave.

- [ ] **Step 4: Run the test and type-check**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/program/first-category-set.test.ts`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: both exit `0`.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/program/categories packages/quant-engine/test/program/first-category-set.test.ts
  git commit -m "feat(quant): register first indicator program categories"
  ```

### Task 5: Populate the remaining seven categories and enforce all 411 IDs

**Files:**
- Create: `packages/quant-engine/src/canonical/program/categories/quantitative.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/breadth.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/relative-intermarket.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/risk-portfolio.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/price-action.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/egypt.ts`
- Create: `packages/quant-engine/src/canonical/program/categories/ticknal-composites.ts`
- Create: `packages/quant-engine/test/program/full-program-manifest.test.ts`
- Modify: `packages/quant-engine/src/canonical/program/categories/index.ts`
- Modify: `packages/quant-engine/src/canonical/program/program-manifest.ts`

**Interfaces:**
- Consumes: Task 4 fragments and remaining Markdown tables.
- Produces: QNT 38, BRD 25, REL 20, RSK 36, PAT 20, EGY 36, TKL 10; exactly 411 unique total entries.

- [ ] **Step 1: Write the failing full-manifest test**

  Parse every Markdown table row matching a backlog ID and assert: Markdown count `411`; manifest count `411`; set equality; no duplicate backlog ID or non-null canonical ID; exactly 20 non-null canonical IDs, all belonging to PRC; prefix counts exactly `BRD 25, CYC 24, EGY 36, FLW 38, MOM 40, PAT 20, PRC 20, QNT 38, REL 20, RSK 36, STR 32, TKL 10, TRD 40, VOL 32`.

- [ ] **Step 2: Run the full-manifest test and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/program/full-program-manifest.test.ts`

  Expected: FAIL because 185 entries are absent.

- [ ] **Step 3: Transcribe remaining categories and compose the program manifest**

  Preserve `Data-gated` and `Research` truth from the Markdown backlog. Do not promote any entry because an implementation is desired.

- [ ] **Step 4: Run all program tests**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/program`

  Expected: PASS with exactly 411 unique entries.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/program packages/quant-engine/test/program
  git commit -m "feat(quant): register complete 411 indicator program"
  ```

### Task 6: Build reusable source, lag, rolling-extrema, sum, and weighted-mean primitives

**Files:**
- Create: `packages/quant-engine/src/canonical/core/series/price-source.ts`
- Create: `packages/quant-engine/src/canonical/core/series/lag.ts`
- Create: `packages/quant-engine/src/canonical/core/rolling/extrema.ts`
- Create: `packages/quant-engine/src/canonical/core/rolling/sum.ts`
- Create: `packages/quant-engine/src/canonical/core/rolling/weighted-mean.ts`
- Create: `packages/quant-engine/src/canonical/core/parameters/parse-lookback.ts`
- Create: `packages/quant-engine/test/core/series-primitives.test.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: `MarketBar` and diagnostics from Task 2.
- Produces: `getPriceSource(bar, source)`, `lagAligned(values, lookback)`, `rollingMinMax(values, lookback)`, `rollingSum(values, lookback)`, `rollingWeightedMean(values, weights, lookback)`, and `parsePositiveSafeIntegerLookback(raw, defaultValue)`.

- [ ] **Step 1: Write failing primitive tests**

  Assert exact OHLC transforms from the five-bar reference; lag alignment preserves length; rolling window `3` returns two leading nulls; invalid lookbacks `0`, negative, fractional, NaN, Infinity, and unsafe integers fail; a weighted window with total weight `0` returns null plus `NUMERIC_DIVIDE_BY_ZERO`; missing weight is not coerced to zero.

- [ ] **Step 2: Run the core tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/core/series-primitives.test.ts`

  Expected: FAIL because primitives do not exist.

- [ ] **Step 3: Implement the focused primitives**

  Use straightforward reference algorithms first. Do not optimize recurrence until benchmark evidence requires it; do not use `technicalindicators`.

- [ ] **Step 4: Run core tests and package type-check**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/core/series-primitives.test.ts`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: both exit `0`.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/core packages/quant-engine/test/core packages/quant-engine/src/canonical/index.ts
  git commit -m "feat(quant): add verified series and rolling primitives"
  ```

### Task 7: Implement PRC-001 through PRC-007 price-source indicators

**Files:**
- Create in each exact directory `packages/quant-engine/src/canonical/indicators/price-return/{close-price,open-price,high-low,hl2-median-price,hlc3-typical-price,ohlc4-average-price,weighted-close}/`: `definition.ts`, `compute.ts`, `README.md`, `index.ts`, and `<machine-id>.test.ts`

**Interfaces:**
- Consumes: Task 2 definition/executor contracts and Task 6 price-source primitive.
- Produces: Seven `TimeSeriesIndicatorDefinition` exports for PRC-001–PRC-007 with exact formulas/output keys from the matrix.

- [ ] **Step 1: Write seven failing definition/calculation tests**

  Assert IDs/version/schema, no parameters, price unit, overlay placement, no warm-up, aligned timestamps, and exact arrays: close `[105,108,114,110,115]`; open `[100,106,107,113,111]`; range `[20,11,11,9,9]`; HL2 `[100,106.5,109.5,113.5,111.5]`; HLC3 `[101.6666666667,107,111,112.3333333333,112.6666666667]`; OHLC4 `[101.25,106.75,110,112.5,112.25]`; HLCC4 `[102.5,107.25,111.75,111.75,113.25]` within `1e-10`.

- [ ] **Step 2: Run the seven indicator tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return`

  Expected: FAIL because definitions do not exist.

- [ ] **Step 3: Implement one isolated folder per indicator**

  Each README records formula, outputs, units, no-repaint status, reference URL, English explanation, and Arabic explanation. Computation files contain math only; metadata stays in definitions.

- [ ] **Step 4: Add prefix-stability assertions**

  Add to each test: compute the first three bars alone and assert those outputs equal the first three outputs from all five bars.

- [ ] **Step 5: Run all seven focused tests**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/close-price src/canonical/indicators/price-return/open-price src/canonical/indicators/price-return/high-low src/canonical/indicators/price-return/hl2-median-price src/canonical/indicators/price-return/hlc3-typical-price src/canonical/indicators/price-return/ohlc4-average-price src/canonical/indicators/price-return/weighted-close`

  Expected: all seven tests pass.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/indicators/price-return
  git commit -m "feat(quant): implement canonical price source indicators"
  ```

### Task 8: Implement PRC-008 through PRC-010 return transformations

**Files:**
- Create in each exact directory `packages/quant-engine/src/canonical/indicators/price-return/{absolute-change,percentage-change,log-return}/`: `definition.ts`, `compute.ts`, `README.md`, `index.ts`, and `<machine-id>.test.ts`

**Interfaces:**
- Consumes: Task 6 lag/lookback primitives and Task 2 executor.
- Produces: PRC-008 `change`, PRC-009 `return_pct`, and PRC-010 `log_return` definitions.

- [ ] **Step 1: Write three failing tests**

  With lookback `1`, assert absolute change `[null,3,6,-4,5]`, percent change `[null,2.8571428571,5.5555555556,-3.5087719298,4.5454545455]`, and log return `[null,0.02817087697,0.05406722127,-0.03571808260,0.04445176257]`. Assert default equals explicit `1`, lookback `2` has two leading nulls, invalid lookbacks return `invalid`, and zero/non-positive divisors return typed invalid diagnostics instead of Infinity/NaN.

- [ ] **Step 2: Run tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/absolute-change src/canonical/indicators/price-return/percentage-change src/canonical/indicators/price-return/log-return`

  Expected: FAIL.

- [ ] **Step 3: Implement the three definitions and docs**

  Percentage output unit is `percent`; log-return unit is `decimal-return`. No percentage/log transform may use absolute value or silently clamp a price.

- [ ] **Step 4: Run focused tests and type-check**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/absolute-change src/canonical/indicators/price-return/percentage-change src/canonical/indicators/price-return/log-return`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: all pass with tolerance `1e-10`.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/indicators/price-return/absolute-change packages/quant-engine/src/canonical/indicators/price-return/percentage-change packages/quant-engine/src/canonical/indicators/price-return/log-return
  git commit -m "feat(quant): implement canonical return transformations"
  ```

### Task 9: Implement PRC-011 through PRC-015 anchored and bar-range indicators

**Files:**
- Create in each exact directory `packages/quant-engine/src/canonical/indicators/price-return/{cumulative-return,gap-percentage,intrabar-return,high-low-range-percentage,true-range}/`: `definition.ts`, `compute.ts`, `README.md`, `index.ts`, and `<machine-id>.test.ts`

**Interfaces:**
- Consumes: Task 2 contracts and Task 6 source helpers.
- Produces: PRC-011–PRC-015 definitions with matrix formulas.

- [ ] **Step 1: Write five failing tests**

  Assert cumulative return from first observation `[0,2.8571428571,8.5714285714,4.7619047619,9.5238095238]`; exact anchor `2026-01-06` yields `[null,null,0,-3.5087719298,0.8771929825]`; unmatched anchor is invalid. Assert gaps `[null,0.9523809524,-0.9259259259,-0.8771929825,0.9090909091]` with directions `[null,'up','down','down','up']`; intrabar return `[5,1.8867924528,6.5420560748,-2.6548672566,3.6036036036]`; range percent `[19.0476190476,10.1851851852,9.6491228070,8.1818181818,7.8260869565]`; true range `[20,11,11,9,9]`.

- [ ] **Step 2: Run tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/cumulative-return src/canonical/indicators/price-return/gap-percentage src/canonical/indicators/price-return/intrabar-return src/canonical/indicators/price-return/high-low-range-percentage src/canonical/indicators/price-return/true-range`

  Expected: FAIL.

- [ ] **Step 3: Implement definitions, calculations, and docs**

  Preserve exact observation-time matching for an explicit anchor. Do not find a nearest date or silently move the anchor.

- [ ] **Step 4: Add invalid-price cases**

  Add assertions for zero predecessor/open/close producing typed invalid diagnostics.

- [ ] **Step 5: Run all five focused tests**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/cumulative-return src/canonical/indicators/price-return/gap-percentage src/canonical/indicators/price-return/intrabar-return src/canonical/indicators/price-return/high-low-range-percentage src/canonical/indicators/price-return/true-range`

  Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/indicators/price-return/cumulative-return packages/quant-engine/src/canonical/indicators/price-return/gap-percentage packages/quant-engine/src/canonical/indicators/price-return/intrabar-return packages/quant-engine/src/canonical/indicators/price-return/high-low-range-percentage packages/quant-engine/src/canonical/indicators/price-return/true-range
  git commit -m "feat(quant): implement anchored and bar range indicators"
  ```

### Task 10: Implement PRC-016 through PRC-019 rolling location and drawdown indicators

**Files:**
- Create in each exact directory `packages/quant-engine/src/canonical/indicators/price-return/{rolling-high-low,distance-from-high-low,drawdown-series,price-percentile-rank}/`: `definition.ts`, `compute.ts`, `README.md`, `index.ts`, and `<machine-id>.test.ts`

**Interfaces:**
- Consumes: Task 6 rolling extrema/lookback helpers.
- Produces: PRC-016–PRC-019 definitions.

- [ ] **Step 1: Write four failing tests with lookback `3`**

  Assert rolling highs `[null,null,115,118,118]`, rolling lows `[null,null,90,101,104]`; distance from high `[null,null,-0.8695652174,-6.7796610169,-2.5423728814]`; distance from low `[null,null,26.6666666667,8.9108910891,10.5769230769]`; running peak `[105,108,114,114,115]`; drawdown `[0,0,0,-3.5087719298,0]`; close percentile `[null,null,100,33.3333333333,100]`.

- [ ] **Step 2: Run tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/rolling-high-low src/canonical/indicators/price-return/distance-from-high-low src/canonical/indicators/price-return/drawdown-series src/canonical/indicators/price-return/price-percentile-rank`

  Expected: FAIL.

- [ ] **Step 3: Implement definitions, calculations, and docs**

  PRC-019 uses rolling close min/max, not high/low bars and not an empirical-count percentile. Document that exact meaning in both languages.

- [ ] **Step 4: Add zero-width and warm-up tests**

  Add assertions that a constant close window returns null for PRC-019 plus `NUMERIC_DIVIDE_BY_ZERO`, and a lookback longer than history returns an aligned all-null series plus `HISTORY_INSUFFICIENT`, not an exception.

- [ ] **Step 5: Run all four focused tests**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/rolling-high-low src/canonical/indicators/price-return/distance-from-high-low src/canonical/indicators/price-return/drawdown-series src/canonical/indicators/price-return/price-percentile-rank`

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/indicators/price-return/rolling-high-low packages/quant-engine/src/canonical/indicators/price-return/distance-from-high-low packages/quant-engine/src/canonical/indicators/price-return/drawdown-series packages/quant-engine/src/canonical/indicators/price-return/price-percentile-rank
  git commit -m "feat(quant): implement rolling price location indicators"
  ```

### Task 11: Implement PRC-020 rolling VWAP with strict volume semantics

**Files:**
- Create: `packages/quant-engine/src/canonical/indicators/price-return/rolling-vwap-source/definition.ts`
- Create: `packages/quant-engine/src/canonical/indicators/price-return/rolling-vwap-source/compute.ts`
- Create: `packages/quant-engine/src/canonical/indicators/price-return/rolling-vwap-source/README.md`
- Create: `packages/quant-engine/src/canonical/indicators/price-return/rolling-vwap-source/index.ts`
- Create: `packages/quant-engine/src/canonical/indicators/price-return/rolling-vwap-source/rolling-vwap-source.test.ts`

**Interfaces:**
- Consumes: Task 6 `rollingWeightedMean` and price-source helper.
- Produces: PRC-020 definition with `rolling_vwap`, parameters `{ lookback: number; source: 'close' | 'hl2' | 'hlc3' | 'ohlc4' }`.

- [ ] **Step 1: Write the failing reference test**

  For HLC3 and lookback `3`, assert `[null,null,106.2888888889,110.2,112.09375]`. Assert default source is HLC3/default lookback `20`, an unknown source is invalid, and no output is rounded.

- [ ] **Step 2: Write failing data-integrity tests**

  Assert field coverage `unavailable` or `partial` makes the result `unavailable` with `DATA_FIELD_MISSING`; authentic zeros remain zeros; an all-zero complete window returns null with `NUMERIC_DIVIDE_BY_ZERO`; `null` is never converted to `0`.

- [ ] **Step 3: Run tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/rolling-vwap-source/rolling-vwap-source.test.ts`

  Expected: FAIL.

- [ ] **Step 4: Implement PRC-020 and its formula distinction**

  README must state that this is a rolling window and must not be presented as session-anchored or anchored VWAP.

- [ ] **Step 5: Run the PRC-020 test and package type-check**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- src/canonical/indicators/price-return/rolling-vwap-source/rolling-vwap-source.test.ts`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: both exit `0`.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/indicators/price-return/rolling-vwap-source
  git commit -m "feat(quant): implement strict rolling VWAP source"
  ```

### Task 12: Compose the price/return registry and mark verified program progress

**Files:**
- Create: `packages/quant-engine/src/canonical/indicators/price-return/manifest.ts`
- Create: `packages/quant-engine/src/canonical/indicators/price-return/index.ts`
- Create: `packages/quant-engine/src/canonical/registry/category-registry.ts`
- Create: `packages/quant-engine/src/canonical/registry/resolve-definition.ts`
- Create: `packages/quant-engine/test/registry/price-return-registry.test.ts`
- Modify: `packages/quant-engine/src/canonical/program/categories/price-return.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: All 20 definitions and program entries.
- Produces: `PRICE_RETURN_DEFINITIONS`, composed `CANONICAL_INDICATOR_REGISTRY`, `getIndicatorDefinition(idOrBacklogId)`, and PRC program states `verified`.

- [ ] **Step 1: Write the failing registry test**

  Assert 20 definitions, unique backlog/machine IDs, one-to-one equality with PRC manifest entries, version `1.0.0`, schema `1`, required English/Arabic descriptions, documented references, valid output units/placements, and no unknown dependencies. Assert non-repainting prefix stability for every definition using the reference frame.

- [ ] **Step 2: Run the registry test and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/registry/price-return-registry.test.ts`

  Expected: FAIL because registry composition does not exist.

- [ ] **Step 3: Implement small category composition and lookup**

  Freeze registries, reject duplicate keys, and resolve by stable machine ID or backlog ID. Do not add a root file with 20 direct implementation imports; import the category manifest only.

- [ ] **Step 4: Mark PRC program entries `verified` and run all package tests**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine`

  Expected: PASS, including exact 411 manifest coverage.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/indicators/price-return packages/quant-engine/src/canonical/registry packages/quant-engine/src/canonical/program/categories/price-return.ts packages/quant-engine/src/canonical/index.ts packages/quant-engine/test/registry
  git commit -m "feat(quant): register verified price and return library"
  ```

### Task 13: Load authentic time-series frames with exact-frequency failure

**Files:**
- Create: `packages/quant-engine/src/canonical/core/aggregation/aggregate-market-bars.ts`
- Create: `packages/quant-engine/test/core/aggregate-market-bars.test.ts`
- Create: `src/lib/indicators/server/types.ts`
- Create: `src/lib/indicators/server/source-revision.ts`
- Create: `src/lib/indicators/server/load-live-time-series-frame.ts`
- Create: `src/app/api/indicators/frame/route.ts`
- Create: `_technical_support/indicator-engine-live-validation/verify-live-frame.ts`
- Create: `_technical_support/indicator-engine-performance/benchmark-price-return.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: `dailyPrices`, `intradayCandles`, `tickers`, and `priceAdjustments` through Drizzle; Task 2 frame contracts.
- Produces: `loadLiveTimeSeriesFrame(request: LiveTimeSeriesRequest): Promise<FrameLoadResult>` and GET `/api/indicators/frame?ticker=COMI&timeframe=D`, where `FrameLoadResult` is exactly `{ status: 'ok'; frame: TimeSeriesFrame } | { status: 'unavailable'; diagnostics: readonly Diagnostic[] }`.

- [ ] **Step 1: Read the required Next.js 16.3.5 route/server-client/fetching guides**

  Read the three exact documentation files named in Global Constraints before editing the route.

- [ ] **Step 2: Write failing pure aggregation tests**

  Assert weekly grouping uses Sunday-through-Saturday in `Africa/Cairo`; monthly grouping uses calendar month; open is first, high max, low min, close last, authentic volume sums only when every source observation is observed, and finality is provisional if any constituent is provisional. Missing volume remains null rather than zero.

- [ ] **Step 3: Run aggregation tests and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/core/aggregate-market-bars.test.ts`

  Expected: FAIL.

- [ ] **Step 4: Implement pure aggregation and server-only live loader**

  Exact request mapping is `D -> daily_prices`, `1H -> intraday_candles.timeframe='1h'`, `15M -> intraday_candles.timeframe='15m'`, `W/M -> explicit aggregation of daily_prices`. An empty intraday query returns `DATA_FREQUENCY_UNAVAILABLE`; there is no call to `getCachedHourlyPrices` and no daily substitution. Preserve SQL null volume, derive a SHA-256 revision from normalized rows plus applied-adjustment records, label adjustment mode `as-stored`, and record aggregation transformations.

- [ ] **Step 5: Implement the no-store route contract**

  Valid response: `{ status: 'ok', frame }`. Data absence: HTTP `422` with `{ status: 'unavailable', diagnostics }`. Invalid ticker/timeframe: HTTP `400`. Database failure: HTTP `503`. Set `Cache-Control: private, no-store`. Never return mock/sample bars.

- [ ] **Step 6: Implement and run the live validation script**

  The script requires `DATABASE_URL`, a CLI symbol, and timeframe; it exits nonzero if the source is empty, metadata/source revision is absent, validation fails, or effective timeframe differs. It also queries for a database instrument that has daily history but lacks the requested intraday frequency and proves that the loader returns `DATA_FREQUENCY_UNAVAILABLE` rather than daily rows.

  Run: `cmd /c npx tsx _technical_support/indicator-engine-live-validation/verify-live-frame.ts --symbol COMI --timeframe D`

  Expected: PASS against the configured authentic database. If no live database is configured, stop; do not replace this check with fixtures.

- [ ] **Step 7: Implement the authentic-data performance benchmark**

  Load current live histories, then enforce: all 20 PRC definitions on one ticker's full daily history complete in at most `250 ms` after loading; all 20 across every current database instrument whose `tickers.exchange = 'EGX'` and that has daily history complete in at most `30 s` with peak heap growth below `512 MB`. Record instrument/bar counts and timings. No generated bars are allowed, and no asset class is inferred from a symbol or sector label.

- [ ] **Step 8: Run package tests, live validation, and benchmark**

  Expected: pure tests pass, live validation passes, and both explicit budgets pass.

- [ ] **Step 9: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/core/aggregation packages/quant-engine/test/core/aggregate-market-bars.test.ts packages/quant-engine/src/canonical/index.ts src/lib/indicators/server src/app/api/indicators/frame/route.ts _technical_support/indicator-engine-live-validation _technical_support/indicator-engine-performance
  git commit -m "feat(indicators): add exact-frequency live market frames"
  ```

### Task 14: Integrate canonical price overlays into the chart without touching strategies

**Files:**
- Create: `packages/quant-engine/src/canonical/consumers/types.ts`
- Create: `packages/quant-engine/src/canonical/consumers/evaluate-chart-series.ts`
- Create: `packages/quant-engine/test/contracts/consumer-output.test.ts`
- Create: `src/indicators/canonical/types.ts`
- Create: `src/indicators/canonical/price-return-chart-registry.ts`
- Create: `src/indicators/canonical/execute-chart-indicator.ts`
- Create: `src/components/platform/chart/useCanonicalIndicatorFrame.ts`
- Modify: `src/components/platform/ChartWidget.tsx`
- Modify: `src/components/platform/chart/ChartIndicatorsPopover.tsx`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: Live frame route and canonical definitions PRC-001–007, PRC-016, PRC-020.
- Produces: `evaluateChartSeries(request): CanonicalConsumerResult`, nine selectable overlay indicators, generic line mapping, and visible unavailable/provisional diagnostics; existing legacy indicators and strategy behavior remain unchanged.

- [ ] **Step 1: Write the failing chart-adapter contract test in `packages/quant-engine/test/contracts/consumer-output.test.ts`**

  Define the neutral `CanonicalConsumerResult` expected by the app and assert each of the nine definitions publishes numeric overlay outputs with aligned times, execution evidence, and no chart-library types.

- [ ] **Step 2: Run the contract test and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/contracts/consumer-output.test.ts`

  Expected: FAIL until metadata/adapter shape exists.

- [ ] **Step 3: Implement the canonical chart registry and frame hook**

  The hook fetches only when a canonical indicator is active, aborts stale requests on symbol/timeframe changes, retains the server-provided provenance, and exposes `loading | ok | unavailable | error`. It never falls back to `visibleData` or cached daily bars when the canonical frame request fails.

- [ ] **Step 4: Add canonical overlay execution to the existing indicator-render effect**

  Legacy `INDICATORS` continue through their existing code. Canonical entries call `evaluateChartSeries` against the live frame, then map numeric overlay outputs to Lightweight Charts lines. No strategy imports or strategy state paths are changed.

- [ ] **Step 5: Group the nine entries under “Price & Returns / السعر والعائد” and expose state**

  Use a pure-black popover surface. Show loading, provisional, as-of, and unavailable reason text; do not draw zeroes when unavailable. Parameters use engine defaults in this vertical slice; custom controls are deferred.

- [ ] **Step 6: Run repository type-check**

  Run: `cmd /c npx tsc --noEmit`

  Expected: exits `0`.

- [ ] **Step 7: Verify chart runtime behavior**

  Verify `/charts?ticker=COMI&timeframe=D&indicators=rolling-vwap-source` draws only authentic returned values. Verify a missing exact frequency shows unavailable state, not a daily-derived line. Check browser console for hydration errors and uncaught exceptions.

- [ ] **Step 8: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/consumers packages/quant-engine/test/contracts/consumer-output.test.ts packages/quant-engine/src/canonical/index.ts src/indicators/canonical src/components/platform/chart/useCanonicalIndicatorFrame.ts src/components/platform/ChartWidget.tsx src/components/platform/chart/ChartIndicatorsPopover.tsx
  git commit -m "feat(charts): render canonical price indicators from live frames"
  ```

### Task 15: Prove chart, rule-backtest, scanner, and non-delivering alert parity

**Files:**
- Create: `packages/quant-engine/src/canonical/consumers/evaluate-rule-series.ts`
- Create: `packages/quant-engine/src/canonical/consumers/evaluate-scan-value.ts`
- Create: `packages/quant-engine/src/canonical/consumers/evaluate-alert-comparison.ts`
- Modify: `packages/quant-engine/src/canonical/consumers/types.ts`
- Create: `packages/quant-engine/test/contracts/consumer-parity.test.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`

**Interfaces:**
- Consumes: `executeTimeSeriesIndicator`, a canonical frame, definition ID/version, parameters, output key, and explicit execution context.
- Produces: `evaluateRuleSeries`, `evaluateScanValue`, and `evaluateAlertComparison`; no trade simulator and no notification delivery.

- [ ] **Step 1: Write the failing consumer-parity test**

  Evaluate PRC-009 through the chart executor, rule-series evaluator, scanner, and alert comparator. Assert every consumer carries the same execution fingerprint, definition/formula version, normalized parameters, provenance revision, and final confirmed value. Assert an alert on a provisional latest bar returns `not-evaluable`, not match/no-match.

- [ ] **Step 2: Run the parity test and verify failure**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine -- test/contracts/consumer-parity.test.ts`

  Expected: FAIL because consumer adapters do not exist.

- [ ] **Step 3: Implement thin consumers without duplicating formulas**

  `evaluateRuleSeries` returns the canonical aligned output; `evaluateScanValue` returns the most recent confirmed non-null scalar plus source evidence; `evaluateAlertComparison` supports only explicit numeric operators `gt | gte | lt | lte | eq-within-tolerance` in Wave A and never sends a notification.

- [ ] **Step 4: Run parity tests and full package suite**

  Expected: PASS. Search these consumer files and confirm no indicator formula is present.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/quant-engine/src/canonical/consumers packages/quant-engine/test/contracts/consumer-parity.test.ts packages/quant-engine/src/canonical/index.ts
  git commit -m "feat(quant): add canonical indicator consumer contracts"
  ```

### Task 16: Complete Wave A verification and protected-strategy audit

**Files:**
- Entire Wave A change set
- Modify only if verification exposes a defect: the file that owns that defect

**Interfaces:**
- Consumes: Tasks 1–15.
- Produces: Evidence that Wave A is green, live-data-backed, mathematically verified, and strategy-isolated.

- [ ] **Step 1: Run every canonical test and package type-check**

  Run: `cmd /c npm test --workspace @ticknal/quant-engine`

  Run: `cmd /c npm run type-check --workspace @ticknal/quant-engine`

  Expected: both exit `0`; manifest reports exactly 411 unique IDs and registry reports 20 verified PRC definitions.

- [ ] **Step 2: Run repository type-check and production build**

  Run: `cmd /c npx tsc --noEmit`

  Run: `cmd /c npm run build`

  Expected: both exit `0` with no warnings that indicate broken routes or client/server boundaries.

- [ ] **Step 3: Run authentic live-data and performance checks**

  Run: `cmd /c npx tsx _technical_support/indicator-engine-live-validation/verify-live-frame.ts --symbol COMI --timeframe D`

  Run: `cmd /c npx tsx _technical_support/indicator-engine-performance/benchmark-price-return.ts`

  Expected: exact frequency, provenance, validation, timing, and memory gates all pass.

- [ ] **Step 4: Verify endpoint and page runtime health**

  Run: `cmd /c npm start` in a retained terminal session.

  Request a valid daily frame, the unavailable exact-intraday case found by the live validator, an invalid timeframe, and `/charts?ticker=COMI&timeframe=D&indicators=rolling-vwap-source`. Expected statuses are 200/422/400 as applicable; no request returns 500; the chart has no hydration mismatch, console error, undefined access, or uncaught rejection.

- [ ] **Step 5: Audit protected strategy paths**

  Run: `git diff --exit-code main...HEAD -- src/strategies packages/quant-engine/src/strategies`

  Expected: no output and exit `0`. Also confirm no Wave A commit names a protected strategy path.

- [ ] **Step 6: Audit production code for test-data or fallback imports**

  Confirm no file under `packages/quant-engine/src/canonical`, `src/lib/indicators`, `src/indicators/canonical`, or `src/app/api/indicators` imports from `test`, `_technical_support`, fixtures, generators, or legacy data-cache fallbacks.

- [ ] **Step 7: Request code review using the required review skill**

  Review mathematical formulas, provenance/frequency guarantees, registry modularity, consumer parity, UI unavailable states, and strategy-path isolation. Fix every confirmed issue and repeat Steps 1–6.

- [ ] **Step 8: Commit verification fixes, if any**

  ```bash
  git add <only-files-changed-to-fix-verified-defects>
  git commit -m "fix(quant): close Wave A verification findings"
  ```

---

## Wave A exit state

When every checkbox is complete, Ticknal has:

- a dependency-clean canonical engine entry;
- a machine-enforced modular manifest for all 411 backlog IDs;
- 20 implemented and independently verified Price and Return indicators;
- exact-frequency authentic database frames with provenance and no mock/fallback path;
- nine live chart overlays as the first user-facing slice;
- reusable parity-safe rule, scanner, and alert-evaluation contracts;
- unchanged HYDRA, PSI, and PSI V2 strategy trees.

This is not completion of the 411-indicator objective. It is the verified Wave A foundation on which the remaining category waves are implemented without formula duplication or data fabrication.
