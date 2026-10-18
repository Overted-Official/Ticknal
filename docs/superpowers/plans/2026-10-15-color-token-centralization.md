# Color Token Centralization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate all hardcoded dark color literals (`text-white`, `bg-black`, `border-white/10`, `hover:bg-white/[0.04]`, hex values) across the platform in favor of centralized design system tokens in `src/app/globals.css`, preparing the application for a seamless Light/Dark theme toggle.

**Architecture:** Replace component-level hardcoded literals with semantic Tailwind `@theme inline` aliases backed by CSS variables (`bg-plt-base`, `text-plt-text`, `text-plt-muted`, `border-plt-border`, `bg-plt-hover`). This keeps the current pure pitch-black appearance intact while unlocking theme inversion via a single CSS block in `globals.css`.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4 (`@theme inline`), TypeScript.

**Spec:** Ticknal Design System (`src/app/globals.css`, `.agents/skills/ticknal-tv-design/SKILL.md`, `references/foundations.md`).

## Global Constraints

- Never use `font-mono`. Numeric alignment must use `tabular-nums`.
- Pure pitch-black (`#000000` / `bg-plt-base`) and transparent surfaces (`bg-transparent`) must remain visually identical in dark mode.
- Hovercards and popovers exclusively use `#3D3D3D` (`bg-plt-hovercard` / `.surface-popover`).
- Drawers and main sheets remain sharp-edged (`rounded-none`).
- Every task must pass `npx tsc --noEmit` and maintain 0 regression in tests (`npm test`).

## Review Focus

1. **Button Inversion Danger**: Primary CTA buttons with dark background (`bg-primary text-primary-foreground` or white pills) must keep high-contrast text and not inadvertently become invisible.
2. **Badges & Severity Colors**: Profit (`plt-profit`), Risk (`plt-risk`), Info (`plt-info`), and Warning (`plt-warning`) must retain semantic meaning and not be replaced by generic muted text.
3. **Canvas / Charting Context**: TradingView Lightweight Charts and SVG charts must read colors via `cssTokenColor` or CSS variables, not hardcoded canvas strings.
4. **Hairline Border Visibility**: Faint dividers (`border-white/[0.06]`) must map to `border-plt-border-soft` so they remain delicate hairlines.
5. **Brand Typography & Marks**: `<TicknalBrand />` must retain Euclid Circular Semibold, lowercase wordmark, and `-0.04em` tracking.

---

### Task 1: Audit & Token Alignment in `src/app/globals.css`

**Files:**
- Modify: `src/app/globals.css`

- [x] Audit `@theme inline` in `globals.css` to verify that all necessary semantic aliases exist:
  - Backgrounds: `bg-plt-base`, `bg-plt-surface`, `bg-plt-raised`, `bg-plt-hover`, `bg-plt-active`, `bg-plt-chart`, `bg-plt-hovercard`, `bg-plt-overlay`
  - Text: `text-plt-text`, `text-plt-subtle`, `text-plt-muted`, `text-plt-faint`, `text-plt-inverse`
  - Borders: `border-plt-border`, `border-plt-border-soft`, `border-plt-border-strong`, `border-plt-border-active`
  - Accents: `text-plt-profit`, `text-plt-risk`, `text-plt-info`, `text-plt-warning`, `text-plt-violet`
- [x] Ensure `border-plt-border-soft` maps to `--border-card` or `--plt-border-soft` for subtle hairlines.
- [x] Run `npx tsc --noEmit` to ensure CSS definitions compile cleanly.

---

### Task 2: Centralize Shell, Navigation, Drawers & Modals

