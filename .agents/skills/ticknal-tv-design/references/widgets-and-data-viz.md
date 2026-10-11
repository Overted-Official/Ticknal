# Widgets and Data Visualization

## Widget anatomy

A platform widget is content on a black/transparent canvas. Use this order:

1. title/subtitle or label;
2. controls aligned to the relevant content;
3. key metric or visualization;
4. supporting detail/legend;
5. optional footer action or count.

Do not wrap every level in a card. Use `border-b`/`border-t` and spacing to separate internal regions.

## KPI cards and rails

Use the established `KPICard` and `.tv-kpi-card` contract for top-level metrics.

### Visual grammar

- fixed compact height (82px desktop, 74px mobile for `.tv-kpi-card`; richer Home KPI cards may be taller);
- black/transparent surface;
- 1px cold-gray/white-low-opacity border;
- 12–16px radius only for the KPI object;
- small icon/status at top;
- 10–12px muted label;
- 17–20px bold tabular value;
- 9–11px status badge/meta;
- optional micro-sparkline occupying the bottom band;
- subtle hover border/background/translate, no dramatic lift.

KPI content must answer: what metric, current value, direction/state, comparison/horizon.

Use semantic status tokens. Market Status can be red/green according to breadth; turnover is informational; sector dispersion can use warning; neutral metrics remain white/muted.

### Responsive rail

~~~tsx
<div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2.5 pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible">
  <KPICard className="shrink-0 w-[170px] xs:w-[180px] sm:w-[190px] lg:w-full snap-start" />
</div>
~~~

Use two/four-column global grids when the data count fits `.kpi-grid-2` or `.kpi-grid-4`. Never compress five detailed KPIs into a two-column phone grid when a rail preserves readability.

## Financial number rules

- Always use `tabular-nums`.
- Include units: EGP, %, Bn, M, T, shares, points.
- Include explicit +/− sign for changes.
- Localize separators and currency copy.
- Use consistent precision within a comparison set.
- Prefer en dash/em dash for missing values; do not show false zero.
- Abbreviate in high-level KPIs, provide exact values in detail/tooltip.
- Respect privacy mode for monetary and portfolio values, including chart axes/tooltips.

## Charts

### Container and hierarchy

- Use `ResponsiveContainer`.
- Main analytical charts fill available width and typically use 280–420px; large Markets workspaces use explicit viewport-clamped heights.
- Mini sparklines are silent supporting graphics and have no axes/tooltips.
- Chart root inherits black/transparent outer surface. `bg-plt-chart` may be used only for an internal chart canvas where needed, never as an outer gray widget panel.
- Put title/legend/controls outside the plotting area when possible.

### Axes and grid

- Use a right-side Y axis for price/value scales when matching trading convention.
- Remove heavy axis lines and tick marks.
- Use 10–11px muted ticks.
- Horizontal gridlines only by default, using `var(--chart-grid)` at low opacity.
- Reserve right margin for a latest-value badge when present.
- Format ticks by scale; do not show long raw values.

### Series

- Positive/primary performance: `var(--color-profit-chart)`.
- Negative/risk: `var(--color-loss-chart)`.
- Comparison/selection: `var(--color-tv-blue-500)`.
- Secondary categorical series use the global orange, sky, purple, cyan, and magenta tokens.
- Use 2px primary strokes; use thinner/lower-opacity comparison strokes.
- Area fills fade toward transparent.
- Do not overload one chart with more series than its legend and color distinctions can support.
- Disable Recharts series animation for data dashboards: `isAnimationActive={false}`. Interaction transitions may remain.

### Latest-value marker

For time series where the current value matters, use a subtle dashed reference line and a compact label on the right edge. The label uses the series color, white text, 10–11px bold tabular numbers, and must not clip.

### Tooltips

Use `.surface-popover` or `.hover-card`:

- `#3D3D3D` background;
- no decorative border;
- strong popover shadow;
- compact 10–12px type;
- tabular values;
- date/category header, then aligned label/value rows;
- privacy masking where applicable.

Keep the tooltip inside the viewport. On touch, tap selection must be usable without hover.

### Legends and controls

Legends use 8–10px dots/line samples, 11–12px labels, and wrap or scroll on mobile. Clicking a selectable legend must expose selected, hover, and keyboard focus states.

Timeframe controls use `.seg-control`, not chart-local pill styling.

## Distribution charts

For allocation/breakdown, use donut + table:

- desktop: roughly 5/12 visualization and 7/12 detail table;
- mobile: stacked;
- 58–84px donut radii for compact widgets;
- center label shows total/count/current selection;
- hover/tap links slice and table row;
- color swatch repeats in the row;
- scroll the detail list rather than growing the page without bound.

Do not rely on slice color alone; every slice needs a text label/value.

## Major index and indicator rails

Use compact horizontally scrollable “index pills” above the main chart:

- circular/compact symbol badge;
- name, frequency, latest value, unit, signed change;
- selected state is visibly stronger;
- previous/next icon buttons at rail edges on desktop;
- no scrollbar chrome;
- chart below reflects the selected item immediately.

## Tables and dense lists

Prefer `.data-table` for new general tables. It provides:

- black sticky header;
- muted compact headings;
- 1px row separators;
- transparent rows with 4% white hover;
- tabular numerics;
- padding from the shared spacing scale.

Table rules:

- left/start align names and descriptors;
- right/end align numeric columns;
- keep symbol/name visible where horizontal scrolling is required;
- show units in header or cell, not ambiguously;
- sticky header background stays pure black;
- sort affordances have labels and active direction;
- row action hit target is at least 32px even when icon is 14–16px.

### Row-item pattern

Position, signal, and constituent rows use:

- 8–10px vertical padding;
- subtle bottom divider;
- 32px circular logo/avatar;
- 13px semibold company/ticker name;
- 10px symbol badge;
- 11–13px tabular metrics;
- one primary and one secondary line;
- whole-row hover/click where a detail drawer opens;
- keyboard `Enter`/`Space` support and visible focus.

Use two columns at `md` only when each column remains independently readable, as in gainers/losers and market signals.

## Treemap and heatmap

Treemap area encodes the selected sizing metric; color encodes return/state. Keep these meanings independent.

- Use black for no-data/non-traded items.
- Use diverging red↔neutral↔green for performance.
- Show group title and aggregate return when the tile is large enough.
- Progressive disclosure: large tiles show symbol, return, price; tiny tiles show symbol only.
- Borders distinguish cells without bright grids.
- Hovercard gives complete details.
- Selection opens the relevant inspector and is retained visually.
- Provide text/table detail for users who cannot interpret the map.

## Rotation matrix

RRG/quadrant views must label all quadrants and explain axes:

- Improving, Leading, Lagging, Weakening;
- horizontal = relative alpha/strength;
- vertical = momentum spread;
- category badges act as filters and show counts;
- selected sector is explicit in both plot and detail rail.

Do not make users infer quadrant meaning from color alone.

## Detail inspector panels

Desktop inspector rails are transparent with:

- compact header, entity title, state badge, aggregate return;
- scrollable body;
- concise concentration, breadth, and constituent rows;
- dividers instead of nested cards.

The same content moves into a mobile drawer; do not maintain different analytical content for each breakpoint.
