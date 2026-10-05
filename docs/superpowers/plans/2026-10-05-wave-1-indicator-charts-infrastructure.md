# Wave 1 Indicator Charts Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the nine-indicator hard-coded chart path with registry-driven discovery, configuration, persistence, and rendering for all 20 verified Price and Return indicators while establishing reusable overlay, pane, market, and metric surfaces for the remaining 391.

**Architecture:** The quant engine owns a typed presentation registry alongside its formula registry. The application stores versioned indicator instances, executes each instance once through the canonical chart consumer, then routes neutral visual outputs to an overlay controller, synchronized pane host, market drawer, or metrics dock. The browser reads the complete 411-entry program manifest, enables only integrated definitions, and preserves the existing advanced-indicator path during migration.

**Tech Stack:** TypeScript 5, Next.js 16.3 App Router, React 19.2, Lightweight Charts 5.2, Vitest 4.1, Playwright 1.63, Tailwind CSS 4.

**Spec:** `docs/superpowers/specs/2026-10-05-complete-411-indicator-library-design.md`

## Global Constraints

- Do not edit any file under `src/strategies/**` or `packages/quant-engine/src/strategies/**`; compare both trees against commit `baefa1b` at the final gate.
- Before editing Next.js components, read `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-search-params.md`.
- Before UI work, invoke and follow `.agents/skills/ticknal-tv-design/SKILL.md`; before implementation, invoke and follow `.agents/skills/test-driven-development/SKILL.md`.
- Put every new test, smoke script, fixture, or test configuration under `_technical_support/indicator-wave-1/`; do not create scratch or test files elsewhere.
- Main widgets and drawers use transparent or `#000000` surfaces, square drawer edges, neutral hairline borders, sans-serif text, and `tabular-nums`; no gray/navy panel fills and no `font-mono`.
- Never replace unavailable inputs with zeroes, generated values, a different frequency, or current data presented as point-in-time data.
- Preserve current legacy advanced indicators, HYDRA panel, Smart Money panel, chart orders, signals, and prediction behavior during canonical migration.
- A canonical indicator instance persists `instanceId`, `definitionId`, `formulaVersion`, normalized parameters, visible outputs, placement overrides, and order.
- Wave 1 ends with all 20 Price and Return entries in `integrated` state; the other 391 remain visible but disabled and retain their truthful program states.
- Reuse the existing authentic-data budgets: all 20 Price/Return definitions on one loaded instrument in at most `250 ms`; the current EGX universe in at most `30 s`; peak heap growth below `512 MB`.

## Review Focus

- A malformed or stale `ci` URL payload must not crash Charts; valid instances survive, invalid instances are rejected with a parse issue, and legacy `indicators=` links migrate safely (Task 3 tests).
- Switching symbol or timeframe while a frame request is in flight must never display results from the prior request (Task 4 tests and Task 8 runtime smoke).
- A mixed-placement result such as Drawdown must execute once while its peak renders on the price chart and its drawdown renders in a synchronized pane (Tasks 2 and 5 tests).
- Removing, collapsing, resizing, or reordering multiple panes must release chart subscriptions and keep the remaining panes synchronized without feedback loops (Task 5 tests and Task 8 runtime smoke).
- All 391 unimplemented entries must remain searchable and visibly disabled in English and Arabic contexts; none may become activatable through forged URL state (Tasks 3 and 6 tests).

---

### Task 1: Canonical presentation contracts and Price/Return registry

**Files:**
- Create: `packages/quant-engine/src/canonical/contracts/presentation.ts`
- Create: `packages/quant-engine/src/canonical/indicators/price-return/presentation.ts`
- Create: `packages/quant-engine/src/canonical/registry/presentation-registry.ts`
- Modify: `packages/quant-engine/src/canonical/contracts/index.ts`
- Modify: `packages/quant-engine/src/canonical/index.ts`
- Create: `_technical_support/indicator-wave-1/vitest.config.ts`
- Create: `_technical_support/indicator-wave-1/presentation-registry.test.ts`

**Interfaces:**
- Produces: `LocalizedText`, `IndicatorParameterDefinition`, `IndicatorVisualDescriptor`, `IndicatorReferenceLevel`, and `CanonicalIndicatorCatalogEntry` from `contracts/presentation.ts`.
- Produces: `composePresentationRegistry(entries, definitions)`, `CANONICAL_PRESENTATION_REGISTRY`, `getIndicatorCatalogEntry(idOrBacklogId)`, and `listIndicatorCatalogEntries()` from `registry/presentation-registry.ts`.
- Contract: the registry contains exactly the 20 Price/Return definitions and validates definition identity, formula version, default parameters, output keys, and visual coverage at module construction.

