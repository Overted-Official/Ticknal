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

Use the established `KPICard` and `.kpi-card-root` contract for top-level metrics.

### Visual grammar & dimensions

- **Height**: 138px on phone, 160px on desktop (`.kpi-card-root`); compact variant uses `min-h-[108px] sm:min-h-[114px]`.
- **Surface**: Pitch black (`var(--surface-base)` / `#000000`), hairline border (`border: 1px solid var(--border-default)`).
- **Radius**: `rounded-xl` (14px) on mobile, `rounded-2xl` (16px) on desktop.
- **Top Row**: 18–20px solid circle icon/logo (`w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full`) + 12–13px semibold title + optional status badge.
- **Middle Row**: 16–20px bold tabular value + 9–10px uppercase unit (e.g. `EGP`, `%`, `BARS`).
- **Bottom Row**: Change / meta text + Edge-to-edge normalized SVG sparkline (or custom 3-segment breadth progress bar).
- **Hover**: Hairline border transition (`hover:border-border-hover`), no exaggerated shadow or 3D transform.

### Full Production `KPICard` Implementation

~~~tsx
// Edge-to-edge SVG Sparkline Calculation (95 x 32 coordinate space)
const sparklineData = useMemo(() => {
  if (!sparklinePoints || sparklinePoints.length < 2) return null;
  const min = Math.min(...sparklinePoints);
  const max = Math.max(...sparklinePoints);
  const range = max - min || 1;
  const width = 95;
  const height = 32;
  const paddingTop = 6;
  const paddingBottom = 4;
  const innerHeight = height - paddingTop - paddingBottom;

  const coords = sparklinePoints.map((val, idx) => {
    const x = (idx / (sparklinePoints.length - 1)) * width;
    const normalizedY = max === min ? 0.5 : (val - min) / range;
    const y = paddingTop + (1 - normalizedY) * innerHeight;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const linePath = coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  const lastPt = coords[coords.length - 1];
  const areaPath = `${linePath} L ${lastPt.x} ${height} L 0 ${height} Z`;
  const strokeColor = sparklineTrend === 'up' ? 'var(--color-profit-num)' : sparklineTrend === 'down' ? 'var(--color-loss-num)' : 'var(--color-accent-cyan)';

  return { linePath, areaPath, lastPt, strokeColor };
}, [sparklinePoints, sparklineTrend]);

// KPI Card Container
<div
  className="kpi-card-root relative flex flex-col justify-between overflow-hidden cursor-pointer user-select-none transition-all duration-200"
  onClick={onClick}
>
  {/* 1. Top Row: Icon + Title + Badge */}
  <div className="flex items-center justify-between gap-1.5 w-full z-10">
    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
      <div className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full flex items-center justify-center shrink-0 shadow-xs bg-brand-blue/20 text-brand-blue overflow-hidden">
        <Icon size={11} strokeWidth={2.2} />
      </div>
      <span className="text-[11px] sm:text-[13px] font-semibold text-plt-text tracking-tight truncate">
        {title}
      </span>
    </div>
    {badgeText && (
      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold leading-none bg-plt-hover text-plt-muted">
        {badgeText}
      </span>
    )}
  </div>

  {/* 2. Middle Row: Value + Unit */}
  <div className="flex flex-col mt-1 sm:mt-2 z-10">
    <div className="flex items-baseline gap-1 leading-none">
      <span className="text-[15px] sm:text-[20px] font-bold text-plt-text tabular-nums tracking-tight">
        {value}
      </span>
      {unit && (
        <span className="text-[9px] sm:text-[10px] font-semibold text-plt-muted uppercase tracking-wider ml-0.5">
          {unit}
        </span>
      )}
    </div>
  </div>

  {/* 3. Bottom Row: Change Text & Sparkline */}
  <div className="flex items-end justify-between w-full mt-auto pt-1.5 z-10">
    <span className={`text-[10.5px] sm:text-[12px] font-medium tabular-nums ${changeColorClass}`}>
      {changeText}
    </span>

    {sparklineData && (
      <div className="w-[84px] sm:w-[95px] h-7 sm:h-8 shrink-0 overflow-hidden relative">
        <svg viewBox="0 0 95 32" className="w-full h-full overflow-visible" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`kpi-grad-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={sparklineData.strokeColor} stopOpacity={0.3} />
              <stop offset="100%" stopColor={sparklineData.strokeColor} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <path d={sparklineData.areaPath} fill={`url(#kpi-grad-${id})`} />
          <path d={sparklineData.linePath} fill="none" stroke={sparklineData.strokeColor} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={sparklineData.lastPt.x} cy={sparklineData.lastPt.y} r={2.5} fill="#ffffff" stroke={sparklineData.strokeColor} strokeWidth={1.5} />
        </svg>
      </div>
    )}
  </div>
</div>
~~~

### Responsive KPI Rail Pattern

On mobile devices, multi-card sets MUST NOT be forced into wrapped vertical grids that break readability. Instead, use a horizontal swipe rail with CSS snap points:

~~~tsx
<div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 lg:grid lg:grid-cols-5 lg:gap-2.5 lg:overflow-visible lg:pb-0">
  {cards.map((card) => (
    <KPICard
      key={card.id}
      {...card}
      className="shrink-0 w-[132px] xs:w-[140px] sm:w-[170px] md:w-[185px] lg:w-full snap-start"
    />
  ))}
</div>
~~~

### Index Pill Component (`IndexPill` & `IndexPillRail`)

Used in `MajorIndicesSection` and Home investment rails for selectable index and benchmark chips:

~~~tsx
export function IndexPill({ id, title, tag, value, change, changeColorClass, isSelected, onClick }: IndexPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-3.5 py-2 rounded-full transition-all w-[210px] sm:w-[220px] shrink-0 text-start select-none cursor-pointer ${
        isSelected
          ? 'bg-surface-active border border-white/10 shadow-lg'
          : 'bg-transparent border border-transparent hover:bg-white/[0.04]'
      }`}
    >
      {/* 28px Circular Badge */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 transition-colors overflow-hidden ${
        isSelected ? 'bg-surface-raised text-white border border-neutral-600' : 'bg-neutral-900 text-neutral-300 border border-neutral-700/80'
      }`}>
        {title.slice(0, 3)}
      </div>

      {/* Info Block */}
      <div className="flex flex-col justify-center min-w-0 flex-1">
        <div className="flex items-center gap-1 leading-none">
          <span className={`text-xs font-medium tracking-tight whitespace-nowrap ${isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'}`}>
            {title}
          </span>
          {tag && <span className="text-[10px] font-bold text-amber-500 ml-0.5">{tag}</span>}
        </div>
        <div className="flex items-center gap-1.5 mt-1 leading-none">
          <span className="text-xs font-semibold tabular-nums text-white">{value}</span>
          <span className={`text-[10.5px] tabular-nums font-medium ${changeColorClass}`}>{change}</span>
        </div>
      </div>
    </button>
  );
}

// Rail Wrapper
export function IndexPillRail({ items }: { items: IndexPillProps[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
      {items.map((item) => (
        <IndexPill key={item.id} {...item} />
      ))}
    </div>
  );
}
~~~

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

### Production Recharts Configuration

~~~tsx
// Color Palette (Authentic TradingView Pine Green / Ripe Red)
const strokeColor = isPositive ? '#089981' : '#f23645';
const gradientId = `tv-area-grad-${id}-${isPositive ? 'up' : 'down'}`;

<ResponsiveContainer width="100%" height={320}>
  <AreaChart data={chartData} margin={{ top: 12, right: 48, left: 0, bottom: 4 }}>
    <defs>
      <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.28} />
        <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
      </linearGradient>
    </defs>

    {/* Subtle horizontal-only dashed gridlines */}
    <CartesianGrid stroke="#1e222d" strokeDasharray="2 2" vertical={false} strokeOpacity={0.6} />

    {/* Clean X-axis with muted 11px font and zero ticklines */}
    <XAxis dataKey="date" stroke="#71717a" fontSize={11} tickLine={false} axisLine={false} dy={6} />

    {/* Right-aligned price Y-axis */}
    <YAxis
      orientation="right"
      width={50}
      stroke="#71717a"
      fontSize={11}
      tickLine={false}
      axisLine={false}
      tickFormatter={(v) => Number(v).toLocaleString('en-US', { maximumFractionDigits: 1 })}
      domain={['auto', 'auto']}
      dx={8}
    />

    {/* Latest-Value Horizontal Reference Line with Edge Badge */}
    {latestClose && (
      <ReferenceLine
        y={latestClose}
        stroke={strokeColor}
        strokeDasharray="2 2"
        strokeOpacity={0.6}
        label={({ viewBox }: any) => {
          if (!viewBox) return null;
          const { x, y, width } = viewBox;
          return (
            <g transform={`translate(${x + width + 2}, ${y - 10})`}>
              <rect width="48" height="20" rx="4" fill={strokeColor} />
              <text x="24" y="14" fill="#ffffff" textAnchor="middle" fontSize="10.5" fontWeight="bold" fontFamily="sans-serif">
                {latestClose.toFixed(1)}
              </text>
            </g>
          );
        }}
      />
    )}

    {/* Custom #3D3D3D Hovercard Tooltip */}
    <Tooltip content={<ChartHoverTooltip />} isAnimationActive={false} />

    <Area
      type="monotone"
      dataKey="close"
      stroke={strokeColor}
      strokeWidth={2}
      fill={`url(#${gradientId})`}
      isAnimationActive={false}
    />
  </AreaChart>
</ResponsiveContainer>
~~~

### Chart Hovercard Tooltip Component

~~~tsx
export function ChartHoverTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const data = payload[0].payload;
  const isUp = (data.changePercent ?? 0) >= 0;

  return (
    <div className="hover-card bg-[#3D3D3D] p-3 rounded-xl shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex flex-col gap-1.5 min-w-[180px] pointer-events-none font-sans select-none border-0">
      <span className="text-[11px] font-semibold text-neutral-300">{label || data.date}</span>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-neutral-400">Price</span>
        <span className="text-sm font-bold text-white tabular-nums">{data.close?.toFixed(2)} EGP</span>
      </div>
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-neutral-600/50">
        <span className="text-[11px] text-neutral-400">Change</span>
        <span className={`text-xs font-semibold tabular-nums ${isUp ? 'text-profit-num' : 'text-loss-num'}`}>
          {isUp ? '+' : ''}{data.changePercent?.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}
~~~

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

### Row-item pattern (`PositionRowItem.tsx` & `MarketSignalRowItem.tsx`)

Production code for clickable financial list rows:

~~~tsx
export function PositionRowItem({
  symbol,
  companyName,
  logoUrl,
  currentPrice,
  quantity,
  entryPrice,
  profitLoss,
  profitLossPct,
  signalType, // 'BUY' | 'SELL' | null
  onClick,
}: PositionRowItemProps) {
  const isPositive = profitLoss >= 0;
  const isSell = signalType === 'SELL';
  const isBuy = signalType === 'BUY';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      className={`py-2.5 px-2 flex items-center justify-between hover:bg-plt-hover transition-colors group cursor-pointer border-b border-plt-border-soft outline-none select-none font-sans ${
        isSell ? 'bg-rose-500/[0.03]' : isBuy ? 'bg-emerald-500/[0.02]' : ''
      }`}
    >
      {/* Left: 32px Circular Avatar + Stacked Name/Symbol */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
          isSell
            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            : isBuy
            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
            : isPositive
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-surface-active text-text-primary/90 border-white/5'
        }`}>
          {logoUrl ? <img src={logoUrl} alt={symbol} className="w-full h-full object-cover" /> : <span>{symbol.slice(0, 2)}</span>}
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-[13px] font-medium text-plt-text truncate group-hover:text-brand-blue transition-colors block">
            {companyName || symbol}
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="badge-symbol">{symbol}</span>
            <span className="text-[11px] text-plt-muted font-normal truncate">
              · {quantity.toLocaleString()} shares @ {entryPrice.toFixed(2)} EGP
            </span>
          </div>
        </div>
      </div>

      {/* Right: Price & P/L ROI Chip */}
      <div className="flex flex-col items-end text-end shrink-0">
        <span className="text-sm font-semibold text-plt-text tabular-nums tracking-tight">
          {currentPrice.toFixed(2)} <span className="text-[10px] text-plt-muted font-medium">EGP</span>
        </span>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={`text-[11px] font-semibold tabular-nums ${isPositive ? 'text-profit-num' : 'text-loss-num'}`}>
            {isPositive ? '+' : ''}{profitLossPct.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  );
}
~~~

## Treemap and heatmap

Treemap area encodes the selected sizing metric (turnover/market-cap); color encodes the return/state.

### 8-Tier Discrete Return Color Scale

Ticknal strictly uses an 8-tier palette to avoid neon oversaturation:

~~~tsx
export function getHeatmapColor(returnPct: number): { bg: string; border: string; text: string } {
  if (returnPct >= 10) return { bg: '#059669', border: '#047857', text: '#ffffff' }; // Emerald 600
  if (returnPct >= 4)  return { bg: '#047857', border: '#065f46', text: '#ffffff' }; // Emerald 700
  if (returnPct > 0)   return { bg: '#064e3b', border: '#022c22', text: '#ecfdf5' }; // Emerald 900
  if (returnPct === 0) return { bg: '#27272a', border: '#18181b', text: '#a1a1aa' }; // Zinc 800 (flat neutral)
  if (returnPct >= -3) return { bg: '#7f1d1d', border: '#450a0a', text: '#fef2f2' }; // Red 900
  if (returnPct >= -7) return { bg: '#991b1b', border: '#7f1d1d', text: '#ffffff' }; // Red 800
  if (returnPct >= -12)return { bg: '#b91c1c', border: '#991b1b', text: '#ffffff' }; // Red 700
  return                      { bg: '#dc2626', border: '#b91c1c', text: '#ffffff' }; // Red 600
}
~~~

## Rotation matrix (RRG: Relative Rotation Graph)

RRG coordinates:
- **X-axis**: Relative Alpha / Strength vs Benchmark (`relativeStrengthVsBenchmark`).
- **Y-axis**: Momentum Spread (`turnoverWeightedReturn - equalWeightedReturn`).

### 4 Quadrants

1. **Leading** (Top-Right): Strong Relative Strength & Positive Momentum (`text-emerald-400`).
2. **Weakening** (Bottom-Right): Strong Relative Strength, but Decelerating Momentum (`text-amber-400`).
3. **Lagging** (Bottom-Left): Underperforming Benchmark & Negative Momentum (`text-rose-400`).
4. **Improving** (Top-Left): Underperforming Benchmark, but Accelerating Upward (`text-cyan-400`).

### Bounded Hovercard Math (Zero Viewport Clipping)

~~~tsx
// Tooltip coordinates bounded inside canvas dimensions
const tooltipStyle = useMemo(() => {
  const tooltipWidth = 320;
  const tooltipHeight = 220;
  let left = mousePos.x + 16;
  let top = mousePos.y + 16;

  if (left + tooltipWidth > dimensions.width - 12) {
    left = mousePos.x - tooltipWidth - 16;
  }
  if (top + tooltipHeight > dimensions.height - 12) {
    top = mousePos.y - tooltipHeight - 16;
  }
  left = Math.max(12, left);
  top = Math.max(12, top);

  return { left: `${left}px`, top: `${top}px` };
}, [mousePos, dimensions]);
~~~

## Detail inspector panels

Desktop inspector rails are transparent with:

- compact header, entity title, state badge, aggregate return;
- scrollable body;
- concise concentration, breadth, and constituent rows;
- dividers instead of nested cards.

The same content moves into a mobile drawer; do not maintain different analytical content for each breakpoint.
