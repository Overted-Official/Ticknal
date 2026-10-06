# Official Macro Pipeline and Indicators Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ingest revision-safe official macro data on a scheduled basis and make nine macro-dependent canonical indicators operational on Ticknal charts.

**Architecture:** Add a long-form `macro_observations` store and focused official-source adapters behind one synchronization coordinator. Extend contextual indicator execution with publication-aware macro series, then implement each formula in its existing dedicated `logic.ts` module and register the nine indicators only after their data and numerical tests pass.

**Tech Stack:** Next.js 16.3 Route Handlers, TypeScript, Drizzle ORM/PostgreSQL, Vitest, Vercel Cron, official CBE HTTP sources, BLS Public Data API.

**Spec:** `docs/superpowers/specs/2026-10-06-official-macro-pipeline-design.md`

## Global Constraints

- Do not modify files under `src/strategies/` or `packages/quant-engine/src/strategies/`.
- Keep one dedicated `logic.ts` file per indicator; do not create a macro-indicator monolith.
- Never expose an observation to a historical bar before its official `published_at` timestamp.
- Never substitute hardcoded macro values in canonical indicator calculations.
- Preserve source revisions and make routine synchronization idempotent.
- Keep `macro_inflation_rates` readable as a compatibility projection while canonical calculations use `macro_observations`.
- Use the existing authenticated `/api/cron/update-macro` route and Next.js 16 Route Handler semantics.
- Put any non-product diagnostic script under `_technical_support/`; the official backfill command is product tooling and belongs under `scripts/fetch/`.
- Work in the existing shared V3 checkout because the indicator engine is currently uncommitted there. Do not stage or commit task files; the user explicitly deferred Git-history cleanup, and overlapping pre-existing edits must remain untouched.

## Review Focus

- A CBE page returns HTTP 200 with a “Request Rejected” body: the adapter must reject it and the coordinator must report that source as failed without writing observations.
- CBE revises an already stored month: the old vintage must remain queryable and the new vintage must become the only `is_latest` row.
- Two observations share a reference date but different publication times: a historical chart must receive only the vintage available at each bar time.
- One official source fails while four succeed: the cron response must be partial success, write the successful observations, and never return an unhandled 500 solely for the failed source.
- A macro series is missing or stale: the chart indicator must return a specific unavailable diagnostic rather than zeros, NaNs, or fallback values.

---

### Task 1: Canonical macro contracts, schema, and revision-safe persistence

**Files:**
- Create: `src/lib/macro/contracts.ts`
- Create: `src/lib/macro/series-registry.ts`
- Create: `src/lib/macro/observation-store.ts`
- Create: `src/lib/macro/observation-store.test.ts`
- Create: `src/db/migrations/0017_macro_observations.sql`
- Modify: `src/db/schema.ts`

**Interfaces:**
- Produces: `MacroSeriesCode`, `MacroObservationCandidate`, `StoredMacroObservation`, `MacroObservationStore`, `persistMacroObservationBatch(store, candidates, retrievedAt): Promise<MacroPersistReport>`.
- Produces: `MACRO_SERIES_REGISTRY` with canonical units, source ownership, and an optional maximum publication lag for every series named in the spec.

- [ ] **Step 1: Write failing contract and persistence tests**

Add tests named:

- `accepts only registered finite macro observations`
- `does not duplicate an unchanged source revision`
- `preserves the old vintage and promotes a changed revision`
- `rejects a missing publication timestamp`

Use an in-memory `MacroObservationStore` fake. Assert exact inserted/revised/unchanged/rejected counts and one latest vintage per `(seriesCode, observationDate)`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run src/lib/macro/observation-store.test.ts`

Expected: FAIL because the macro contracts and persistence functions do not exist.

- [ ] **Step 3: Add schema and migration**

Define `macroObservations` in `src/db/schema.ts` with the columns and unique key from the spec. Add indexes for `(series_code, observation_date)`, `published_at`, and `is_latest`. The migration must enable RLS, permit public read access, and restrict writes to the service role following existing macro-table policy patterns.

- [ ] **Step 4: Implement the contracts, registry, and store algorithm**

Implement:

```ts
export async function persistMacroObservationBatch(
  store: MacroObservationStore,
  candidates: readonly MacroObservationCandidate[],
  retrievedAt: string,
): Promise<MacroPersistReport>
```

Validate before writes, calculate deterministic source revisions when the adapter did not provide one, and use one store transaction per accepted batch.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npx vitest run src/lib/macro/observation-store.test.ts`