- [ ] **Step 1: Create the support Vitest configuration and failing registry tests**

  Configure Node environment, alias `@` to `src`, alias `@ticknal/quant-engine/canonical` to the canonical source entry, and include only `_technical_support/indicator-wave-1/**/*.test.ts`. Add tests named:

  ```ts
  it('registers exactly one presentation entry for every Price/Return definition')
  it('covers every output key with a visual or explicit legend-only descriptor')
  it('publishes bilingual names and valid defaults for all 20 entries')
  it('rejects an unknown output key, duplicate identity, and invalid default parameters')
  ```

  Assert registry length `20`, unique backlog/canonical IDs, successful `definition.parseParameters(entry.defaultParameters)`, and non-empty English/Arabic names and descriptions.

- [ ] **Step 2: Run the tests and verify the missing-contract failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/presentation-registry.test.ts`

  Expected: FAIL because the presentation contracts and registry do not exist.

- [ ] **Step 3: Implement the presentation types**

  Define these discriminants without React or Lightweight Charts imports:

  ```ts
  type IndicatorParameterDefinition =
    | { kind: 'integer'; key: string; label: LocalizedText; defaultValue: number; min: number; max: number; step: number }
    | { kind: 'select'; key: string; label: LocalizedText; defaultValue: string; options: readonly { value: string; label: LocalizedText }[] }
    | { kind: 'anchor-date'; key: string; label: LocalizedText; defaultValue: 'first-observation'; allowFirstObservation: true };

  type IndicatorVisualDescriptor = {
    outputKey: string;
    surface: 'overlay' | 'pane' | 'market' | 'card' | 'legend';
    allowedSurfaces?: readonly ('overlay' | 'pane')[];
    renderer: 'line' | 'area' | 'histogram' | 'band' | 'marker' | 'state-region' | 'value' | 'category' | 'ranked-table' | 'distribution';
    colorRole: 'primary' | 'secondary' | 'positive' | 'negative' | 'warning' | 'muted';
    lineWidth?: 1 | 2 | 3 | 4;
    paneGroup?: string;
    referenceLevels?: readonly IndicatorReferenceLevel[];
  };
  ```

  `CanonicalIndicatorCatalogEntry` pins backlog ID, definition ID, formula version, category, localized copy, tags, parameter schemas, output definitions, visual descriptors, required fields, and minimum history.

- [ ] **Step 4: Implement the 20-entry Price/Return presentation registry**

  Use definition descriptions as the bilingual description source. Add exact Arabic names in PRC order: `سعر الإغلاق`, `سعر الافتتاح`, `أعلى وأدنى سعر`, `السعر الوسيط HL2`, `السعر النموذجي HLC3`, `متوسط السعر OHLC4`, `الإغلاق المرجّح`, `التغير المطلق`, `التغير النسبي`, `العائد اللوغاريتمي`, `العائد التراكمي`, `فجوة السعر`, `العائد داخل الفترة`, `نسبة نطاق الأعلى والأدنى`, `النطاق الحقيقي`, `أعلى وأدنى متحرك`, `المسافة من الأعلى والأدنى`, `سلسلة التراجع`, `الترتيب المئوي للسعر`, and `متوسط السعر المتحرك المرجّح بالحجم`.

  Parameter schemas:

  - PRC-008, 009, and 010: integer `lookback`, default `1`, range `1..5000`, step `1`.
  - PRC-016, 017, and 019: integer `lookback`, default `20`, range `1..5000`, step `1`.
  - PRC-011: `anchor-date`, default `first-observation`.
  - PRC-020: integer `lookback` as above plus select `source` with `close`, `hl2`, `hlc3`, and `ohlc4`.
  - All others: no parameters.

  Route price-like outputs to overlay lines; return/change outputs to pane lines or zero-baseline histograms; `high-low.range` and `gap-percentage.direction` to legend-only values; `drawdown-series.peak` to overlay and `drawdown_pct` to pane; percentile rank to a pane with reference levels at `20` and `80`.

- [ ] **Step 5: Run registry and package tests**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/presentation-registry.test.ts`

  Run: `npm.cmd --workspace @ticknal/quant-engine test`

  Expected: both PASS; existing formula outputs are unchanged.

- [ ] **Step 6: Commit the presentation registry**

  ```powershell
  git add packages/quant-engine/src/canonical/contracts packages/quant-engine/src/canonical/indicators/price-return/presentation.ts packages/quant-engine/src/canonical/registry/presentation-registry.ts packages/quant-engine/src/canonical/index.ts _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/presentation-registry.test.ts
  git commit -m "feat(indicators): add canonical presentation registry"
  ```