**Files:**
- Modify: `src/components/navigation/BottomNav.tsx`
- Modify: `src/components/navigation/MobileMoreDrawer.tsx`
- Modify: `src/components/platform/RightSidebar.tsx`
- Modify: `src/components/platform/BottomToolbar.tsx`
- Modify: `src/components/platform/NotificationsDrawer.tsx`
- Modify: `src/components/platform/AddOrderModal.tsx`
- Modify: `src/components/platform/CloseOrderModal.tsx`
- Modify: `src/components/platform/EditOrderModal.tsx`
- Modify: `src/components/platform/QuickAddDrawer.tsx`
- Modify: `src/components/platform/PinLockScreen.tsx`
- Modify: `src/components/ui/LoadingScreen.tsx`
- Modify: `src/components/ui/Skeleton.tsx`

- [x] In `BottomNav.tsx` and `MobileMoreDrawer.tsx`, replace `bg-black` with `bg-plt-base`, `text-white` with `text-plt-text`, and `border-white/10` with `border-plt-border`.
- [x] In `NotificationsDrawer.tsx` and order modals (`AddOrderModal`, `CloseOrderModal`, `EditOrderModal`, `QuickAddDrawer`), replace hardcoded black backgrounds and white borders with `bg-plt-base` and `border-plt-border`.
- [x] In `RightSidebar.tsx` and `BottomToolbar.tsx`, replace `bg-black` and `text-white` with `bg-plt-base` and `text-plt-text`.
- [x] In `Skeleton.tsx` and `LoadingScreen.tsx`, ensure placeholder pulses use `bg-plt-hover` or `bg-white/[0.04]` through token.
- [x] Run `npx tsc --noEmit` and verify no syntax or type breakages.

---

### Task 3: Centralize Home Screen Components

**Files:**
- Modify: `src/components/platform/home/MobileHomeHero.tsx`
- Modify: `src/components/platform/home/MobileSearchScreen.tsx`
- Modify: `src/components/platform/home/HomeFloatingNav.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/KPICard.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/NetWorthKPIRail.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/BanksKPIRail.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/FinancialsKPIRail.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/IndexPill.tsx`
- Modify: `src/components/platform/home/investments/performance/kpi-rails/IndexPillRail.tsx`
- Modify: `src/components/platform/home/investments/positions/PositionRowItem.tsx`
- Modify: `src/components/platform/home/investments/positions/TickerPositionsDrawer.tsx`
- Modify: `src/components/platform/home/investments/signals/MarketSignalRowItem.tsx`
- Modify: `src/components/platform/home/investments/signals/MarketSignalsSection.tsx`

- [x] In `MobileHomeHero.tsx` and `MobileSearchScreen.tsx`, replace `bg-black`, `text-white`, `text-neutral-400`, and `border-white/10` with `bg-plt-base`, `text-plt-text`, `text-plt-muted`, and `border-plt-border`.
- [x] In `KPICard.tsx`, `IndexPill.tsx`, and the KPI rails, replace `text-white` with `text-plt-text` for titles and metric figures.
- [x] In `PositionRowItem.tsx` and `TickerPositionsDrawer.tsx`, replace row literals with semantic tokens (`text-plt-text`, `text-plt-muted`, `border-plt-border-soft`, `hover:bg-plt-hover`).
- [x] In `MarketSignalRowItem.tsx` and `MarketSignalsSection.tsx`, centralize badge borders and labels.
- [x] Run `npx tsc --noEmit` and verify clean type check.

---

### Task 4: Centralize Markets Screen Components

**Files:**
- Modify: `src/components/platform/markets/MarketsFloatingNav.tsx`
- Modify: `src/components/platform/markets/SectorRotationMatrix.tsx`
- Modify: `src/components/platform/markets/SectorTreemap.tsx`
- Modify: `src/components/platform/markets/sections/MajorIndicesSection.tsx`
- Modify: `src/components/platform/markets/sections/MarketHeatmapSection.tsx`
- Modify: `src/components/platform/markets/sections/InvestorFlowSection.tsx`
- Modify: `src/components/platform/markets/sections/MoneySupplySection.tsx`
- Modify: `src/components/platform/markets/sections/SectorConcentrationFlowPanel.tsx`
- Modify: `src/components/platform/markets/sections/SectorConstituentRowItem.tsx`
- Modify: `src/components/platform/markets/sections/SectorRotationSection.tsx`
- Modify: `src/components/platform/markets/sections/FxDevaluationSection.tsx`

