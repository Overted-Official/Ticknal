# Strategy Workspace Three-Stage Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a sleek, block-based `Build → Visualize → Backtest` workspace that lets non-technical users compose a strategy, understand it on one ticker, and inspect the existing offline backtest preview.

**Architecture:** `StrategyBuilderWorkspace` becomes the single client-side owner of stage, strategy, builder mode, advanced nodes, focused block, and revision state. Build renders controlled Simple or Advanced block flows through compact rows and one inspector drawer; Visualize derives deterministic local chart data from the same draft; Backtest reuses the existing panel. Pure model functions handle readiness, conversion, and visualization derivation so the UI remains testable without browser state or database calls.

**Tech Stack:** Next.js 16.3.5 App Router, React 19.2.8, TypeScript 5, Tailwind CSS 4, Recharts 3.10.1, Vitest 4, existing Ticknal icon and i18n utilities.

**Spec:** `docs/superpowers/specs/2026-10-08-strategy-workspace-three-stage-design.md`

## Global Constraints

- Do not modify `src/strategies/**` or `packages/quant-engine/src/strategies/**`.
- This phase is UI-only: no persistence, notification activation, brokerage integration, real backtest execution, database requests, or external API requests.
- Preserve Typhon, Cerberus, and Hydra as read-only presentation data.
- Main panels and drawers use pure black or transparent surfaces, square drawer edges, sans-serif text, and no prohibited navy/gray fills or `font-mono`.
- Keep English and Arabic layouts functional.
- Read the relevant Next.js 16.3.5 guide in `node_modules/next/dist/docs/` before implementation.
- Put all new test support under `_technical_support/strategy-workspace-three-stage/`.
- After every task, run its focused tests; before completion, run `npm run build`, `npx tsc --noEmit`, runtime HTTP checks, browser interaction checks, and browser-console checks.

## Review Focus

- Switching strategy while the inspector is open must close it and clear a stale focused block; Task 1 tests this reducer transition.
- A custom draft missing either Buy or Sell logic must show Visualize and Backtest as incomplete without losing click access to their empty states; Task 1 tests both cases.
- Simple→Advanced conversion must be idempotent and preserve rule side, connector, indicator, period, operator, and value; Task 2 tests repeated conversion and exact parameters.
- Advanced-only nodes must make Simple read-only without deleting or rewriting any graph node; Task 2 tests the lock predicate and unchanged node collection.
- Unknown or unavailable indicator IDs must produce a labelled fallback visualization pane instead of crashing; Task 4 tests this input.

---

## File Structure

**Create**

- `src/components/platform/strategies/builder/strategy-workspace-model.ts` — stage, readiness, focus, and workspace transition types/functions.
- `src/components/platform/strategies/builder/StrategyStageNavigation.tsx` — accessible three-stage switcher and statuses.
- `src/components/platform/strategies/builder/CompactStrategyBlockRow.tsx` — shared concise block row.
- `src/components/platform/strategies/builder/strategy-inspector-model.ts` — discriminated inspector target types and educational copy lookup.
- `src/components/platform/strategies/builder/StrategyBlockInspector.tsx` — pure-black configuration/education drawer.
- `src/components/platform/strategies/builder/strategy-visualization-model.ts` — deterministic local visualization model.
- `src/components/platform/strategies/builder/StrategyVisualizationPanel.tsx` — ticker controls, price chart, marker overlays, panes, legend, and empty state.
- `_technical_support/strategy-workspace-three-stage/vitest.config.ts` — `@` alias for focused tests.
- `_technical_support/strategy-workspace-three-stage/strategy-workspace-model.test.ts`
- `_technical_support/strategy-workspace-three-stage/simple-advanced-conversion.test.ts`
- `_technical_support/strategy-workspace-three-stage/compact-builder-ui.test.tsx`
- `_technical_support/strategy-workspace-three-stage/strategy-visualization-model.test.ts`
- `_technical_support/strategy-workspace-three-stage/StrategyVisualizationPanel.test.tsx`
- `_technical_support/strategy-workspace-three-stage/StrategyBuilderWorkspace.test.tsx`