### Task 2: Typed chart consumer and generic execution model

**Files:**
- Modify: `packages/quant-engine/src/canonical/consumers/types.ts`
- Modify: `packages/quant-engine/src/canonical/consumers/evaluate-chart-series.ts`
- Modify: `packages/quant-engine/test/contracts/consumer-output.test.ts`
- Create: `src/indicators/canonical/catalog.ts`
- Modify: `src/indicators/canonical/types.ts`
- Modify: `src/indicators/canonical/execute-chart-indicator.ts`
- Create: `_technical_support/indicator-wave-1/chart-execution-model.test.ts`

**Interfaces:**
- Consumes: `getIndicatorCatalogEntry()` from Task 1.
- Produces: `CanonicalConsumerSeries` whose points retain `number | boolean | string | null` values rather than silently dropping non-numeric outputs.
- Produces: `CanonicalIndicatorSelection`, `CanonicalChartVisual`, `CanonicalChartExecution`, and `executeChartIndicator(selection, frame, context)`.
- Contract: one call to `executeChartIndicator` evaluates one instance once, then attaches every catalog visual to the matching canonical output.

- [ ] **Step 1: Write failing consumer and execution-model tests**

  Add or extend tests with these assertions:

  ```ts
  expect(evaluateChartSeries(gapRequest).series.find(s => s.outputKey === 'direction')?.points.at(-1)?.value).toBe('up');
  expect(executeChartIndicator(drawdownSelection, frame, context).visuals.map(v => v.surface)).toEqual(['overlay', 'pane']);
  expect(executeChartIndicator(highLowSelection, frame, context).visuals.find(v => v.outputKey === 'range')?.surface).toBe('legend');
  ```

  Also assert formula-version mismatch and unknown IDs still throw `RangeError`, and invalid parameters return canonical diagnostics rather than a UI-generated value.

- [ ] **Step 2: Run the focused tests and verify failure**

  Run: `npm.cmd --workspace @ticknal/quant-engine test -- test/contracts/consumer-output.test.ts`

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/chart-execution-model.test.ts`

  Expected: FAIL because categorical series and generic visuals are not exposed.

- [ ] **Step 3: Generalize the canonical chart consumer**

  Replace numeric-only chart series with `CanonicalConsumerSeries`, preserving each output definition's kind, unit, placement, and ordered observation points. Do not change rule, scan, or alert numeric contracts.

- [ ] **Step 4: Replace the hard-coded execution adapter**

  `src/indicators/canonical/catalog.ts` re-exports read-only catalog lookup without a nine-ID union. `executeChartIndicator` accepts a versioned selection, passes its parameters to `evaluateChartSeries`, joins result series to catalog descriptors, and returns the latest legend value separately from plottable visuals.

- [ ] **Step 5: Run all consumer, registry, and package tests**

  Run: `npm.cmd --workspace @ticknal/quant-engine test`

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Expected: PASS.

- [ ] **Step 6: Commit the generic execution model**

  ```powershell
  git add packages/quant-engine/src/canonical/consumers packages/quant-engine/test/contracts/consumer-output.test.ts src/indicators/canonical/catalog.ts src/indicators/canonical/types.ts src/indicators/canonical/execute-chart-indicator.ts _technical_support/indicator-wave-1/chart-execution-model.test.ts
  git commit -m "feat(indicators): generalize canonical chart execution"
  ```

### Task 3: Versioned indicator-instance state and URL persistence

**Files:**
- Create: `src/indicators/canonical/selection-state.ts`
- Create: `_technical_support/indicator-wave-1/selection-state.test.ts`

**Interfaces:**
- Consumes: catalog lookup and formula parameter parsers from Tasks 1–2.
- Produces: `CanonicalIndicatorSelection` with `{ instanceId, definitionId, formulaVersion, parameters, visibleOutputs, placementOverrides }`.
- Produces: `parseIndicatorQuery(searchParams, selectableDefinitionIds)`, `writeIndicatorQuery(searchParams, canonicalSelections, legacyIds)`, `createIndicatorSelection(definitionId, existingSelections, selectableDefinitionIds)`, `updateIndicatorSelection()`, `removeIndicatorSelection()`, and `reorderIndicatorSelection()`.
- Persistence key: query parameter `ci` containing schema-versioned JSON `{ "schemaVersion": 1, "items": [...] }`; legacy advanced IDs remain in `indicators`.

- [ ] **Step 1: Write failing selection-state tests**

  Cover round-trip persistence, two instances of the same definition, stable order, version pinning, legacy migration, and the first Review Focus item:

  ```ts
  expect(roundTrip.items).toEqual(selections);
  expect(createIndicatorSelection('percentage-change', existing, priceReturnIds).instanceId).toBe('percentage-change:2');
  expect(parseIndicatorQuery(new URLSearchParams('indicators=hydraIndex,close-price'), priceReturnIds).legacyIds).toEqual(['hydraIndex']);
  expect(parseIndicatorQuery(forgedUnknownId, priceReturnIds).selections).toEqual([]);
  expect(parseIndicatorQuery(invalidLookback, priceReturnIds).issues[0].code).toBe('PARAMETER_INVALID');
  expect(parseIndicatorQuery(unimplementedBacklogEntry, priceReturnIds).selections).toEqual([]);
  ```

- [ ] **Step 2: Run the focused test and verify failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/selection-state.test.ts`

  Expected: FAIL because the state module does not exist.

