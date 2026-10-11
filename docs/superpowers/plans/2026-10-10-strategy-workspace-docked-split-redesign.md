# Strategy Workspace Docked Collapsible Split Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the Strategy Studio into a single-viewport desktop workspace with a docked collapsible builder on the left and a dual-deck analytical results view (Macro Treemap Backtest + Micro Candlestick Visualization) on the right, keeping all existing builder blocks and the Simple/Advanced switch intact.

**Architecture:** Replace the disconnected 3-stage wizard tab navigation (`Build`, `Visualize`, `Backtest`) with a responsive split layout. The left column (45% width, collapsible to a 48px rail) hosts the untouched `StrategyConfigurationPanel` with its Simple/Advanced switcher. The right column (55% width, expanding to 100% when the left is collapsed) hosts a unified results deck with a `[ Market Backtest | Company Chart ]` mode toggle. The Treemap follows the user's rule: green for profit, red for loss, and tile sizing proportional to return magnitude, with an instant cross-filtering bridge where clicking any sector or stock flips to its candlestick chart.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, TradingView Lightweight Charts, Squarified Treemap layout algorithm (`src/lib/finance/treemapMath.ts`), `ticknal-tv-design` primitives.

**Spec & Design Principles:**
- `ticknal-tv-design` design tokens:
  - Pure black surfaces (`#000000` / `bg-black` / `bg-transparent`); zero dark-gray widget panels.
  - Hairline borders (`border-white/10`, `border-white/[0.06]`).
  - Standard controls (`.seg-control`, `.seg-control-btn`, `.btn-token`, `.tv-kpi-card`, `.data-table`).
  - No `font-mono`; all numeric figures use sans-serif with `tabular-nums`.
  - Treemap colors: Pure profit green (`#059669` / `var(--plt-profit)`) if return > 0; pure risk red (`#dc2626` / `var(--plt-risk)`) if return < 0.
  - Treemap sizing: Direct strategy return magnitude (`Math.abs(returnPct)`), so a large green box immediately signifies a big win.

## Global Constraints
- Preserve all existing strategy builder logic, parameters, inspector, and block components without modification.
- Retain the `simple` vs `advanced` segmented switch.
- Drawer geometry must strictly be square-edged (`rounded-none`) and pure pitch black (`#000000`).
- Proactively run `npm run build` and `npx tsc --noEmit` before completion and ensure exit code 0 with zero console/runtime warnings.

## Review Focus
1. **Builder collapse/expand state transitions**: Toggling the collapse button should smoothly transition widths without chart rendering breaks or canvas clipping.
2. **Treemap cross-filtering link**: Clicking any sector/group/ticker tile in the Treemap must update the selected ticker and switch to the Company Chart view with zero page reload.
3. **Treemap visual clarity**: Tiles must render readable labels, ticker logos/symbols, and return badges; tiles with small returns should not break squarified calculations.
4. **TradingView resize observer**: When the right results container changes width (e.g. 55% -> 100%), the multi-pane TradingView candlestick charts must resize cleanly.
5. **Arabic / RTL compliance**: Collapse directions, icons (`[◀]` / `[▶]`), and table alignments must flip properly in RTL mode.

---

### Task 1: Create the Simplified Strategy Treemap Component (`StrategyBacktestTreemap.tsx`)

**Files:**
- Create: `src/components/platform/strategies/builder/StrategyBacktestTreemap.tsx`
- Test: Unit/render verification in build + TypeScript check.

**Steps:**
- [ ] Create `StrategyBacktestTreemap.tsx` wrapping `computeTreemap` from `src/lib/finance/treemapMath.ts`.
- [ ] Implement the simplified color model:
  - If `returnPct > 0`: Emerald/Green (`bg-[#059669]/25 hover:bg-[#059669]/35 border-[#059669] text-white`).
  - If `returnPct < 0`: Red (`bg-[#dc2626]/20 hover:bg-[#dc2626]/30 border-[#dc2626] text-white`).
  - If `returnPct === 0`: Neutral muted border/fill.