- [x] In `MarketsFloatingNav.tsx` and section headers, replace `text-white` with `text-plt-text`.
- [x] In `SectorRotationMatrix.tsx` and `SectorTreemap.tsx`, replace `bg-black` container shells with `bg-plt-base` / `bg-transparent`.
- [x] In `MajorIndicesSection.tsx`, `InvestorFlowSection.tsx`, and `MoneySupplySection.tsx`, replace table/card borders (`border-white/10`) with `border-plt-border` and text literals with `text-plt-text` / `text-plt-muted`.
- [x] Run `npx tsc --noEmit` and verify clean type check.

---

### Task 5: Centralize Charts & Strategy Report Components

**Files:**
- Modify: `src/components/platform/ChartWidget.tsx`
- Modify: `src/components/platform/chart/ChartTopBar.tsx`
- Modify: `src/components/platform/chart/ChartTickerHeader.tsx`
- Modify: `src/components/platform/chart/ChartIndicatorsPopover.tsx`
- Modify: `src/components/platform/chart/ChartPredictPopover.tsx`
- Modify: `src/components/platform/chart/HydraIndexPanel.tsx`
- Modify: `src/components/platform/chart/SmartMoneyPanel.tsx`
- Modify: `src/components/platform/chart/canonical/CanonicalIndicatorPane.tsx`
- Modify: `src/components/platform/chart/canonical/CanonicalIndicatorWorkspace.tsx`
- Modify: `src/components/platform/chart/canonical/CanonicalMarketDrawer.tsx`
- Modify: `src/components/platform/chart/canonical/CanonicalMetricsDock.tsx`
- Modify: `src/components/platform/chart/canonical/IndicatorBrowserEntry.tsx`
- Modify: `src/components/platform/chart/canonical/IndicatorParameterEditor.tsx`
- Modify: `src/components/platform/chart/strategy-report/StrategyReportDrawer.tsx`
- Modify: `src/components/platform/chart/strategy-report/StrategyReportHeader.tsx`
- Modify: `src/components/platform/chart/strategy-report/StrategyReportTabBar.tsx`
- Modify: `src/components/platform/chart/strategy-report/components/ExecutionLevelsCard.tsx`
- Modify: `src/components/platform/chart/strategy-report/components/KeyStatsGrid.tsx`
- Modify: `src/components/platform/chart/strategy-report/tabs/ListOfTradesTab.tsx`
- Modify: `src/components/platform/chart/strategy-report/components/EquityCurveChart.tsx`

- [x] In `ChartTopBar.tsx` and `ChartTickerHeader.tsx`, replace `text-white` buttons and dropdowns with `text-plt-text` and `border-plt-border`.
- [x] In indicator popovers and browser drawers, replace `bg-black` with `bg-plt-base` and dividers with `border-plt-border`.
- [x] In `StrategyReportDrawer.tsx` and tabs (`ListOfTradesTab.tsx`, `KeyStatsGrid.tsx`, `ExecutionLevelsCard.tsx`), replace `text-white` with `text-plt-text` and `bg-black` with `bg-plt-base`.
- [x] In `EquityCurveChart.tsx`, ensure SVG axis lines and labels use CSS variables (`var(--plt-text-muted)` and `var(--plt-border)`).
- [x] Run `npx tsc --noEmit` and verify clean type check.

---

### Task 6: Centralize Strategies & Builder Components

**Files:**
- Modify: `src/components/platform/strategies/StrategiesPageView.tsx`
- Modify: `src/components/platform/strategies/builder/AdvancedStrategyBuilder.tsx`
- Modify: `src/components/platform/strategies/builder/SimpleStrategyBuilder.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBlockInspector.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBacktestPanel.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyBacktestTreemap.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyFlowCanvas.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyTickerSearchSelect.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyTimeRangeSelector.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyCompanyResultsPanel.tsx`
- Modify: `src/components/platform/strategies/builder/StrategyLiveUniversePanel.tsx`
- Modify: `src/components/platform/strategies/builder/BacktestScopeControls.tsx`
- Modify: `src/components/platform/strategies/builder/AdvancedBlockLibraryModal.tsx`