- [ ] **Step 3: Implement strict parsing and deterministic instance IDs**

  Parse JSON defensively, accept only IDs in the caller-supplied `selectableDefinitionIds` set and their exact formula versions, normalize parameters through each definition parser, intersect visible outputs with registered output keys, accept placement overrides only when the descriptor's `allowedSurfaces` permits them, and return structured issues without throwing. Product callers derive the set strictly from `integrated` manifest entries; tests may pass the 20 Price/Return IDs before Task 8 promotes their state. Legacy canonical IDs in `indicators=` migrate to default instances only when selectable; unrecognized legacy IDs remain untouched.

- [ ] **Step 4: Implement immutable add, update, remove, and reorder operations**

  Preserve user order. Generate `definitionId:1`, `definitionId:2`, and so on without reusing an active instance ID. Parameter edits re-run canonical parsing and reject invalid values without mutating the prior selection.

- [ ] **Step 5: Run the selection and full support suites**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Expected: PASS.

- [ ] **Step 6: Commit selection persistence**

  ```powershell
  git add src/indicators/canonical/selection-state.ts _technical_support/indicator-wave-1/selection-state.test.ts
  git commit -m "feat(indicators): persist versioned chart instances"
  ```

### Task 4: Shared execution state and main-chart overlay controller

**Files:**
- Create: `src/components/platform/chart/canonical/evaluate-active-indicators.ts`
- Create: `src/components/platform/chart/canonical/useCanonicalIndicatorExecutions.ts`
- Create: `src/components/platform/chart/canonical/overlay-controller.ts`
- Modify: `src/components/platform/chart/useCanonicalIndicatorFrame.ts`
- Create: `_technical_support/indicator-wave-1/active-execution.test.ts`
- Create: `_technical_support/indicator-wave-1/overlay-controller.test.ts`

**Interfaces:**
- Consumes: `CanonicalIndicatorSelection` and `executeChartIndicator()`.
- Produces: `evaluateActiveIndicators(selections, frame, calculatedAt)` returning ordered executions and `Record<instanceId, CanonicalIndicatorViewState>`.
- Produces: `useCanonicalIndicatorExecutions({ selections, symbol, timeframe })` with one authenticated frame request per symbol/timeframe and one execution per active instance.
- Produces: `reconcileCanonicalOverlays(host, previousHandles, executions)` returning the next disposable handle map.

- [ ] **Step 1: Write failing execution-state and overlay-controller tests**

  Use a fake series host. Assert:

  ```ts
  expect(evaluateActiveIndicators([drawdown], frame, now).executions).toHaveLength(1);
  expect(result.executions[0].visuals.filter(v => v.surface === 'overlay')).toHaveLength(1);
  expect(missingVolume.states['rolling-vwap-source:1'].status).toBe('unavailable');
  expect(fakeHost.removedIds).toEqual(['close-price:1:close']);
  expect(nextHandles.has('percentage-change:1:return_pct')).toBe(false);
  ```

  Add an out-of-order request-key reducer test proving a settled `COMI:D` result cannot replace the current `SWDY:1H` state.