**Modify**

- `src/components/platform/strategies/builder/StrategyBuilderWorkspace.tsx` — own shared state and render one active stage.
- `src/components/platform/strategies/builder/StrategyConfigurationPanel.tsx` — become controlled Build content.
- `src/components/platform/strategies/builder/StrategyRuleComposer.tsx` — compact Simple rows and inspector requests.
- `src/components/platform/strategies/builder/AdvancedStrategyBuilder.tsx` — controlled nodes/focus and compact rows.
- `src/components/platform/strategies/builder/AdvancedNodeEditor.tsx` — inspector-hosted editor content.
- `src/components/platform/strategies/builder/advanced-builder-state.ts` — conversion and advanced-only detection.
- `src/components/platform/strategies/builder/advanced-strategy-model.ts` — presentation metadata needed by rows and inspector.
- `src/components/platform/strategies/builder/StrategyBacktestPanel.tsx` — stage-level heading/back-navigation integration only.

### Task 1: Shared Workspace State and Stage Navigation

**Files:**
- Create: `src/components/platform/strategies/builder/strategy-workspace-model.ts`
- Create: `src/components/platform/strategies/builder/StrategyStageNavigation.tsx`
- Create: `_technical_support/strategy-workspace-three-stage/vitest.config.ts`
- Create: `_technical_support/strategy-workspace-three-stage/strategy-workspace-model.test.ts`

**Interfaces:**
- Produces: `StrategyWorkspaceStage = 'build' | 'visualize' | 'backtest'`.
- Produces: `StrategyStageStatus = 'incomplete' | 'ready' | 'protected'`.
- Produces: `getStrategyStageStatuses(input: { isProtected: boolean; hasBuyLogic: boolean; hasSellLogic: boolean }): Readonly<Record<StrategyWorkspaceStage, StrategyStageStatus>>`.
- Produces: `transitionStrategyWorkspace(state: StrategyWorkspaceState, event: StrategyWorkspaceEvent): StrategyWorkspaceState`, including `select-stage`, `select-strategy`, `focus-block`, and `close-inspector`.
- Produces: `StrategyStageNavigation` props `{ activeStage, statuses, locale, onSelect }`.

- [ ] **Step 1: Write failing pure-state tests**

Add tests named `marks custom visualize and backtest incomplete until both rule sides exist`, `keeps incomplete stages selectable through explicit state transitions`, `marks all protected stages protected`, and `clears inspector and focused block when strategy changes`. Assert exact stage-status records and exact transition results.

- [ ] **Step 2: Run the state tests and confirm failure**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/strategy-workspace-model.test.ts --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: FAIL because `strategy-workspace-model.ts` does not exist.

- [ ] **Step 3: Implement the workspace model**

Implement the interfaces above as pure functions. Stage selection must never mutate strategy data; selecting a strategy resets stage to `build`, clears `focusedBlockId`, and closes the inspector.

- [ ] **Step 4: Write the failing navigation rendering test**

Extend the test to render `StrategyStageNavigation` with React static markup and assert three tabs labelled `01 Build`, `02 Visualize`, and `03 Backtest`, correct `aria-selected`, textual status labels, and Arabic labels when `locale="ar"`.

- [ ] **Step 5: Implement and verify `StrategyStageNavigation`**

Use semantic tabs with 44-pixel targets, text/icon status indicators, a visible overflow affordance, and pure-black/transparent styling.

