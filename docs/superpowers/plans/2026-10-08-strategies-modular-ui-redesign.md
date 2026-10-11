# Strategies Workspace Modular UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the Strategies workspace into a modular, non-monolithic component architecture where every visual element consumes existing `src/app/globals.css` design tokens with zero hardcoded CSS, while archiving unused legacy files and maintaining 100% deterministic local data.

**Architecture:** Decompose oversized canvas and visualization orchestrators into single-responsibility subcomponents (`CompactAdvancedNodeCard`, `AdvancedBlockLibraryModal`, `AdvancedWorkflowAreaSection`, `CandlestickPriceChart`, `StrategySeriesLegend`, `StrategyIndicatorPaneCard`). Systematize all colors, typography, surfaces, switches, and drawers to consume existing `globals.css` tokens and utilities.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons, Recharts, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-08-strategies-modular-ui-redesign-design.md`

## Global Constraints
- Zero network or Supabase egress — strictly local mock data and fixtures.
- Protected strategies (`psi` Typhon, `psi_v2` Cerberus, `hydra` Hydra) logic and math must remain untouched.
- Zero hardcoded CSS / hex colors in UI files — strictly use existing tokens and classes from `src/app/globals.css`.
- NO new classes or tokens added to `src/app/globals.css`.
- Zero `font-mono` — strictly `tabular-nums font-sans`.
- Pure pitch black `#000000` / `bg-black` surfaces; no elevated dark grays on main panels or drawers.
- Sharp drawer and card geometry (`rounded-none` where appropriate).
- Archive legacy sections to `_archived/strategies-mvp-sections/` without deleting them.

## Review Focus
1. Upstream node port connections warning banner in `CompactAdvancedNodeCard` remains reactive.
2. SVG Candlestick crosshair and real-time HUD correctly handle container bounds and edge hover indices.
3. Bidirectional series-to-block focus remains functional when clicking legend items or indicator tiles.
4. Segmented mode switches (Simple/Advanced, 6M/1Y/ALL, Area/Candles) preserve full accessibility (`aria-pressed`, `role="tab"`).
5. All 13 unit tests pass and build exits 0.

---

### Task 1: Archive Legacy Strategy Sections
**Files:**
- Move: `src/components/platform/strategies/sections` $\rightarrow$ `_archived/strategies-mvp-sections/sections`
- Move: `src/components/platform/strategies/StrategiesFloatingNav.tsx` $\rightarrow$ `_archived/strategies-mvp-sections/StrategiesFloatingNav.tsx`

**Interfaces:**
- Consumes: None (unreferenced dead code).
- Produces: Clean directory structure with zero dead monolith files in active source tree.

- [ ] **Step 1: Create target directory `_archived/strategies-mvp-sections`**
- [ ] **Step 2: Move `sections/` and `StrategiesFloatingNav.tsx` into `_archived/strategies-mvp-sections/`**
- [ ] **Step 3: Verify TypeScript and Vitest to ensure no active code depended on moved files**
  Run: `cmd /c npx vitest run src/components/platform/strategies/builder`
  Expected: PASS (13 tests)
  Run: `cmd /c npx tsc --noEmit`
  Expected: Code 0
- [ ] **Step 4: Commit archival**

---

### Task 2: Decompose `AdvancedStrategyBuilder.tsx` (Part 1 - `CompactAdvancedNodeCard` & `AdvancedBlockLibraryModal`)
**Files:**
- Create: `src/components/platform/strategies/builder/CompactAdvancedNodeCard.tsx`
- Create: `src/components/platform/strategies/builder/AdvancedBlockLibraryModal.tsx`
- Modify: `src/components/platform/strategies/builder/AdvancedStrategyBuilder.tsx`
- Test: `src/components/platform/strategies/builder/strategy-builder-model.test.ts`

**Interfaces:**
- `CompactAdvancedNodeCard`: Props `{ node, locale, readOnly, selected, onInspect, onConfigure, onRemove }`
- `AdvancedBlockLibraryModal`: Props `{ open, areaId, locale, onClose, onAdd }`

- [ ] **Step 1: Extract `CompactAdvancedNodeCard.tsx`**
  Implement card presentation using `CompactStrategyBlockRow`, tokenized tags, and connection warning indicators.
- [ ] **Step 2: Extract `AdvancedBlockLibraryModal.tsx`**
  Implement template search and categorized group selection modal with tokenized inputs (`.input-token`, `text-plt-muted`).
- [ ] **Step 3: Run Vitest and Type Check**
  Run: `cmd /c npx vitest run src/components/platform/strategies/builder`
  Run: `cmd /c npx tsc --noEmit`
  Expected: Code 0
- [ ] **Step 4: Commit modular subcomponents**

---

### Task 3: Decompose `AdvancedStrategyBuilder.tsx` (Part 2 - `AdvancedWorkflowAreaSection` & Canvas Coordinator)
**Files:**
- Create: `src/components/platform/strategies/builder/AdvancedWorkflowAreaSection.tsx`
- Modify: `src/components/platform/strategies/builder/AdvancedStrategyBuilder.tsx`