- [ ] **Step 2: Run focused tests and verify failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/active-execution.test.ts _technical_support/indicator-wave-1/overlay-controller.test.ts`

  Expected: FAIL because the evaluator and controller do not exist.

- [ ] **Step 3: Implement shared evaluation and stale-request protection**

  Keep `calculatedAt` stable for one evaluation batch. Preserve canonical `loading`, `ok`, `unavailable`, and `error` states. In the frame hook, abort prior requests and accept a settlement only when its request key still matches the current symbol/timeframe.

- [ ] **Step 4: Implement descriptor-driven overlay reconciliation**

  Map visual renderer `line`, `area`, and `histogram` to Lightweight Charts series through a small host adapter. Keys include instance and output IDs. Reuse unchanged series, update data in place, remove stale series, apply color roles through existing chart color utilities, and never send `null` values as zero.

- [ ] **Step 5: Run support and package suites**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Run: `npm.cmd --workspace @ticknal/quant-engine test`

  Expected: PASS.

- [ ] **Step 6: Commit execution and overlay infrastructure**

  ```powershell
  git add src/components/platform/chart/canonical src/components/platform/chart/useCanonicalIndicatorFrame.ts _technical_support/indicator-wave-1/active-execution.test.ts _technical_support/indicator-wave-1/overlay-controller.test.ts
  git commit -m "feat(charts): add canonical execution and overlay controller"
  ```

### Task 5: Synchronized pane, market, and metric surface hosts

**Files:**
- Create: `src/components/platform/chart/canonical/chart-sync.ts`
- Create: `src/components/platform/chart/canonical/surface-model.ts`
- Create: `src/components/platform/chart/canonical/CanonicalIndicatorPane.tsx`
- Create: `src/components/platform/chart/canonical/CanonicalIndicatorPaneHost.tsx`
- Create: `src/components/platform/chart/canonical/CanonicalMarketDrawer.tsx`
- Create: `src/components/platform/chart/canonical/CanonicalMetricsDock.tsx`
- Create: `_technical_support/indicator-wave-1/surface-model.test.ts`
- Create: `_technical_support/indicator-wave-1/chart-sync.test.ts`

**Interfaces:**
- Consumes: ordered `CanonicalChartExecution[]`, canonical view states, and the main `IChartApi`.
- Produces: `partitionCanonicalSurfaces(executions)` with overlay, pane, market, card, and legend groups.
- Produces: `synchronizeChartSurface({ mainChart, mainSeries, childChart, childSeries, mainValueAtTime, childValueAtTime }): () => void` returning a complete unsubscribe function.
- Components accept explicit close, collapse, height, and reorder callbacks; they do not own selection persistence.

- [ ] **Step 1: Write failing surface partition and synchronization tests**

  Assert Drawdown appears once in the pane model while its peak remains in overlay output, category values appear in pane legends, empty market/card surfaces render no trigger model, and mock chart subscriptions are removed exactly once. Simulate main-to-child and child-to-main range changes and assert the reentrancy guard prevents a loop.

- [ ] **Step 2: Run focused tests and verify failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/surface-model.test.ts _technical_support/indicator-wave-1/chart-sync.test.ts`

  Expected: FAIL because the surface model and synchronization helper do not exist.

- [ ] **Step 3: Implement pure surface partitioning and chart synchronization**

  Preserve selection order, group all pane visuals from one instance into one pane, retain legend-only outputs, and exclude unsuccessful executions from plotted groups while retaining their state for the UI. Synchronize logical ranges bidirectionally. Synchronize crosshairs by resolving the main candle value and first visible pane-series value at the shared observation time and calling `setCrosshairPosition`; clear both crosshairs when time disappears. Cleanup both directions and all subscriptions.

- [ ] **Step 4: Implement the generic pane components**

  Each pane creates one Lightweight Charts instance and supports line, area, histogram, reference-level, and category-legend rendering. Use height `160px` by default, clamp pointer resizing to `112..360px`, provide collapse, move-up, move-down, reset-parameters, and remove controls, and expose loading/unavailable/error messages without fabricated data.

- [ ] **Step 5: Implement dormant market and metric hosts**

  Market entries render a pure-black square-edged contextual drawer with coverage and provenance slots. Card entries render a transparent/pure-black metrics dock with sans-serif `tabular-nums`. Both return `null` when no active execution targets their surface; Wave 1 therefore adds no empty chrome to Charts.

- [ ] **Step 6: Run support tests and root type checking**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Run: `npx.cmd tsc --noEmit`

  Expected: PASS with no strategy-tree edits.

- [ ] **Step 7: Commit the generic surfaces**

  ```powershell
  git add src/components/platform/chart/canonical _technical_support/indicator-wave-1/surface-model.test.ts _technical_support/indicator-wave-1/chart-sync.test.ts
  git commit -m "feat(charts): add synchronized indicator surfaces"
  ```

### Task 6: Registry-driven 411-item indicator browser