Expected: PASS, 4 tests and 0 failures.

- [ ] **Step 6: Checkpoint Task 1 files without staging**

```powershell
git status --short -- src/lib/macro src/db/migrations/0017_macro_observations.sql src/db/schema.ts
```

Expected: only the Task 1 paths plus any documented pre-existing `src/db/schema.ts` edit; nothing is staged.

### Task 2: Focused official-source adapters

**Files:**
- Create: `src/lib/macro/http/cbe-request.ts`
- Create: `src/lib/macro/sources/bls-cpi.ts`
- Create: `src/lib/macro/sources/cbe-inflation.ts`
- Create: `src/lib/macro/sources/cbe-policy-rates.ts`
- Create: `src/lib/macro/sources/cbe-reserves.ts`
- Create: `src/lib/macro/sources/cbe-tbill-yields.ts`
- Create: `src/lib/macro/sources/source-adapters.test.ts`

**Interfaces:**
- Consumes: `MacroObservationCandidate`, `MacroSeriesCode` from Task 1.
- Produces: `MacroSourceAdapter` implementations with `sourceId` and `fetch(options): Promise<readonly MacroObservationCandidate[]>`.
- Produces pure parser functions for CBE HTML/API responses and BLS JSON responses.

- [ ] **Step 1: Write failing parser tests with minimal inline fixtures**

Cover:

- BLS monthly CPI index values and derived YoY values.
- CBE headline/core CPI values with their reference and publication dates.
- CBE policy-rate cards and effective date.
- CBE reserves amount and reference month.
- CBE 3-, 6-, 9-, and 12-month weighted-average T-bill yields.
- An HTTP 200 “Request Rejected” body.
- A malformed table with no finite observations.

Assertions must use the exact canonical series codes and units from Task 1.

- [ ] **Step 2: Run the source tests and verify RED**

Run: `npx vitest run src/lib/macro/sources/source-adapters.test.ts`

Expected: FAIL because the adapter modules do not exist.

- [ ] **Step 3: Implement the shared CBE request helper**

Implement `fetchCbeDocument(url: string, init?: RequestInit): Promise<string>` with the browser-compatible headers already proven necessary by the existing scraper. Reject known request-rejection bodies, non-2xx responses, and empty documents.

- [ ] **Step 4: Implement one adapter per official source**

Keep network retrieval separate from pure parsing. Use the CBE historical/statistical endpoints discovered from official page metadata and the BLS API for U.S. CPI. Do not import the database in any adapter.

- [ ] **Step 5: Run the source tests and verify GREEN**

Run: `npx vitest run src/lib/macro/sources/source-adapters.test.ts`

Expected: PASS with all fixture cases and 0 failures.

- [ ] **Step 6: Checkpoint Task 2 files without staging**

```powershell
git status --short -- src/lib/macro/http src/lib/macro/sources
```

Expected: only the Task 2 adapter paths; nothing is staged.

### Task 3: Synchronization coordinator, compatibility projection, backfill, and cron

**Files:**
- Create: `src/lib/macro/postgres-observation-store.ts`
- Create: `src/lib/macro/sync-official-macro.ts`
- Create: `src/lib/macro/sync-official-macro.test.ts`
- Create: `scripts/fetch/backfill_official_macro.ts`
- Modify: `src/lib/finance/cbe-inflation.ts`
- Modify: `src/lib/handlers/cron-handlers.ts`
- Modify: `src/lib/handlers/market-handlers.ts`
- Modify: `src/app/(main)/home/page.tsx`
- Modify: `src/components/platform/home/HomePageView.tsx`
- Modify: `src/components/platform/home/investments/performance/PerformanceOverviewSection.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/PerformanceKPIRails.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/NetWorthKPIRail.tsx`
- Modify: `vercel.json`

