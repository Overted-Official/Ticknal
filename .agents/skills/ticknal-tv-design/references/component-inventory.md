# Production Component Inventory

Use this map to find precedent. Copy the architecture and semantic classes, not incidental hard-coded values.

## Global system

| Concern | Source |
|---|---|
| Tokens, Tailwind aliases, semantic classes, responsive/RTL rules | `src/app/globals.css` |
| Brand mark/wordmark | `src/components/ui/TicknalBrand.tsx` |
| Shared icon surface | `src/components/ui/icon-library` |
| Inline loading | `src/components/ui/InlineSpinner.tsx` |
| Section loading | Search for `SectionLoadingState` |
| Privacy state | Search for `usePrivacyMode` |

## Landing

| Pattern | Production reference | Study |
|---|---|---|
| Page composition | `src/components/landing/LandingPageView.tsx` | Ordered sections, black root |
| Fixed glass navigation | `LandingNavbar.tsx` | Active scroll section, locale, brand, CTA |
| Hero | `LandingHero.tsx` | Display type, gradient emphasis, CTA |
| Decorative hero visual | `HeroLightCables.tsx` | Pointer-inert visual layer |
| Product device stage | `LandingDeviceStage.tsx` | Device frames and responsive staging |
| Live proof marquee | `LandingTickerMarquee.tsx` | Ticker pill and three rails |
| Asset showcase | `LandingAssetCoverage.tsx` | Marketing cards, chart/list hierarchy |
| Sequential workflow | `LandingWorkflowPipeline.tsx` | Steps, selected content, motion |
| Broker workflow | `LandingBrokerWorkflowSection.tsx` | Responsive marketing card rail |
| Pricing | `LandingPricingSection.tsx` | Plan enclosure, billing selector, features |
| Final CTA | `LandingCtaSection.tsx` | Conversion emphasis |
| FAQ | `LandingFaqSection.tsx` | Sticky intro + accordion |
| Footer | `LandingFooter.tsx` | Closing navigation/legal hierarchy |
| Smooth scrolling | `SmoothScroll.tsx` | Marketing-only scroll behavior |

## Home

| Pattern | Production reference | Study |
|---|---|---|
| Page composition | `src/components/platform/home/HomePageView.tsx` | Command shell, refresh, section order |
| Floating section nav | `HomeFloatingNav.tsx` | Inner-scroll targeting and scroll spy |
| Page header | `investments/HomeInvestmentsHeader.tsx` | Breadcrumb and compact page identity |
| Section header and tab modes | `investments/performance/PerformanceOverviewSection.tsx` | Desktop/mobile control placement |
| KPI card | `investments/performance/kpi-rails/KPICard.tsx` | Metric hierarchy and sparkline |
| Responsive KPI rail | `FinancialsKPIRail.tsx` / `NetWorthKPIRail.tsx` | Snap rail → grid |
| Selectable data rail | `IndexPill.tsx` / `IndexPillRail.tsx` | Selected item and horizontal navigation |
| Chart toolbar | `investments/performance/PerformanceChartToolbar.tsx` | Canonical timeframe control |
| Main chart | `investments/performance/PerformanceChart.tsx` | Area/line composition |
| Chart tooltip | `investments/performance/PerformanceChartTooltip.tsx` | Compact tabular detail |
| Donut/table breakdown | `SectorBreakdownChart.tsx` | Distribution with detail table |
| Positions section | `investments/positions/MyPositionsSection.tsx` | Mobile tabs, desktop split, footer |
| Position row | `investments/positions/PositionRowItem.tsx` | Clickable dense row |
| Responsive detail drawer | `investments/positions/TickerPositionsDrawer.tsx` | Bottom sheet → side sheet |
| Signals section | `investments/signals/MarketSignalsSection.tsx` | Strategy/time filters and results |
| Signal row | `investments/signals/MarketSignalRowItem.tsx` | Dense actionable market row |
| Strategy selector | `investments/signals/StrategySwitcher.tsx` | Scrollable segmented control |

## Markets