**Files:**
- Create: `src/components/platform/chart/canonical/browser-model.ts`
- Create: `src/components/platform/chart/canonical/IndicatorParameterEditor.tsx`
- Create: `src/components/platform/chart/canonical/IndicatorBrowserEntry.tsx`
- Modify: `src/components/platform/chart/ChartIndicatorsPopover.tsx`
- Create: `_technical_support/indicator-wave-1/indicator-browser.test.ts`

**Interfaces:**
- Consumes: all `PROGRAM_MANIFEST` entries, the 20-entry presentation registry, canonical selections, view states, and the legacy `getAvailableIndicators()` list.
- Produces: pure `buildIndicatorBrowserEntries(programEntries, catalogEntries, locale)`, `filterIndicatorBrowserEntries(entries, query, surface, category)`, and `groupIndicatorBrowserEntries(entries)`, plus `getIndicatorBrowserEntries(locale)` over the production registries.
- Browser callbacks: `onAddCanonical(definitionId)`, `onUpdateCanonical(instanceId, patch)`, `onRemoveCanonical(instanceId)`, `onReorderCanonical(instanceId, direction)`, plus unchanged legacy callbacks.

- [ ] **Step 1: Write failing browser-model tests**

  Assert exactly `411` browser entries and `14` category groups. With the current pre-promotion manifest, all entries are disabled; with a test copy that changes only the 20 Price/Return rows to `integrated`, exactly 20 are enabled and 391 are disabled. English search finds `Drawdown`; Arabic search finds `التراجع`; a disabled forged entry cannot produce an add action; surface and category filters compose; unknown Arabic translations fall back to the approved English name without hiding the entry.

- [ ] **Step 2: Run the focused test and verify failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/indicator-browser.test.ts`

  Expected: FAIL because the browser model does not exist.

- [ ] **Step 3: Implement the pure browser model**

  Join manifest rows to presentation entries by backlog ID. Availability is `enabled` only when the program state is `integrated`, the formula definition resolves, and the presentation entry exists. Map other states to truthful localized messages such as `In development`, `Awaiting formula review`, or `Required market data is not available`; do not expose internal T0/T1/T2/T3/R labels.

- [ ] **Step 4: Implement schema-driven parameter controls**

  Integer controls enforce catalog bounds, select controls allow registered values only, and anchor-date offers `First observation` or an exact date/time value. Show a placement selector only for descriptors that declare multiple `allowedSurfaces`. Invalid edits remain visible with a localized error and do not replace the last normalized selection.

- [ ] **Step 5: Rebuild the popover as a responsive browser**

  Use a pure-black, square-edged full-height sheet on narrow screens and a maximum `440px` pure-black panel on desktop. Include search, category/surface filters, active instances, enabled/disabled entries, description, availability, parameters, outputs, add/remove/reset actions, and the existing legacy Advanced Indicators section. Keyboard Escape, click-outside, focus order, Arabic RTL, and clear-all behavior remain functional.

- [ ] **Step 6: Run support tests and root type checking**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Run: `npx.cmd tsc --noEmit`

  Expected: PASS.

- [ ] **Step 7: Commit the indicator browser**

  ```powershell
  git add src/components/platform/chart/canonical/browser-model.ts src/components/platform/chart/canonical/IndicatorParameterEditor.tsx src/components/platform/chart/canonical/IndicatorBrowserEntry.tsx src/components/platform/chart/ChartIndicatorsPopover.tsx _technical_support/indicator-wave-1/indicator-browser.test.ts
  git commit -m "feat(charts): add registry-driven indicator browser"
  ```

### Task 7: Integrate canonical instances into the Charts workspace

**Files:**
- Modify: `src/components/platform/ChartWorkspace.tsx`
- Modify: `src/components/platform/ChartWidget.tsx`
- Modify: `src/components/platform/chart/types.ts`
- Delete: `src/indicators/canonical/price-return-chart-registry.ts`
- Create: `src/components/platform/chart/canonical/CanonicalIndicatorWorkspace.tsx`
- Create: `_technical_support/indicator-wave-1/chart-integration.test.ts`

**Interfaces:**
- Consumes: selection-state functions from Task 3, execution hook/controller from Task 4, surface hosts from Task 5, and browser callbacks from Task 6.
- Produces: `ChartWidgetProps.activeCanonicalIndicators` and immutable add/update/remove/reorder callbacks separate from legacy `activeIndicators` and strategy parameters.
- Contract: ChartWidget creates the main chart once, reconciles canonical overlays imperatively, and renders pane/market/card hosts from the same execution array.

- [ ] **Step 1: Write the failing integration-model test**

  Add a pure orchestration test asserting an old URL with `close-price,hydraIndex` yields one canonical instance and one legacy ID; total active count is two; removing the canonical instance preserves HYDRA; Drawdown routes to both overlay and pane from one execution; clearing canonical entries does not clear legacy indicators.

- [ ] **Step 2: Run the integration test and verify failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/chart-integration.test.ts`

  Expected: FAIL because ChartWorkspace and ChartWidget still share one string array.