**Interfaces:**
- Consumes: source adapters and persistence interfaces from Tasks 1–2.
- Produces: `syncOfficialMacroData(dependencies?): Promise<MacroSyncReport>` and a CLI-callable `backfillOfficialMacroData(range): Promise<MacroSyncReport>`.
- Preserves: `syncAllMacroInflation`, `getLatestInflationRate`, `getLatestUsCpiRate`, and `getHistoricalInflationSeries` as compatibility APIs backed by official observations/projections.

- [ ] **Step 1: Write failing coordinator tests**

Add tests named:

- `persists successful adapters when one source fails`
- `reports rejected observations without throwing an unhandled error`
- `projects current CPI observations to the legacy inflation shape`
- `marks an all-source failure as failed rather than successful`

Inject fake adapters and an in-memory store. Assert explicit per-source statuses and aggregate counts.

- [ ] **Step 2: Run the coordinator tests and verify RED**

Run: `npx vitest run src/lib/macro/sync-official-macro.test.ts`

Expected: FAIL because the coordinator does not exist.

- [ ] **Step 3: Implement the PostgreSQL store and coordinator**

Use Drizzle transactions for vintage promotion. Run adapters with `Promise.allSettled`, persist each successful source independently, and return `success`, `partial`, or `failed` with per-source errors.

- [ ] **Step 4: Add compatibility projection and remove fabricated getter fallbacks**

Keep the legacy inflation table and APIs usable. Change unavailable latest rates to `null`; update the home and KPI prop chain to show an explicit unavailable state rather than defaulting to `14.9` or `2.8`.

- [ ] **Step 5: Wire the existing cron and backfill tool**

Have `handleUpdateMacro` run the official macro coordinator plus the existing M0/M1/M2 sync. Keep authenticated routing unchanged, return the per-source report, log partial failures, and change the Vercel macro schedule from monthly to daily. The backfill script accepts explicit `--from` and `--to` ISO dates and never runs from the routine cron.

- [ ] **Step 6: Run coordinator tests and type-check the touched application files**

Run: `npx vitest run src/lib/macro/sync-official-macro.test.ts`

Expected: PASS, 4 tests and 0 failures.

Run: `npx tsc --noEmit`

Expected: exit code 0.

- [ ] **Step 7: Checkpoint Task 3 files without staging**

```powershell
git status --short -- src/lib/macro scripts/fetch/backfill_official_macro.ts src/lib/finance/cbe-inflation.ts src/lib/handlers/cron-handlers.ts src/lib/handlers/market-handlers.ts 'src/app/(main)/home/page.tsx' src/components/platform/home/HomePageView.tsx src/components/platform/home/investments/performance/PerformanceOverviewSection.tsx src/components/platform/home/investments/performance/kpi-rails/PerformanceKPIRails.tsx src/components/platform/home/investments/performance/kpi-rails/NetWorthKPIRail.tsx vercel.json
```

Expected: the Task 3 paths are visible and nothing is staged.

### Task 4: Publication-aware contextual macro loading

**Files:**
- Create: `src/lib/indicators/server/load-macro-series.ts`
- Create: `src/lib/indicators/server/load-macro-series.test.ts`
- Modify: `src/lib/indicators/server/published-macro-alignment.ts`
- Modify: `src/lib/indicators/server/published-macro-alignment.test.ts`
- Modify: `src/lib/indicators/server/evaluate-contextual-indicators.ts`
- Modify: `src/lib/indicators/server/load-contextual-indicator-inputs.ts`
- Modify: `src/components/platform/chart/canonical/contextual-execution.test.ts`

**Interfaces:**
- Consumes: latest-vintage observations from Task 1.
- Produces: `loadMacroSeries(primaryFrame, role, seriesCode): Promise<NumericSeriesFrame | null>`.
- Extends: `SelectionRequirements` with `macro: readonly { role: string; seriesCode: MacroSeriesCode }[]` and `ContextualIndicatorLoaders.loadMacroSeries`.