- [x] In `StrategiesPageView.tsx`, replace `bg-black` with `bg-plt-base` and `text-white` with `text-plt-text`.
- [x] In `StrategyBlockInspector.tsx` and `StrategyConfigurationPanel.tsx`, replace inspector background and typography with semantic tokens.
- [x] In `StrategyBacktestPanel.tsx` and company results panels, replace table borders and labels with `border-plt-border` and `text-plt-text`.
- [x] In `AdvancedBlockLibraryModal.tsx`, replace modal backdrop and container literals with `bg-plt-base` and `border-plt-border`.
- [x] Run `npx tsc --noEmit` and verify clean type check.

---

### Task 7: Centralize News, Transactions, Wallet, Settings & Console

**Files:**
- Modify: `src/components/platform/news/NewsPageView.tsx`
- Modify: `src/components/platform/news/widgets/FeedPost.tsx`
- Modify: `src/components/platform/news/widgets/NewsFilterSidebar.tsx`
- Modify: `src/components/platform/news/widgets/NewsImageLightbox.tsx`
- Modify: `src/components/platform/news/widgets/SocialShareModal.tsx`
- Modify: `src/components/platform/transactions/TransactionsLedgerSection.tsx`
- Modify: `src/components/platform/transactions/TransactionsKPIRail.tsx`
- Modify: `src/components/platform/transactions/TransactionsDateRangeSelector.tsx`
- Modify: `src/components/platform/transactions/TransactionsFloatingNav.tsx`
- Modify: `src/components/platform/wallet/AccountBalanceHistoryDrawer.tsx`
- Modify: `src/components/platform/wallet/AccountSelectDropdown.tsx`
- Modify: `src/components/platform/wallet/BankSearchSelect.tsx`
- Modify: `src/components/platform/settings/LanguagePreferencesCard.tsx`
- Modify: `src/components/platform/settings/PinSecurityCard.tsx`
- Modify: `src/components/platform/settings/PinSetupModal.tsx`
- Modify: `src/components/platform/settings/PushDevicesWidget.tsx`
- Modify: `src/components/platform/settings/PushNotificationCard.tsx`
- Modify: `src/components/platform/settings/UserProfileWidget.tsx`
- Modify: `src/components/platform/settings/SettingsHeader.tsx`
- Modify: `src/components/platform/settings/SettingsFloatingNav.tsx`
- Modify: `src/components/platform/console/users/ConsoleUserDetailDrawer.tsx`
- Modify: `src/components/platform/console/subscriptions/pricing-plans/EditPlanDrawer.tsx`

- [x] In News (`FeedPost.tsx`, `NewsFilterSidebar.tsx`, etc.), replace `text-white` and `bg-black` with `text-plt-text` and `bg-plt-base`.
- [x] In Transactions ledger and wallet drawers, replace table borders and modal sheets with `border-plt-border` and `bg-plt-base`.
- [x] In Settings cards, replace section headers, input outlines, and modal sheets with `border-plt-border`, `text-plt-text`, and `bg-plt-base`.
- [x] In Console drawers (`ConsoleUserDetailDrawer.tsx`, `EditPlanDrawer.tsx`), replace drawer sheets with `bg-plt-base` and `border-plt-border`.
- [x] Run `npx tsc --noEmit` and verify clean type check.

---

### Task 8: End-to-End Build & Visual Regression Verification

- [x] Run full TypeScript compilation: `npx tsc --noEmit` &rarr; verify exit code 0.
- [x] Run full Vitest test suite: `npm test` &rarr; verify all 348 tests pass.
- [x] Run production Next.js build: `npm run build` &rarr; verify exit code 0.
- [x] Run grep sanity check to ensure authenticated platform files no longer contain orphaned hardcoded literals.