- [ ] **Step 3: Move canonical selection ownership into ChartWorkspace**

  Initialize from `useSearchParams`, migrate old canonical IDs from `indicators=`, keep legacy IDs intact, and update the current URL with the versioned `ci` payload through `window.history.replaceState`. Symbol and timeframe query parameters must remain untouched.

- [ ] **Step 4: Integrate one canonical execution workspace into ChartWidget**

  Remove the nine-ID filter and the existing inline canonical line loop. Mount `CanonicalIndicatorWorkspace` with the current main chart, main price series, series-ready key, symbol, canonical timeframe, selections, and callbacks. Render its pane host beneath the main chart and its market/card surfaces only when populated. Keep HYDRA and Smart Money dedicated panels on their existing legacy path.

  Change the touched main chart's solid background fallback to pure `#000000`; do not introduce gray or navy surfaces while extracting the canonical workspace.

- [ ] **Step 5: Remove the obsolete hard-coded registry**

  Delete `price-return-chart-registry.ts` after `rg "price-return-chart-registry|CanonicalChartIndicatorId|CANONICAL_PRICE_RETURN_CHART_INDICATORS" src packages` returns no production imports. Do not delete or alter legacy indicator definitions.

- [ ] **Step 6: Run focused, package, and type checks**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Run: `npm.cmd --workspace @ticknal/quant-engine test`

  Run: `npm.cmd --workspace @ticknal/quant-engine run type-check`

  Run: `npx.cmd tsc --noEmit`

  Expected: all PASS.

- [ ] **Step 7: Commit Charts integration**

  ```powershell
  git add src/components/platform/ChartWorkspace.tsx src/components/platform/ChartWidget.tsx src/components/platform/chart/types.ts src/components/platform/chart/canonical/CanonicalIndicatorWorkspace.tsx src/indicators/canonical/price-return-chart-registry.ts _technical_support/indicator-wave-1/chart-integration.test.ts
  git commit -m "feat(charts): integrate all price return indicators"
  ```

### Task 8: Promote Price/Return to integrated and run the Wave 1 release gate

**Files:**
- Modify: `packages/quant-engine/src/canonical/program/categories/price-return.ts`
- Modify: `packages/quant-engine/test/program/first-category-set.test.ts`
- Modify: `packages/quant-engine/test/registry/price-return-registry.test.ts`
- Create: `_technical_support/indicator-wave-1/wave-1-acceptance.test.ts`
- Create: `_technical_support/indicator-wave-1/chart-page-smoke.ts`
- Modify: `docs/product/indicator-library-backlog.md`

**Interfaces:**
- Consumes: every Wave 1 interface and the existing authentic frame endpoint.
- Produces: 20 Price/Return manifest entries in `integrated` state and a repeatable runtime acceptance script.
- Contract: no other category state changes in this wave.

- [ ] **Step 1: Write the failing acceptance test**

  Assert:

  ```ts
  expect(PRICE_RETURN_PROGRAM_ENTRIES).toHaveLength(20);
  expect(PRICE_RETURN_PROGRAM_ENTRIES.every(e => e.state === 'integrated')).toBe(true);
  expect(PROGRAM_MANIFEST.filter(e => e.state === 'integrated')).toHaveLength(20);
  expect(PROGRAM_MANIFEST.filter(e => e.state !== 'integrated')).toHaveLength(391);
  expect(listIndicatorCatalogEntries()).toHaveLength(20);
  expect(getIndicatorBrowserEntries('en')).toHaveLength(411);
  ```

  Also assert Price/Return manifest placement counts remain 9 `Overlay` and 11 `Pane`, all 20 definitions resolve, and no hard-coded nine-ID registry symbol remains.