- [ ] **Step 1: Write failing alignment and requirement-planning tests**

Test that a revision is invisible before `publishedAt` and visible afterward. Test the exact role map:

- `REL-020`: `egyptCpiIndex`
- `EGY-017`: `egyptCpiIndex`, `usCpiIndex`, `usdEgp`
- `EGY-018`: `usdEgp`, `m2`, `egyptHeadlineInflationYoY`, `cbePolicyRate`, `netInternationalReserves`
- `EGY-024`: `gold`, `usdEgp`, `egyptCpiIndex`
- `EGY-025`: `cbePolicyRate`, `egyptHeadlineInflationYoY`
- `EGY-026`: `treasury3mYield`, `treasury12mYield`
- `EGY-027`: `egyptCpiIndex`
- `EGY-028`: `egyptCpiIndex`
- `EGY-036`: `egyptCpiIndex`

Also test that one missing macro role produces `DATA_CAPABILITY_MISSING` and never a zero-filled successful execution. Test that a CPI or Treasury series beyond its registry publication-lag allowance is omitted by the loader and produces the same unavailable path; event-driven policy rates remain valid until superseded.

- [ ] **Step 2: Run the contextual tests and verify RED**

Run: `npx vitest run src/lib/indicators/server/load-macro-series.test.ts src/lib/indicators/server/published-macro-alignment.test.ts src/components/platform/chart/canonical/contextual-execution.test.ts`

Expected: FAIL on missing macro loader and requirement roles.

- [ ] **Step 3: Implement publication-aware alignment and loader**

Query only latest vintages for normal execution, but align by `publishedAt`, not ingestion time. Construct provenance using series code plus the ordered latest source revisions.

- [ ] **Step 4: Extend contextual requirement planning and execution**

Load each required macro series once per request, deduplicated by series code, then expose it under the requested role in `IndicatorInputBundle.seriesByRole`.

- [ ] **Step 5: Run the contextual tests and verify GREEN**

Run the command from Step 2.

Expected: PASS with 0 failures.

- [ ] **Step 6: Checkpoint Task 4 files without staging**

```powershell
git status --short -- src/lib/indicators/server/load-macro-series.ts src/lib/indicators/server/load-macro-series.test.ts src/lib/indicators/server/published-macro-alignment.ts src/lib/indicators/server/published-macro-alignment.test.ts src/lib/indicators/server/evaluate-contextual-indicators.ts src/lib/indicators/server/load-contextual-indicator-inputs.ts src/components/platform/chart/canonical/contextual-execution.test.ts
```

Expected: the Task 4 paths are visible and nothing is staged.

### Task 5: CPI and real-return indicator formulas

**Files:**
- Create: `packages/quant-engine/test/references/official-macro-inflation.test.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/relative-intermarket/relative-inflation-adjusted-return/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-inflation-momentum/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-real-equity-return/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-egp-purchasing-power-index/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/relative-intermarket/definitions.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/definitions.ts`

**Interfaces:**
- Consumes: `egyptCpiIndex` contextual numeric series.
- Produces: operational calculations for `REL-020`, `EGY-027`, `EGY-028`, and `EGY-036` in their dedicated modules.

- [ ] **Step 1: Write failing numerical reference tests**

Use a deterministic monthly frame where CPI moves from 100 to 110 and price moves from 100 to 121. Assert:

- Fisher real return is 10%, not the approximate 11% subtraction result.
- purchasing power is 100 at the base and `90.909...` at CPI 110.
- purchasing-power loss is `9.0909...%`.
- inflation momentum returns the derived MoM/YoY rates and annual-rate acceleration.
- real drawdown is computed from the deflated wealth index.

- [ ] **Step 2: Run the reference test and verify RED**

Run: `npx vitest run --config packages/quant-engine/vitest.config.ts packages/quant-engine/test/references/official-macro-inflation.test.ts`

Expected: FAIL because the four logic modules return null arrays.

- [ ] **Step 3: Implement one formula per existing logic module**

Use calendar-aware lags from the category shared helpers. Add only the parameters needed to make lookback periods explicit; keep definitions declarative and require `egyptCpiIndex`.

