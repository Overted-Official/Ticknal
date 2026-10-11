# Strategies Workspace Modular UI Redesign & Token Systematization Design Spec

**Date:** 2026-10-08  
**Scope:** `src/app/(main)/strategies` and `src/components/platform/strategies`  
**Status:** Approved by Human Partner  

---

## 1. Context & Objectives

The Ticknal Strategies workspace allows everyday Egyptian investors to build, visualize, and backtest zero-code trading algorithms. In transitioning from the MVP prototype to the live modular interface, the application must uphold two strict architectural quality gates:

1. **Zero Monolith Files & Maximum Modularity**: Every component must adhere to single-responsibility architecture, keeping files focused, testable, and under ~200 lines.
2. **Zero Hardcoded CSS & Design Token Systematization**: All visual styles (colors, backgrounds, borders, typography, controls) must strictly consume design tokens and classes already defined in `src/app/globals.css`. No new classes or tokens may be added to `globals.css`.
3. **Strict Zero-Egress / Local Data**: No network calls or Supabase queries may be introduced; all preview calculations and charts remain 100% deterministic local fixtures.
4. **Preserve Legacy Assets**: Decommissioned legacy MVP sections (`sections/` and `StrategiesFloatingNav.tsx`) must be moved to `_archived/strategies-mvp-sections/` rather than deleted.

---

## 2. Archival of Legacy Sections

The following unused legacy components are quarantined from the active source tree into `_archived/strategies-mvp-sections/`:
- `src/components/platform/strategies/sections/` (including the 1,643-line `AlphaBreakdownSection.tsx`, `StrategySimulationSection.tsx`, `StrategyModelComparisonSection.tsx`, etc.)
- `src/components/platform/strategies/StrategiesFloatingNav.tsx`

---

## 3. Component Architecture & Decomposition

### A. Stage 1: Build Workflow (`AdvancedStrategyBuilder.tsx`)
Currently 707 lines. Decomposed into:
1. **`CompactAdvancedNodeCard.tsx`** (~110 lines):
   - Renders a node's card using `CompactStrategyBlockRow`.
   - Displays icon, stage-based tone, parameter badges, port connectivity status, and inspection triggers.
2. **`AdvancedBlockLibraryModal.tsx`** (~130 lines):
   - Categorized block selection modal (Market Data, Indicators, Calculations, Rules, Combine, Protection).
   - Filter input, keyboard navigation, and add-block dispatcher.
3. **`AdvancedWorkflowAreaSection.tsx`** (~125 lines):
   - Renders visual workflow areas (Setup: Data & Calculations; Execution: Buy, Position, Sell).
   - Connective SVG direction arrows and empty area prompts.
4. **`AdvancedStrategyBuilder.tsx`** (~170 lines):
   - Lean canvas coordinator managing node state, active inspector/modal, and layout grid.

### B. Stage 2: Visualize Workflow (`StrategyVisualizationPanel.tsx`)
Currently 558 lines. Decomposed into:
1. **`CandlestickPriceChart.tsx`** (~150 lines):
   - Pure responsive SVG chart rendering TradingView-authentic green/red candlesticks, wicks, buy/sell markers, grid levels, Y-axis price labels, and hover crosshair HUD.
2. **`StrategySeriesLegend.tsx`** (~80 lines):
   - Clickable `Mapped Blocks & Series` bar mapping chart series to source blocks in Build with bidirectional focus states.
3. **`StrategyIndicatorPaneCard.tsx`** (~75 lines):
   - Renders an indicator or calculation chart pane (Line or Bar) with focused block styling.
4. **`StrategyVisualizationPanel.tsx`** (~150 lines):
   - Stage header, timeframe switcher, date-range bounds badge, Area/Candles toggle, and subcomponent assembler.

---

## 4. Design System Token Mapping (No Hardcoded CSS)

All styles must map directly to tokens established in `src/app/globals.css`:

| Visual Concept | Legacy / Hardcoded Code | `globals.css` Token / Class |
| :--- | :--- | :--- |
| Muted Gray Text | `#787b86` | `text-plt-muted` / `text-cold-gray-500` |
| Primary Brand Blue | `#2962ff` | `text-brand-blue` / `bg-brand-blue` / `var(--color-tv-blue-500)` |
| Profit / Buy Green | `#089981` | `text-plt-profit` / `bg-plt-profit` / `border-plt-profit-border` |
| Risk / Sell Red | `#f23645` | `text-plt-risk` / `bg-plt-risk` / `border-plt-risk-border` |
| Calculation Violet | `#8b5cf6` | `text-plt-violet` / `bg-plt-violet` / `border-plt-violet-border` |
| Warning / State Amber | `#d6a316` / `#f59e0b` | `text-plt-warning` / `bg-plt-warning` / `border-plt-warning-border` |
| Pitch Black Surface | `#000000` / `#000` | `bg-black` / `bg-plt-base` |
| Hairline Borders | `border-white/10`, `rgba(255,255,255,.06)` | `border-plt-border` / `border-plt-border-soft` |
| Hover Highlights | `hover:bg-white/[0.04]` | `hover:bg-plt-hover` |
| Active Highlights | `bg-white/[0.08]` | `bg-plt-active` |
| Segmented Switches | Custom pill buttons | `.pill-switch`, `.pill-switch-btn`, `.pill-switch-btn-active` |
| Dropdowns | Custom `<select>` classes | `.select-token` |
| Badges & Tags | Custom rounded/border spans | `.badge`, `.badge-profit`, `.badge-risk`, `.badge-warning`, `.badge-muted` |
| Drawers & Sheets | Custom drawer divs | `.drawer-sheet`, `.drawer-header`, `.drawer-title`, `.drawer-body`, `.drawer-footer`, `.drawer-close-btn` |
| Numeric Alignment | Any numbers or dates | `tabular-nums font-sans` (strictly NO `font-mono`) |

---

## 5. Verification & Quality Assurance
1. **Zero Monoliths**: No file in `src/components/platform/strategies/builder/` exceeds ~350 lines; complex components remain under ~180 lines.
2. **Zero Hardcoded CSS**: Grep for `#` hex values and arbitrary style literals in builder `.tsx` files yields zero design tokens outside standard tokenized CSS variables.
3. **Zero TypeScript Errors**: `npx tsc --noEmit` exits with 0.
4. **All Tests Green**: `npx vitest run src/components/platform/strategies/builder` passes 100%.
5. **Clean Production Build**: `npm run build` exits with 0.