Run the Task 1 test command. Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/components/platform/strategies/builder/strategy-workspace-model.ts src/components/platform/strategies/builder/StrategyStageNavigation.tsx _technical_support/strategy-workspace-three-stage
git commit -m "feat: add strategy workspace stage model"
```

### Task 2: Lossless Simple-to-Advanced Strategy Projection

**Files:**
- Modify: `src/components/platform/strategies/builder/advanced-builder-state.ts`
- Modify: `src/components/platform/strategies/builder/advanced-strategy-model.ts`
- Create: `_technical_support/strategy-workspace-three-stage/simple-advanced-conversion.test.ts`

**Interfaces:**
- Consumes: `StrategyDraft`, `StrategyBuilderIndicatorOption`, `AdvancedStrategyNode`.
- Produces: `projectSimpleDraftIntoAdvancedNodes(draft, indicators, currentNodes): readonly AdvancedStrategyNode[]`.
- Produces: `hasAdvancedOnlyFeatures(nodes): boolean`.
- Rule-generated nodes carry `parameters.sourceRuleId`, `actionSide`, `indicatorId`, `period`, `operator`, `compareValue`, and `connector`.

- [ ] **Step 1: Write failing conversion tests**

Test exact parameter preservation for one Buy and one Sell rule, terminal connections to the generated node IDs, repeated conversion returning no duplicate rule nodes, update of an existing projected rule, and an unavailable/unknown indicator preserving its ID with a fallback name.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/simple-advanced-conversion.test.ts --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: FAIL because the projection functions are missing.

- [ ] **Step 3: Implement idempotent projection**

Use stable IDs `simple-${side}-${rule.id}`. Update existing projected nodes in place, remove only projected nodes whose source rules were deleted, preserve every non-projected node, and rebuild Buy/Sell terminal connections without removing manually connected Advanced-only nodes.

- [ ] **Step 4: Add and pass advanced-only detection tests**

Assert that the base market/terminal nodes plus projected conditions return `false`; adding calculation, priority, state, exit, or manually created non-projected condition nodes returns `true`; and calling the predicate never changes the input array.

Run the Task 2 command. Expected: PASS.

- [ ] **Step 5: Commit Task 2**

```bash
git add src/components/platform/strategies/builder/advanced-builder-state.ts src/components/platform/strategies/builder/advanced-strategy-model.ts _technical_support/strategy-workspace-three-stage/simple-advanced-conversion.test.ts
git commit -m "feat: preserve simple rules in advanced workflows"
```

### Task 3: Compact Block Rows and Contextual Inspector

**Files:**
- Create: `src/components/platform/strategies/builder/CompactStrategyBlockRow.tsx`
- Create: `src/components/platform/strategies/builder/strategy-inspector-model.ts`
- Create: `src/components/platform/strategies/builder/StrategyBlockInspector.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyRuleComposer.tsx`
- Modify: `src/components/platform/strategies/builder/AdvancedStrategyBuilder.tsx`
- Modify: `src/components/platform/strategies/builder/AdvancedNodeEditor.tsx`
- Create: `_technical_support/strategy-workspace-three-stage/compact-builder-ui.test.tsx`

**Interfaces:**
- Produces: `StrategyInspectorTab = 'configure' | 'learn' | 'output' | 'usage'`.
- Produces: `StrategyInspectorTarget = { kind: 'simple-rule'; side; rule; indicator } | { kind: 'advanced-node'; node }`.
- Produces: `CompactStrategyBlockRow` props `{ id, name, summary, tone, readOnly, selected, validationMessage?, onInspect, onConfigure?, onRemove? }`.
- Produces: `StrategyBlockInspector` props `{ target, tab, nodes, indicators, locale, onTabChange, onChange, onClose }`.
- `AdvancedStrategyBuilder` becomes controlled through `{ nodes?, onNodesChange?, focusedNodeId?, onFocusedNodeChange? }`, while retaining its existing protected Typhon variant.

- [ ] **Step 1: Write failing compact-row tests**

Render rows and assert one-line name/configuration summary, labelled information/configuration/remove controls, no inline paragraph description, protected rows omitting mutation controls, and validation rendered as icon plus text rather than color alone.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/compact-builder-ui.test.tsx --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: FAIL because compact-row and inspector components are missing.

- [ ] **Step 3: Implement compact rows and replace tall cards**

Use the shared row in both Simple and Advanced flows. Keep workflow group borders and arrows. Generate summaries from configured parameters, for example `RSI · 14 periods · Closing price` and `Crosses above 30`.

- [ ] **Step 4: Write failing inspector tests**

Assert square-edged pure-black dialog markup, accessible title/close control, Configure/Learn/Output/Used by tabs, Learn opened from information intent, an accessible illustrative mini-chart in Learn, Configure omitted for protected targets, unknown indicator fallback copy, and downstream-node names in Used by.

- [ ] **Step 5: Implement the inspector and editor hosting**

Render `AdvancedNodeEditor` only inside Configure for advanced nodes. Render the existing simple rule controls inside Configure for simple targets. Use a deterministic inline SVG mini-chart in Learn, then add Escape handling, focus restoration, labelled tab semantics, and no database/API calls.

- [ ] **Step 6: Run all builder-focused tests**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/compact-builder-ui.test.tsx _technical_support/strategy-builder-advanced-workflow/AdvancedStrategyBuilder.test.tsx _technical_support/strategy-builder-rules-mvp --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: PASS with updated compact-layout assertions.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/components/platform/strategies/builder/CompactStrategyBlockRow.tsx src/components/platform/strategies/builder/strategy-inspector-model.ts src/components/platform/strategies/builder/StrategyBlockInspector.tsx src/components/platform/strategies/builder/StrategyRuleComposer.tsx src/components/platform/strategies/builder/AdvancedStrategyBuilder.tsx src/components/platform/strategies/builder/AdvancedNodeEditor.tsx _technical_support/strategy-workspace-three-stage/compact-builder-ui.test.tsx
git commit -m "feat: streamline strategy blocks and inspection"
```