- [ ] **Step 4: Run the reference test and verify GREEN**

Run the command from Step 2.

Expected: PASS with all four indicator cases and 0 failures.

- [ ] **Step 5: Checkpoint Task 5 files without staging**

```powershell
git status --short -- packages/quant-engine/test/references/official-macro-inflation.test.ts packages/quant-engine/src/canonical/indicators/relative-intermarket/relative-inflation-adjusted-return/logic.ts packages/quant-engine/src/canonical/indicators/relative-intermarket/definitions.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-inflation-momentum/logic.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-real-equity-return/logic.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-egp-purchasing-power-index/logic.ts packages/quant-engine/src/canonical/indicators/egypt/definitions.ts
```

Expected: the Task 5 paths are visible and nothing is staged.

### Task 6: PPP, policy-rate, yield-curve, and gold-hedge formulas

**Files:**
- Create: `packages/quant-engine/test/references/official-macro-market.test.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-real-usd-egp-fair-value/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-gold-versus-egp-hedge-effectiveness/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-cbe-policy-rate/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-yield-curve-slope/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/definitions.ts`

**Interfaces:**
- Consumes: `egyptCpiIndex`, `usCpiIndex`, `usdEgp`, `gold`, `cbePolicyRate`, `egyptHeadlineInflationYoY`, `treasury3mYield`, and `treasury12mYield`.
- Produces: operational calculations for `EGY-017`, `EGY-024`, `EGY-025`, and `EGY-026`.

- [ ] **Step 1: Write failing numerical reference tests**

Assert:

- PPP fair FX follows `baseFx × Egypt CPI ratio ÷ US CPI ratio` and misvaluation is spot versus fair.
- policy nominal 20% with inflation 15% produces real rate 5% and decision changes appear only on rate-change bars.
- 12-month yield 24% minus 3-month yield 22% produces a +2 percentage-point normal curve; the reverse is inverted.
- local gold uses `goldUsdPerOunce × usdEgp ÷ 31.1034768`, and its real return uses CPI deflation.
- missing required roles make each definition unavailable rather than producing partial numbers.

- [ ] **Step 2: Run the reference test and verify RED**

Run: `npx vitest run --config packages/quant-engine/vitest.config.ts packages/quant-engine/test/references/official-macro-market.test.ts`

Expected: FAIL because the four logic modules return null arrays.

- [ ] **Step 3: Implement each formula in its dedicated logic module**

Use first-common-observation baselines for PPP, explicit rolling calendar windows for hedge statistics, and category output strings `normal`, `flat`, and `inverted` for the curve state.

- [ ] **Step 4: Run the reference test and verify GREEN**

Run the command from Step 2.

Expected: PASS with all four indicator cases and 0 failures.

- [ ] **Step 5: Checkpoint Task 6 files without staging**

```powershell
git status --short -- packages/quant-engine/test/references/official-macro-market.test.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-real-usd-egp-fair-value/logic.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-gold-versus-egp-hedge-effectiveness/logic.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-cbe-policy-rate/logic.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-yield-curve-slope/logic.ts packages/quant-engine/src/canonical/indicators/egypt/definitions.ts
```

Expected: the Task 6 paths are visible and nothing is staged.

### Task 7: FX devaluation risk and operational registration

**Files:**
- Create: `packages/quant-engine/test/references/official-macro-fx-risk.test.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/egypt-fx-devaluation-risk/logic.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/egypt/definitions.ts`
- Modify: `packages/quant-engine/src/canonical/indicators/relative-intermarket/definitions.ts`
- Modify: `packages/quant-engine/test/registry/current-data-operational-boundary.test.ts`
- Modify: `docs/product/indicator-library-backlog.md`
- Modify: `docs/product/indicator-data-requirements.md`

**Interfaces:**
- Consumes: `usdEgp`, `m2`, `egyptHeadlineInflationYoY`, `cbePolicyRate`, and `netInternationalReserves`.
- Produces: version-one 0–100 FX risk score, `low`/`moderate`/`high` state, elevated-driver count, and nine newly operational definitions.

