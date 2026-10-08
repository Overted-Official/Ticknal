# Strategy Workspace: Build, Visualize, Backtest

## Objective

Turn the existing strategies page into a focused three-stage workspace for non-technical Egyptian investors:

1. Build a strategy with visual blocks.
2. Visualize what the configured logic does on one ticker.
3. Backtest the same unchanged strategy across market history and the EGX universe.

This iteration is an offline UI prototype. It must not persist strategies, activate notifications, query the database, or modify the protected Typhon, Cerberus, or Hydra strategy engines.

## Product Principles

- Preserve blocks as the core mental model. A user should be able to follow the strategy from inputs to calculations to trade decisions.
- Use progressive disclosure. The canvas shows concise summaries; configuration and education live in a contextual drawer.
- Keep one strategy state across all three stages. Visualize and Backtest never maintain separate copies of the strategy.
- Prefer plain investing language over implementation terminology.
- Make Simple the default for new users while preserving a lossless path into Advanced.

## Workspace Navigation

The strategy workspace has a horizontal stage switcher:

`01 Build → 02 Visualize → 03 Backtest`

Only one stage is visible at a time so the page remains focused and does not become a long dashboard. All stages remain directly clickable. Each stage displays a concise status:

- Build: incomplete, ready, or protected.
- Visualize: unavailable until the draft has sufficient logic, otherwise ready.
- Backtest: unavailable until the draft has sufficient logic, otherwise ready.

Build includes a primary `Continue to Visualize` action. Visualize includes `Back to Build` and `Continue to Backtest`. Backtest includes `Back to Visualize`.

## Stage 1: Build

Build retains the strategy selector, protected-strategy presentation, and the Simple/Advanced mode switch.

### Simple builder

Simple contains exactly two visual blocks:

- Buy Rules
- Sell Rules

Each block contains compact condition rows and an always-available add action. Conditions support the existing indicator selection, operator, period, comparison value, and AND/OR connector controls.

### Advanced builder

Advanced preserves the approved multi-stage workflow:

- Setup
  - Data & Indicators
  - Calculations
- Execution
  - Buy Logic
  - While Trade Is Open
  - Sell Logic

The workflow remains visibly connected with arrows. Typhon uses the same layout as a protected visual example, with no mutation controls.

### Simple-to-Advanced behavior

A Simple draft can be upgraded to Advanced without losing its rules. Simple buy and sell rules become the corresponding Advanced buy and sell conditions.

Once a user adds an Advanced-only capability, Simple becomes a read-only summary rather than an editable mode. The UI must explain that editing in Simple could not represent the complete strategy. No conversion may silently delete or rewrite logic.

### Compact block rows

Existing tall cards become compact rows. Each row contains:

- Type icon and block name.
- One-line configured summary, such as `RSI · 14 periods · Closing price`.
- Validation state when required.
- Information action.
- Configuration action for editable strategies.
- Remove action for editable, non-protected blocks.

Descriptions, metrics, tags, and full forms do not remain expanded inside the canvas.

### Inspector drawer

Selecting a row opens a square-edged, pure-black drawer. The drawer contains:

- Configure: settings and input connections.
- Learn: short plain-language explanation and an illustrative mini-chart.
- Output: named value and representative sample value.
- Used by: downstream blocks that consume the output.

The information action opens Learn directly. The configuration action opens Configure directly. Protected blocks omit mutation controls but retain Learn, Output, and Used by.

## Stage 2: Visualize

Visualize explains the configured strategy on a single ticker. It is not a performance report.

The stage contains:

- Ticker selector using local fixture tickers.
- Timeframe and date-range controls using local fixture values.
- Price/candlestick chart with illustrative buy and sell markers.
- Indicator and calculation panes derived from the blocks in Build.
- A compact legend mapping visible series back to their source blocks.

Selecting a block in Build establishes it as the initially focused series in Visualize. Selecting a series in Visualize highlights its source block when the user returns to Build.

For this UI iteration, all chart data and markers are deterministic local fixtures. There must be no database or external API calls.

If a custom draft is incomplete, Visualize shows a clear empty state with a `Return to Build` action. Protected strategies always have an illustrative visualization.

## Stage 3: Backtest

Backtest reuses the current backtest scope controls, KPI cards, build/unseen-period behavior, granularity controls, heatmap, and table.

It becomes a dedicated stage rather than a permanently visible section below the builder. Its strategy name and readiness come from the shared workspace state.

The existing static-fixture and zero-egress behavior remains unchanged in this iteration.

## Shared State and Component Boundaries

`StrategyBuilderWorkspace` remains the workspace owner and holds:

- Active stage.
- Selected strategy.
- Builder mode.
- Shared draft and revision.
- Selected/focused block.
- Local visualization controls.

Recommended component boundaries:

- `StrategyStageNavigation`: stage switching, status, and responsive behavior.
- `StrategyBuildStage`: strategy selection and Simple/Advanced builders.
- `CompactStrategyBlockRow`: concise block presentation.
- `StrategyBlockInspector`: configuration and educational drawer.
- `StrategyVisualizationPanel`: local single-ticker chart preview.
- `StrategyBacktestPanel`: existing backtest experience with minimal integration changes.

Block definitions remain schema-driven so new indicators, calculations, conditions, or protection blocks can be added without redesigning the workspace.

## Responsive and Accessibility Behavior

- The stage navigation remains readable at narrow widths and may horizontally scroll with visible affordance.
- Compact rows wrap their summaries rather than clipping controls.
- Advanced flows fit the available desktop width where possible and expose an obvious horizontal scrollbar only when necessary.
- Drawers use pure black, square edges, labelled controls, trapped focus, Escape-to-close, and focus restoration.
- All actions remain keyboard accessible with visible focus states and at least 44-pixel targets.
- Color never communicates buy, sell, validation, or completion without accompanying text or iconography.

## Validation and Failure States

- Empty Simple drafts identify the missing Buy or Sell side.
- Disconnected Advanced blocks show a concise warning and the missing connection in the inspector.
- Visualize and Backtest never fabricate readiness; incomplete drafts show stage-specific empty states.
- Switching strategies closes the inspector and clears stale focused-block state.
- Switching stages preserves unsaved local draft edits for the current browser session.

## Explicit Non-Goals

- Saving strategies to the database.
- Draft/active versioning.
- Push notification activation.
- Live, delayed, or intraday market-data ingestion.
- Real backtest execution.
- Brokerage integration or trade execution.
- Any changes to Typhon, Cerberus, or Hydra engine files or logic.

These capabilities depend on the validated workspace but belong to later implementation phases.

## Acceptance Criteria

- The workspace clearly exposes Build, Visualize, and Backtest as three stages.
- Build preserves Simple and Advanced block-based modes.
- Existing blocks render as compact rows with a contextual inspector.
- Simple rules can appear in Advanced without data loss.
- Advanced-only logic cannot be destructively edited through Simple.
- Visualize renders a deterministic local price chart, indicator panes, and illustrative markers without network or database access.
- Backtest retains its current scope and analysis features inside its dedicated stage.
- Protected strategies remain read-only presentation data.
- English and Arabic layouts remain functional.
- Focused tests, TypeScript, production build, HTTP rendering, hydration, and browser-console verification all pass.