### Task 4: Deterministic Visualization Model

**Files:**
- Create: `src/components/platform/strategies/builder/strategy-visualization-model.ts`
- Create: `_technical_support/strategy-workspace-three-stage/strategy-visualization-model.test.ts`

**Interfaces:**
- Produces: `StrategyVisualizationPoint`, `StrategyVisualizationMarker`, `StrategyVisualizationPane`, and `StrategyVisualizationModel`.
- Produces: `getStrategyVisualizationModel(input: { strategyId; ticker; draft; advancedNodes; indicators }): StrategyVisualizationModel | null`.
- Produces: fixture tickers `COMI`, `SWDY`, and `EAST`, each with deterministic dates, close values, volume, marker positions, and derived pane values.

- [ ] **Step 1: Write failing model tests**

Assert deterministic repeated output, chronological points, marker timestamps matching existing points, protected Typhon panes containing Master Index and EMA smoothing, custom Simple panes matching unique indicators, Advanced panes matching indicator/calculation nodes, and unknown indicators producing `Unknown indicator` with stable values.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/strategy-visualization-model.test.ts --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: FAIL because the visualization model is missing.

- [ ] **Step 3: Implement deterministic local derivation**

Generate values from fixed ticker seeds and point indices without `Math.random`, time-dependent calls, fetch, database clients, or server actions. Return `null` only for incomplete custom drafts.

- [ ] **Step 4: Run and pass the model tests**