- [ ] **Step 1: Write failing FX-risk and registry tests**

Pin these version-one component thresholds:

- 3-month FX depreciation: 0 points at 0%, 100 points at 20%.
- headline inflation: 0 points at 5%, 100 points at 30%.
- M2 YoY growth: 0 points at 5%, 100 points at 35%.
- reserve YoY change: 0 points at 0% or better, 100 points at -20%.
- real policy rate: 0 points at +5% or better, 100 points at -10%.

Clamp linearly between thresholds and average all five components equally. Assert `< 34 = low`, `34–66 = moderate`, and `> 66 = high`. Assert the indicator is unavailable when any component is absent.

Update the registry test to expect 359 operational and 52 data-gated indicators, with all nine backlog IDs operational.

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx vitest run --config packages/quant-engine/vitest.config.ts packages/quant-engine/test/references/official-macro-fx-risk.test.ts packages/quant-engine/test/registry/current-data-operational-boundary.test.ts`

Expected: FAIL because FX risk is empty and the operational count is still 350.

- [ ] **Step 3: Implement FX risk and register all nine indicators**

Keep every component calculation named and inspectable in the dedicated FX-risk module. Replace unconditional unavailable capabilities with required contextual roles, then add the nine backlog IDs to the appropriate operational sets.

- [ ] **Step 4: Update product documentation**

Mark the nine indicators implemented, record their canonical data roles, and change the remaining data-gated count from 61 to 52 without changing the protected-strategy scope.

- [ ] **Step 5: Run the focused tests and full quant-engine suite**

Run the command from Step 2.

Expected: PASS with 0 failures.

Run: `npm run test --workspace @ticknal/quant-engine`

Expected: exit code 0 and 0 failed tests.

- [ ] **Step 6: Checkpoint Task 7 files without staging**

```powershell
git status --short -- packages/quant-engine/test/references/official-macro-fx-risk.test.ts packages/quant-engine/src/canonical/indicators/egypt/egypt-fx-devaluation-risk/logic.ts packages/quant-engine/src/canonical/indicators/egypt/definitions.ts packages/quant-engine/src/canonical/indicators/relative-intermarket/definitions.ts packages/quant-engine/test/registry/current-data-operational-boundary.test.ts docs/product/indicator-library-backlog.md docs/product/indicator-data-requirements.md
```

Expected: the Task 7 paths are visible and nothing is staged.

### Task 8: Full verification and runtime health

**Files:**
- Modify only files required to repair verification failures introduced by Tasks 1–7.

**Interfaces:**
- Consumes: the complete macro pipeline and indicator set.
- Produces: verified build, type-check, tests, and runtime evidence.

- [ ] **Step 1: Verify no protected strategy file changed**

Run: `git diff --name-only -- src/strategies packages/quant-engine/src/strategies; git status --short -- src/strategies packages/quant-engine/src/strategies`

Expected: no output.

- [ ] **Step 2: Run the macro and contextual application tests**

Run: `npx vitest run src/lib/macro src/lib/indicators/server src/components/platform/chart/canonical/contextual-execution.test.ts`

Expected: exit code 0 and 0 failed tests.

- [ ] **Step 3: Run the full quant-engine test suite**

Run: `npm run test --workspace @ticknal/quant-engine`

Expected: exit code 0 and 0 failed tests.

- [ ] **Step 4: Run the required type-check and production build**

Run: `npx tsc --noEmit`

Expected: exit code 0.

Run: `npm run build`

Expected: exit code 0 with no build errors.

- [ ] **Step 5: Verify runtime/API health**

Start the production server with the built output. Request `/api/cron/update-macro` without credentials and confirm the documented authorization response, then request it with the configured cron secret against a reachable test database. Confirm no 500, no uncaught promise rejection, a per-source sync report, and a `cron-macro` system log. Load the charts page with one CPI-backed indicator and confirm no hydration error, undefined exception, or console error.

- [ ] **Step 6: Run final diff checks**

Run: `git diff --check`

Expected: no whitespace errors.

Keep all verified implementation changes unstaged in the shared V3 checkout for the user's later repository-wide commit.