- [ ] **Step 2: Run the acceptance test and verify the state failure**

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts _technical_support/indicator-wave-1/wave-1-acceptance.test.ts`

  Expected: FAIL because Price/Return entries are still `verified`.

- [ ] **Step 3: Promote only the 20 Price/Return entries**

  Change their state from `verified` to `integrated`, update existing assertions, and annotate the product backlog that Wave 1 integration is complete without changing the 411-row scope or any later-category status.

- [ ] **Step 4: Implement the Playwright runtime smoke script**

  Against an already-running local server, the script must:

  - open `/charts?ticker=COMI&timeframe=D` at desktop and mobile widths;
  - capture browser console errors, page errors, failed requests, and hydration warnings and fail on any;
  - open the indicator browser and assert 411 searchable entries, 20 enabled entries, and disabled state for an unimplemented entry;
  - add Percentage Change and Drawdown, verify two synchronized panes plus the Drawdown peak overlay legend, edit lookback, reorder/collapse/resize/remove panes, and reload to prove persistence;
  - switch ticker and timeframe during loading and prove the visible provenance belongs to the final request;
  - enable and disable one existing advanced indicator and prove the canonical selections remain intact;
  - verify pure-black/transparent principal surfaces, square drawer geometry, sans-serif UI, and Arabic RTL labels;
  - save screenshots under `_technical_support/indicator-wave-1/artifacts/`.

- [ ] **Step 5: Run all automated test, type, build, data, and performance gates**

  Run: `npm.cmd --workspace @ticknal/quant-engine test`

  Run: `npm.cmd --workspace @ticknal/quant-engine run type-check`

  Run: `npx.cmd vitest run --config _technical_support/indicator-wave-1/vitest.config.ts`

  Run: `npx.cmd tsc --noEmit`

  Run: `npm.cmd run build`

  Run: `npx.cmd tsx _technical_support/indicator-engine-live-validation/verify-live-frame.ts`

  Run: `npx.cmd tsx _technical_support/indicator-engine-performance/benchmark-price-return.ts`

  Expected: every command exits `0`; the benchmark stays within `250 ms`, `30 s`, and `512 MB` budgets.

- [ ] **Step 6: Run endpoint and browser runtime verification**

  Start the production server from the successful build in a persistent terminal:

  Run: `npm.cmd run start -- --hostname 127.0.0.1 --port 3100`

  In a second terminal set `$env:TICKNAL_WAVE1_BASE_URL = 'http://127.0.0.1:3100'`, then verify:

  - `GET /api/indicators/frame?ticker=COMI&timeframe=D` returns `200` and `status: ok`;
  - `GET /api/indicators/frame?ticker=AAF&timeframe=1H` returns `422` with typed diagnostics when the audited source remains unavailable; if that source has since become authentic, select another known instrument/frequency through a read-only capability check and record it in the smoke output;
  - `GET /api/indicators/frame?ticker=%24%24%24&timeframe=BAD` returns `400` without an unhandled exception;
  - `npx.cmd tsx _technical_support/indicator-wave-1/chart-page-smoke.ts` exits `0` using `TICKNAL_WAVE1_BASE_URL`.

- [ ] **Step 7: Prove the protected strategies are unchanged and inspect the full diff**

  Run: `git diff --exit-code baefa1b -- src/strategies packages/quant-engine/src/strategies`

  Run: `git diff --check baefa1b -- packages/quant-engine/src/canonical packages/quant-engine/test src/indicators/canonical src/components/platform/ChartWorkspace.tsx src/components/platform/ChartWidget.tsx src/components/platform/chart _technical_support/indicator-wave-1 docs/product/indicator-library-backlog.md`

  Run: `git status --short`

  Expected: protected-strategy diff is empty; no whitespace errors; unrelated pre-existing work remains preserved.

- [ ] **Step 8: Commit the Wave 1 release state**

  ```powershell
  git add packages/quant-engine/src/canonical/program/categories/price-return.ts packages/quant-engine/test/program/first-category-set.test.ts packages/quant-engine/test/registry/price-return-registry.test.ts docs/product/indicator-library-backlog.md _technical_support/indicator-wave-1/wave-1-acceptance.test.ts _technical_support/indicator-wave-1/chart-page-smoke.ts
  git commit -m "feat(indicators): complete wave 1 chart integration"
  ```

## Wave 1 completion evidence

Wave 1 is complete only when the final handoff records:

- 20 Price/Return definitions, 20 presentation entries, and 20 `integrated` manifest entries;
- 411 browser rows with exactly 20 enabled and 391 disabled;
- successful overlay and pane rendering for every Price/Return output, including mixed Drawdown placement and categorical Gap direction;
- URL persistence, duplicate instances, parameter edits, reorder, collapse, resize, remove, symbol/timeframe switching, English/Arabic search, and legacy-indicator coexistence;
- green package tests, support tests, package/root type checks, production build, endpoint checks, browser console/runtime checks, authentic-data validation, and performance budgets;
- zero changes to either protected strategy tree.

After Wave 1 is accepted, the active 411-indicator goal continues with a separate Wave 2 plan for all 112 Trend, Momentum, and Volatility definitions. Wave 1 completion is not completion of the full 411 goal.