| Pattern | Production reference | Study |
|---|---|---|
| Page coordination | `src/components/platform/markets/MarketsPageView.tsx` | Shared state, SWR, guest flow |
| Floating section nav | `MarketsFloatingNav.tsx` | Page-specific labels on shared pattern |
| Overview composition | `sections/MarketOverviewSection.tsx` | Timeframe, five KPIs, nested analyses |
| Major index chart | `sections/MajorIndicesSection.tsx` | Index rail + progression chart |
| Investor flow | `sections/InvestorFlowSection.tsx` | Share/net modes and summary |
| FX/macro section | `sections/FxDevaluationSection.tsx` | Status badge, KPI rail |
| Money supply chart | `sections/MoneySupplySection.tsx` | Indicator rail and long horizon |
| Rotation workspace | `sections/SectorRotationSection.tsx` | Canvas + inspector + mobile drawer |
| Rotation plot | `SectorRotationMatrix.tsx` | Quadrants, badges, axes |
| Concentration inspector | `sections/SectorConcentrationFlowPanel.tsx` | Transparent detail rail |
| Heatmap workspace | `sections/MarketHeatmapSection.tsx` | Multiple controls + detail rail/drawer |
| Treemap | `SectorTreemap.tsx` | Hierarchy, sizing, return colors, hovercard |
| Constituent row | `sections/SectorConstituentRowItem.tsx` | Ticker detail row |

## Shared class catalog from `globals.css`

### Page/layout

- `.app-shell`
- `.app-page`
- `.page-content-wide`
- `.command-surface-page`
- `.page-sections-stack`
- `.section-container`
- `.section-viewport-fit`
- `.widget-grid`
- `.widget-stack`
- `.widget-row-gap`
- `.kpi-grid-2`
- `.kpi-grid-4`
- `.insights-grid`

### Typography

- `.page-title` / `.page-subtitle`
- `.section-title` / `.section-subtitle`
- `.widget-title` / `.widget-subtitle`
- `.kpi-title`
- `.font-euclid` / `.ticknal-wordmark`

### Surfaces and cards

- `.surface-flush`
- `.surface-popover`
- `.hover-card` / `.hovercard-surface`
- `.empty-state`
- `.tv-kpi-card`
- `.tv-filmstrip-track`

Use legacy `.card-shell`/`.card-widget` only when maintaining an existing component whose design explicitly depends on it. For new top-level widgets, prefer transparent `.section-container` composition.

### Controls/forms

- `.seg-control` / `.seg-control-btn` / `.seg-control-btn-active`
- `.seg-control-compact`
- `.filter-control-btn` / `.filter-reset-btn`
- `.input-control-compact`
- `.btn-token` plus size/variant classes
- `.btn-icon` / `.btn-icon-compact`
- `.tab-button` / `.tab-button-active`
- `.pill-switch` (legacy compatible; prefer `.seg-control` for platform analytical filters)
- `.select-token` / `.date-token` / `.input-token`
- `.toggle-token`
- `.field-*` for established Home forms

### Badges/data

- `.badge` and semantic variants
- `.badge-count`
- `.badge-symbol`
- `.status-dot`
- `.data-table`
- `.allocation-bar-fill`
- `.strategy-decision-*`
- `.holding-position-*`

### Drawers/overlays

- `.drawer-overlay`
- `.drawer-backdrop`
- `.drawer-sheet` / `.drawer-sheet-form`
- `.drawer-sheet-viewport-safe` / `.drawer-sheet-viewport-safe-fixed`
- `.drawer-gradient-top`
- `.drawer-header` / `.drawer-body` / `.drawer-footer`
- `.drawer-drag-pill`
- `.drawer-close-btn` / `.drawer-cancel-btn` / `.drawer-confirm-btn`
- `.safe-area-top` / `.safe-area-bottom`

### Scrolling/motion

- `.custom-scrollbar`
- `.no-scrollbar`
- `.animate-marquee` / `.animate-marquee-reverse`
- `.animate-in`

## Reuse audit

Before writing a new component, search:

~~~powershell
rg "section-container|seg-control|drawer-sheet|tv-kpi-card|data-table" src/components src/app
rg --files src/components/landing src/components/platform/home src/components/platform/markets
~~~

If a close pattern exists, extend/extract it. If two pages already carry near-identical implementations—such as Home and Markets floating nav—prefer a shared data-driven primitive in future work.

## Known migration cautions

Production components contain some historical local values. Do not propagate:

- gray/navy main panel fills;
- hard-coded tooltip surfaces that are not `#3D3D3D`;
- local pill-switch hex colors;
- `font-mono`;
- gray sticky table headers;
- duplicate drawer geometry;
- repeated floating-nav implementations.

The target direction is semantic `globals.css` tokens/classes plus the rules in this skill.