Run the Task 4 command. Expected: PASS.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/components/platform/strategies/builder/strategy-visualization-model.ts _technical_support/strategy-workspace-three-stage/strategy-visualization-model.test.ts
git commit -m "feat: add offline strategy visualization model"
```

### Task 5: Single-Ticker Visualization UI

**Files:**
- Create: `src/components/platform/strategies/builder/StrategyVisualizationPanel.tsx`
- Create: `_technical_support/strategy-workspace-three-stage/StrategyVisualizationPanel.test.tsx`

**Interfaces:**
- Consumes: `StrategyVisualizationModel`, focused block ID, ticker, locale.
- Produces: `StrategyVisualizationPanel` props `{ model, ticker, focusedBlockId, locale, onTickerChange, onFocusBlock, onBack, onContinue }`.

- [ ] **Step 1: Write failing rendering tests**

Assert ticker selector, date/timeframe controls, price chart accessible name, Buy/Sell marker legend, one pane per model pane, active pane state matching `focusedBlockId`, bilingual empty state, `Return to Build`, and `Continue to Backtest`.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/StrategyVisualizationPanel.test.tsx --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: FAIL because the panel is missing.

- [ ] **Step 3: Implement the panel using existing Recharts**

Use `ResponsiveContainer` with an area/line price chart, `ReferenceDot` markers, and line/bar panes based on pane presentation. Keep tooltips pure black, use sans-serif tabular numerals, expose a textual marker summary for accessibility, and avoid new dependencies.

- [ ] **Step 4: Run and pass visualization UI tests**

Run the Task 5 command. Expected: PASS.

- [ ] **Step 5: Commit Task 5**

```bash
git add src/components/platform/strategies/builder/StrategyVisualizationPanel.tsx _technical_support/strategy-workspace-three-stage/StrategyVisualizationPanel.test.tsx
git commit -m "feat: add strategy visualization workspace"
```

### Task 6: Integrate Build, Visualize, and Backtest

**Files:**
- Modify: `src/components/platform/strategies/builder/StrategyBuilderWorkspace.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyConfigurationPanel.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBacktestPanel.tsx`
- Create: `_technical_support/strategy-workspace-three-stage/StrategyBuilderWorkspace.test.tsx`

**Interfaces:**
- Consumes: all Tasks 1–5 interfaces.
- Produces: one active-stage workspace with controlled builder state, one inspector, one focused block, and existing backtest revision invalidation.

- [ ] **Step 1: Write failing workspace integration tests**

Assert only the active stage content renders, stage navigation is always present, Build defaults active, protected Typhon can enter Visualize, incomplete custom drafts render Visualize/Backtest empty states, strategy changes return to Build and close the inspector, Simple rules survive entering Advanced, and Advanced-only edits make Simple read-only.

- [ ] **Step 2: Run and confirm failure**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage/StrategyBuilderWorkspace.test.tsx --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: FAIL against the current permanently stacked Build/Backtest workspace.

- [ ] **Step 3: Lift shared state into `StrategyBuilderWorkspace`**

Control `activeStage`, `builderMode`, `advancedNodes`, `focusedBlockId`, inspector target/tab, selected ticker, and draft revision. Derive stage statuses and visualization model with the pure functions from Tasks 1 and 4.

- [ ] **Step 4: Convert `StrategyConfigurationPanel` into Build stage content**

Keep strategy selection and protected profiles. Accept controlled builder mode/nodes/focus callbacks, render the shared inspector once, project Simple rules on the first transition to Advanced, and render Simple read-only when `hasAdvancedOnlyFeatures` is true.

- [ ] **Step 5: Move Backtest into its dedicated stage**

Preserve all existing controls, KPIs, build/unseen behavior, heatmap, table, and zero-egress copy. Add only stage navigation callbacks and remove the permanently stacked border dependency.

- [ ] **Step 6: Run the complete focused suite**

Run: `npx vitest run _technical_support/strategy-workspace-three-stage _technical_support/strategy-builder-advanced-workflow _technical_support/strategy-builder-rules-mvp --config _technical_support/strategy-workspace-three-stage/vitest.config.ts`

Expected: all focused tests PASS.

- [ ] **Step 7: Run mandatory static verification**

Run: `npx tsc --noEmit`

Expected: exit 0 with no TypeScript errors.

Run: `npm run build`

Expected: exit 0 with a successful Next.js production build.

- [ ] **Step 8: Verify runtime behavior in the browser**

At `http://localhost:3000/strategies`, verify Typhon Build→Visualize→Backtest, create a custom draft, add Buy and Sell rules, switch Simple→Advanced without loss, add an Advanced-only calculation and confirm Simple becomes read-only, open/close the drawer with keyboard, inspect Arabic layout, and confirm no hydration, console, uncaught-promise, or HTTP 500 errors.

- [ ] **Step 9: Verify protected strategy isolation and styling**

Run:

```bash
git status --short -- src/strategies packages/quant-engine/src/strategies
rg -n "bg-(zinc|slate)|#14171f|#1e222d|#2a2e39|font-mono" src/components/platform/strategies/builder
```

Expected: no protected-strategy changes and no forbidden styling matches introduced by this work.

- [ ] **Step 10: Commit Task 6**

```bash
git add src/components/platform/strategies/builder _technical_support/strategy-workspace-three-stage
git commit -m "feat: add three-stage strategy workflow"
```