**Interfaces:**
- `AdvancedWorkflowAreaSection`: Props `{ area, nodes, locale, readOnly, activeNodeId, onOpenLibrary, onInspectNode, onConfigureNode, onRemoveNode }`
- `AdvancedStrategyBuilder`: Refactored down to < 200 lines coordinating Setup & Execution columns.

- [ ] **Step 1: Extract `AdvancedWorkflowAreaSection.tsx`**
  Implement workflow area column rendering with connective arrow separators and add-node buttons using tokenized styles.
- [ ] **Step 2: Streamline `AdvancedStrategyBuilder.tsx`**
  Refactor `AdvancedStrategyBuilder` to consume `AdvancedWorkflowAreaSection` and `AdvancedBlockLibraryModal`.
- [ ] **Step 3: Verify Type Check and Vitest**
  Run: `cmd /c npx tsc --noEmit`
  Run: `cmd /c npx vitest run src/components/platform/strategies/builder`
  Expected: Code 0
- [ ] **Step 4: Commit**

---

### Task 4: Decompose `StrategyVisualizationPanel.tsx` (`CandlestickPriceChart`, `StrategySeriesLegend`, `StrategyIndicatorPaneCard`)
**Files:**
- Create: `src/components/platform/strategies/builder/CandlestickPriceChart.tsx`
- Create: `src/components/platform/strategies/builder/StrategySeriesLegend.tsx`
- Create: `src/components/platform/strategies/builder/StrategyIndicatorPaneCard.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyVisualizationPanel.tsx`
- Test: `src/components/platform/strategies/builder/strategy-visualization-model.test.ts`

**Interfaces:**
- `CandlestickPriceChart`: Props `{ points, markers, locale, hoveredIndex, onHoverIndex }`
- `StrategySeriesLegend`: Props `{ legendItems, focusedBlockId, locale, onFocusBlock }`
- `StrategyIndicatorPaneCard`: Props `{ pane, active, onFocusBlock }`

- [ ] **Step 1: Extract `CandlestickPriceChart.tsx`**
  Pure SVG candlestick engine with tokenized colors (`var(--plt-profit)`, `var(--plt-risk)`, `var(--color-cold-gray-500)`), grid lines, and interactive HUD.
- [ ] **Step 2: Extract `StrategySeriesLegend.tsx`**
  Clickable series-to-block mapping bar using `.badge` tokens and active focus pills.
- [ ] **Step 3: Extract `StrategyIndicatorPaneCard.tsx`**
  Individual calculation/indicator chart tile.
- [ ] **Step 4: Refactor `StrategyVisualizationPanel.tsx`**
  Lean assembler integrating header controls with `.pill-switch` and `.select-token` classes.
- [ ] **Step 5: Run Vitest & Type Check**
  Run: `cmd /c npx vitest run src/components/platform/strategies/builder`
  Run: `cmd /c npx tsc --noEmit`
  Expected: Code 0
- [ ] **Step 6: Commit**

---

### Task 5: Systematize Design Tokens across Builder Components (Zero Hardcoded CSS)
**Files:**
- Modify: `src/components/platform/strategies/builder/CompactStrategyBlockRow.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyRuleComposer.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBlockInspector.tsx`
- Modify: `src/components/platform/strategies/builder/BacktestScopeControls.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBacktestPanel.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyConfigurationPanel.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyStageNavigation.tsx`
- Modify: `src/components/platform/strategies/builder/IndicatorPicker.tsx`
- Modify: `src/components/platform/strategies/StrategiesPageView.tsx`

**Interfaces:**
- Replace all raw `#787b86`, `#089981`, `#f23645`, `#2962ff`, `#8b5cf6`, `#d6a316`, `border-white/10`, `hover:bg-white/[0.04]` with `text-plt-muted`, `text-plt-profit`, `text-plt-risk`, `text-brand-blue`, `text-plt-violet`, `text-plt-warning`, `border-plt-border`, `hover:bg-plt-hover`, `.pill-switch`, `.select-token`, `.drawer-sheet`, etc.

- [ ] **Step 1: Update `CompactStrategyBlockRow.tsx` & `StrategyRuleComposer.tsx`**
- [ ] **Step 2: Update `StrategyBlockInspector.tsx` with `.drawer-*` classes**
- [ ] **Step 3: Update `StrategyStageNavigation.tsx`, `BacktestScopeControls.tsx`, and `StrategyBacktestPanel.tsx`**
- [ ] **Step 4: Audit for zero remaining hardcoded hex colors using grep script**
  Run: node audit script checking for arbitrary hex codes in `.tsx` files
  Expected: Clean
- [ ] **Step 5: Run Vitest & Type Check**
  Run: `cmd /c npx vitest run src/components/platform/strategies/builder`
  Run: `cmd /c npx tsc --noEmit`
  Expected: Code 0
- [ ] **Step 6: Commit**

---

### Task 6: End-to-End Build & Runtime Verification
- [ ] **Step 1: Run full test suite**
  Run: `cmd /c npx vitest run src/components/platform/strategies/builder`
  Expected: 13/13 tests pass
- [ ] **Step 2: Run TypeScript compiler**
  Run: `cmd /c npx tsc --noEmit`
  Expected: 0 errors (Exit code 0)
- [ ] **Step 3: Run production Next.js build**
  Run: `cmd /c npm run build`
  Expected: Exit code 0 across all 13 routes