- [ ] Implement sizing proportional to strategy return magnitude: `value = Math.max(1, Math.abs(row.returnPct))`.
- [ ] Render tile labels with ticker/sector name, strategy return badge with `tabular-nums`, and trade count.
- [ ] Support click callback: `onSelectTile(tileId, tickerSymbol)` to trigger cross-filtering to the Company Chart.
- [ ] Add `.surface-popover` hover tooltip showing detailed breakdown (Net ROI, Alpha, Win Rate, Closed Trades).

---

### Task 2: Create the Unified Results Deck (`StrategyResultsDeck.tsx`)

**Files:**
- Create: `src/components/platform/strategies/builder/StrategyResultsDeck.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBacktestPanel.tsx` (integrate simplified treemap and bridge).

**Steps:**
- [ ] Create `StrategyResultsDeck.tsx` to host the right-hand analytical side.
- [ ] Add top deck control bar:
  - View mode segmented switcher: `[ 🗺️ Market Backtest | 📈 Company Chart ]` using `.seg-control`.
  - Strategy KPI badges using `.tv-kpi-card` or compact KPI rail (Net Profit, Alpha, Win Rate, Max Drawdown).
  - Mode-specific controls:
    - If `Market Backtest`: Granularity (`Sector | Group | Industry | Ticker`) + View (`Treemap | Table`) + Scope controls.
    - If `Company Chart`: Ticker Search-Select dropdown + timeframe selector (`1D | 1W | 1M`).
- [ ] Wire the `Market Backtest` view to render `StrategyBacktestTreemap` or `BacktestTable`.
- [ ] Wire the `Company Chart` view to render `UnifiedStrategyChart` with its synchronized 3 panes (Candlestick + EGX30 index + Indicator smoothing).
- [ ] Implement cross-filtering: clicking a tile in the Treemap sets the active ticker and sets view mode to `'chart'`.

---

### Task 3: Restructure Workspace into Docked Collapsible Split (`StrategyBuilderWorkspace.tsx`)

**Files:**
- Modify: `src/components/platform/strategies/builder/StrategyBuilderWorkspace.tsx`

**Steps:**
- [ ] Remove the obsolete 3-stage wizard navigation (`StrategyStageNavigation`).
- [ ] Add state: `isStudioCollapsed` (boolean, defaults to `false`).
- [ ] Keep the top header with Strategy Selector Dropdown, Strategy name, and `[ + Create New ]`.
- [ ] Render the desktop grid split:
  - **Left Studio Column**:
    - When expanded: ~45% width (`lg:col-span-5` or `w-[45%]`). Contains `[ ◀ Collapse Studio ]` button, the **Simple / Advanced mode switch**, and the untouched `StrategyConfigurationPanel`.
    - When collapsed: 48px slim rail (`w-[48px]`). Displays `[ ▶ ]` expand button, vertical strategy indicator, block count badge.
  - **Right Results Column**:
    - When left is expanded: ~55% width (`lg:col-span-7` or `w-[55%]`).
    - When left is collapsed: 100% full width (`w-full`).
    - Embeds `StrategyResultsDeck` with resize handler.
- [ ] Ensure mobile fallback: cleanly stacks Builder on top and Results Deck below.

---

### Task 4: Polish TradingView Resize & Cross-Filter Bridge

**Files:**
- Modify: `src/components/platform/strategies/builder/UnifiedStrategyChart.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyTickerSearchSelect.tsx`

**Steps:**
- [ ] Ensure `ResizeObserver` in `UnifiedStrategyChart` dynamically adjusts chart widths when toggling `isStudioCollapsed` between 45% and 100% width.
- [ ] Verify crosshairs, synchronized time scale, and zoom levels remain locked when switching between stocks from the Treemap.
- [ ] Test ticker selection sync: selecting from the dropdown or clicking a treemap tile updates both the chart data and the active ticker state in unison.

---

### Task 5: Build, Typecheck, and Runtime Verification (STRICT)

**Files:**
- Verification only.

**Steps:**
- [ ] Run `npx tsc --noEmit` and ensure 0 type errors.
- [ ] Run `npm run build` and ensure successful production build.
- [ ] Verify browser console cleanliness, zero hydration mismatches, and responsive behavior.
