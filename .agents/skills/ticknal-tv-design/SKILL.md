---
name: ticknal-tv-design
description: >-
  Design cheatsheet for the Ticknal platform UI. Use this skill whenever building
  or restyling a dashboard widget, KPI card, chart, table, screener, or
  distribution panel in the Ticknal Next.js app. Covers the TradingView-inspired
  dark design system: color tokens, component patterns (KPI cards, line/area
  charts, donut+table distributions, screener tables), toolbar conventions, and
  responsive grid rules — all derived from production widgets in this codebase.
---

# Ticknal TradingView-Inspired Design System

Ticknal uses a strict TradingView-inspired dark UI. All widgets must feel
visually cohesive with the production widgets listed below. Do NOT introduce
light backgrounds, heavy borders, rounded-full containers, or any colour
outside the token set without explicit user approval.

---

## 1. Colour Tokens (Hard Rules)

| Role | Value | Usage |
|------|-------|-------|
| **Profit / Positive** | `#089981` | Gains, inflows, positive delta, area fill base, value badge |
| **Loss / Negative** | `#f23645` | Losses, outflows, negative delta |
| **Info / Accent Blue** | `#2962ff` | Secondary lines, toggle active states, hover highlight on table row names |
| **Muted Text** | `#787b86` | Labels, subtitles, axis ticks, empty-state copy |
| **Card Border / Row Divider** | `#1e222d` | Section borders, horizontal row separators, tooltip border |
| **Elevated Surface** | `#2a2e39` | Active tab/button fill, pill active state, tooltip background |
| **Recessed Panel** | `#14171f` | Pill container background, switcher track |
| **Page Background** | `#000000` / `#0d0d0d` | App shell — never used *inside* widgets |
| **Widget Surface** | `bg-transparent` | All widget root elements — no background fill |

**Semantic badge colour classes:**
```
Positive/Surplus:  bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
Negative/Deficit:  bg-rose-500/10    text-rose-400    border border-rose-500/20
Info/Blue:         bg-blue-500/10    text-blue-400    border border-blue-500/20
Neutral/Default:   bg-cold-gray-800  text-cold-gray-250 border border-cold-gray-700
```

**Multi-series chart palette (donut slices, stacked bars, etc.):**
```ts
const PALETTE = [
  '#448aff', // Electric blue (Stock)
  '#9c27b0', // Purple (Mutual Funds)
  '#089981', // Mint green (USD Reserves / Inflows)
  '#ff9800', // Orange (EGP Cash)
  '#00bcd4', // Sky blue (Brokerage Cash)
  '#e91e63', // Rose
  '#ff5722', // Deep orange
  '#3f51b5', // Indigo
  '#009688', // Teal
  '#ffeb3b', // Amber
];
```

---

## 2. KPI Card Pattern (`tv-kpi-card`)

The `tv-kpi-card` CSS class (defined in `src/app/globals.css`) is the canonical
metric card. Use it for **all** top-level KPI displays. Never build a bespoke
card shell when this class exists.

**Grid container:** `grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3`

**Internal structure — two rows:**
```tsx
<div className="tv-kpi-card w-full">
  {/* Row 1: Title (left) + Badge pill (right) */}
  <div className="flex items-center justify-between gap-1 leading-none">
    <span
      className="text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight"
      title={title}
    >
      {title}
    </span>
    <span className={`shrink-0 inline-flex items-center px-1.5 sm:px-2 py-0.5 rounded-full
                      text-[9px] sm:text-[10px] font-semibold leading-none ${badgeClass}`}>
      {badgeText}
    </span>
  </div>

  {/* Row 2: Value (left, large bold) + Meta (right, muted small) */}
  <div className="flex items-baseline justify-between gap-1 leading-none">
    <span className="text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight shrink-0">
      {value}
    </span>
    <span className={`text-[10px] sm:text-[11px] truncate max-w-[68px] sm:max-w-[130px]
                      text-right font-medium leading-none ${metaClass}`}>
      {metaText}
    </span>
  </div>
</div>
```

**Reference implementations:**
- [`BankSummaryKPIs.tsx`](src/components/platform/wallet/BankSummaryKPIs.tsx) — liquidity KPI grid
- [`CashFlowSpendingAnalyticsWidget.tsx`](src/components/platform/dashboard/banks/CashFlowSpendingAnalyticsWidget.tsx) lines 633–666 — cash flow KPI grid

---

## 3. Chart Pattern (Area / Line / ComposedChart)

All charts share the same Recharts configuration for a consistent TradingView feel.

### Canvas container
```tsx
<div className="w-full h-[340px] relative">
  <ResponsiveContainer width="100%" height="100%">
    <AreaChart data={data} margin={{ top: 12, right: 68, left: 10, bottom: 0 }}>
```
- `h-[340px]` for all full-width main charts; `h-[200px]` for mini/sparkline charts.
- Right margin `68` is mandatory — it reserves space for the right-axis price badge.

### Gridlines
```tsx
<CartesianGrid
  stroke="#1e222d"
  strokeDasharray="2 2"
  vertical={false}
  strokeOpacity={0.7}
/>
```
- **Horizontal only** (`vertical={false}`). Dotted dashes, low opacity — never dominant.

### Axes
```tsx
{/* X-Axis — bottom, no axis line, no tick marks */}
<XAxis
  dataKey="label"
  stroke="#787b86"
  fontSize={11}
  tickLine={false}
  axisLine={false}
  dy={6}
/>

{/* Y-Axis — ALWAYS on the RIGHT (TradingView price scale convention) */}
<YAxis
  orientation="right"
  stroke="#787b86"
  fontSize={11}
  tickLine={false}
  axisLine={false}
  tickFormatter={(v) => isPrivacy ? '•••' : formatPriceValue(v)}
  dx={8}
  domain={['auto', 'auto']}
/>
```

### Current-value badge (TradingView green price tag on right axis)
```tsx
<ReferenceLine
  y={latestValue}
  stroke="#089981"
  strokeDasharray="2 2"
  strokeOpacity={0.6}
  label={({ viewBox }: any) => {
    if (!viewBox) return null;
    const { x, y, width } = viewBox;
    return (
      <g transform={`translate(${x + width + 4}, ${y - 11})`}>
        <rect width="60" height="22" rx="4" fill="#089981" />
        <text x="30" y="15" fill="#ffffff" textAnchor="middle"
              fontSize="11" fontWeight="bold" fontFamily="sans-serif">
          {isPrivacy ? '••••' : formatPriceValue(latestValue)}
        </text>
      </g>
    );
  }}
/>
```

### Area fill gradient
```tsx
<defs>
  <linearGradient id="tvAreaGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%"   stopColor="#089981" stopOpacity={0.32} />
    <stop offset="100%" stopColor="#089981" stopOpacity={0.0}  />
  </linearGradient>
</defs>
<Area
  type="monotone"
  dataKey="value"
  stroke="#089981"
  strokeWidth={2}
  fill="url(#tvAreaGrad)"
  isAnimationActive={false}
/>
```

### Custom tooltip
```tsx
const ChartTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="p-3 rounded-xl bg-[#1e222d] border border-[#2a2e39] text-xs
                    tabular-nums select-none font-sans space-y-1.5 shadow-2xl">
      <div className="font-semibold text-white mb-1 border-b border-[#2a2e39] pb-1">
        {d.label}
      </div>
      <div className="flex justify-between gap-4 text-[#089981]">
        <span>{metricName}:</span>
        <strong className="text-white">{isPrivacy ? '••••••••' : d.value}</strong>
      </div>
    </div>
  );
};
<Tooltip content={<ChartTooltip />} />
```

### Section header (above every chart)
```tsx
<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#1e222d]">
  <div>
    <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
    <p className="text-xs text-[#787b86] mt-0.5">{subtitle}</p>
  </div>
  {/* Legend dots — right side */}
  <div className="flex items-center gap-4 text-xs flex-wrap">
    <span className="flex items-center gap-1.5 text-white font-medium">
      <span className="w-2.5 h-2.5 rounded-full bg-[#089981]" />
      <span>{seriesName}</span>
    </span>
  </div>
</div>
```

### Bottom timeframe / resolution pill toolbar
```tsx
<div className="flex items-center justify-between pt-2 border-t border-[#1e222d] mt-1">
  <div className="flex items-center gap-1">
    {timeframes.map((tf) => (
      <button
        key={tf}
        type="button"
        onClick={() => setTimeframe(tf)}
        className={`text-xs px-3 py-1 rounded-lg transition-all ${
          timeframe === tf
            ? 'bg-[#2a2e39] text-white font-bold shadow-xs border border-[#2a2e39]'
            : 'text-[#787b86] hover:text-white font-medium'
        }`}
      >
        {tf}
      </button>
    ))}
  </div>
</div>
```

**Reference implementations:**
- [`WealthGrowthChartCard.tsx`](src/components/platform/dashboard/networth/WealthGrowthChartCard.tsx) — canonical area chart
- [`CashFlowSpendingAnalyticsWidget.tsx`](src/components/platform/dashboard/banks/CashFlowSpendingAnalyticsWidget.tsx) lines 669–800 — ComposedChart (bars + cumulative line overlay)

---

## 4. Donut + Table Distribution Pattern

Used whenever showing a breakdown or allocation (portfolio, spending, sectors).
The layout is always: **tabs row → 5/12 donut column + 7/12 table column**.

```tsx
{/* 1. Tab row */}
<div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 border-b border-[#1e222d] pb-2">
  {tabs.map((tab) => (
    <button
      key={tab.key}
      type="button"
      onClick={() => setActiveTab(tab.key)}
      className={`text-xs px-3.5 py-1.5 rounded-lg transition-all whitespace-nowrap ${
        activeTab === tab.key
          ? 'bg-[#1e222d] text-white font-semibold shadow-xs border border-[#2a2e39]'
          : 'text-[#787b86] hover:text-white font-medium'
      }`}
    >
      {tab.label}
    </button>
  ))}
</div>

{/* 2. Side-by-side grid */}
<div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center pt-1">

  {/* Left: Donut (5 cols) */}
  <div className="lg:col-span-5 flex flex-col items-center justify-center">
    <div className="relative w-full h-56 flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={items}
            dataKey="value"
            innerRadius={58}
            outerRadius={84}
            paddingAngle={items.length > 1 ? 2 : 0}
            isAnimationActive={false}
            onMouseEnter={(_, idx) => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {items.map((entry, index) => (
              <Cell
                key={entry.id}
                fill={entry.color}
                stroke={hoveredIndex === index ? '#ffffff' : 'transparent'}
                strokeWidth={hoveredIndex === index ? 2 : 0}
                className="cursor-pointer transition-all duration-150"
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>

      {/* Center hole label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
        <span className="text-3xl font-bold text-white tracking-tight leading-none">
          {items.length}
        </span>
        <span className="text-xs text-[#787b86] font-medium mt-1">{tabTitle}</span>
      </div>
    </div>

    {/* Hovered slice name below donut */}
    <div className="text-center py-1 min-h-[26px]">
      {currentSlice && (
        <span className="text-sm font-semibold text-white tracking-wide">
          {currentSlice.name}
        </span>
      )}
    </div>
  </div>

  {/* Right: Table (7 cols) */}
  <div className="lg:col-span-7 overflow-x-auto overflow-y-auto max-h-[280px] custom-scrollbar">
    <table className="w-full text-left text-xs font-sans border-collapse">
      <thead>
        <tr className="border-b border-[#1e222d] text-[#787b86] text-[11px] font-medium">
          <th className="pb-2 text-left font-medium">Name</th>
          <th className="pb-2 text-right font-medium">Value</th>
          <th className="pb-2 text-right font-medium">Allocation</th>
          <th className="pb-2 text-right font-medium">Change / Gain</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[#1e222d]/60">
        {items.map((item) => (
          <tr
            key={item.id}
            className="hover:bg-[#1e222d]/30 transition-colors cursor-pointer group"
          >
            {/* Name with color swatch */}
            <td className="py-2.5 pr-3">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-xs shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-white font-medium truncate max-w-[140px] group-hover:text-[#2962ff] transition-colors">
                  {item.name}
                </span>
              </div>
            </td>
            <td className="py-2.5 px-3 text-right tabular-nums text-white font-semibold">
              {item.value}
            </td>
            <td className="py-2.5 px-3 text-right tabular-nums text-[#d1d4dc] font-medium">
              {item.percentage.toFixed(2)}%
            </td>
            <td className="py-2.5 pl-3 text-right tabular-nums font-semibold">
              <span className={item.gain >= 0 ? 'text-[#089981]' : 'text-[#f23645]'}>
                {item.gain >= 0 ? '+' : ''}{item.gain}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
```

**Reference implementations:**
- [`PortfolioSplitCard.tsx`](src/components/platform/dashboard/networth/PortfolioSplitCard.tsx) — portfolio distribution
- [`CashFlowSpendingAnalyticsWidget.tsx`](src/components/platform/dashboard/banks/CashFlowSpendingAnalyticsWidget.tsx) lines 900–1258 — outflow spending distribution

---

## 5. Screener / Grouped Table Pattern

Used for institution-grouped data (e.g., bank accounts grouped by bank).

**Key conventions:**
- **Outer container:** `bg-transparent` — no card background, no border
- **Group header row:** separated by `border-b border-[#1e222d]`; logo via `<Image>` `w-7 h-7 rounded-md object-cover`; group total in `text-white font-bold`
- **Expand/collapse:** `ChevronDown` / `ChevronRight` icons, `transition-transform duration-200`
- **Account sub-rows:** `border-b border-[#1e222d]/40 hover:bg-[#1e222d]/20 transition-colors`
- **Sparkline inline:** SVG polyline — colour driven by state: `#089981` (profit) / `#f23645` (loss) / `#787b86` (neutral)
- **Columns:** Name column stretches (`flex-1`); numeric columns are `text-right tabular-nums`
- **Timeframe pill switcher above table:** same pill pattern as §6 below
- **No external card border, no header background fill** — only row dividers

**Reference:** [`BankAccountsScreenerWidget.tsx`](src/components/platform/dashboard/banks/BankAccountsScreenerWidget.tsx)

---

## 6. Pill Switcher Pattern (Universal Toolbar Control)

All mode / resolution / timeframe controls use the same pill track:

```tsx
{/* Track container */}
<div className="inline-flex items-center p-0.5 rounded-lg bg-[#14171f] border border-[#2a2e39]">
  {options.map((opt) => (
    <button
      key={opt}
      type="button"
      onClick={() => setActive(opt)}
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
        active === opt
          ? 'bg-[#2a2e39] text-white font-semibold shadow-xs'
          : 'text-[#787b86] hover:text-white hover:bg-[#1e222d]'
      }`}
    >
      {opt}
    </button>
  ))}
</div>
```

- **Track bg:** `bg-[#14171f] border border-[#2a2e39]`
- **Active item:** `bg-[#2a2e39] text-white`
- **Inactive item:** `text-[#787b86] hover:text-white`
- **Icon-only switcher** (chart style toggle): use `p-1.5` buttons inside `rounded-lg bg-[#131722] border border-[#2a2e39]/50` track

---

## 7. Typography Scale

| Context | Tailwind Classes |
|---------|-----------------|
| Section heading | `text-base font-bold text-white tracking-tight` |
| Section subtitle | `text-xs text-[#787b86] mt-0.5` |
| Table header cell | `text-[11px] font-medium text-[#787b86]` |
| Table body cell | `text-xs font-sans` |
| Table name cell (hover) | `group-hover:text-[#2962ff] transition-colors` |
| KPI card title | `text-[11px] sm:text-[12px] font-medium text-cold-gray-400 truncate tracking-tight` |
| KPI card value | `text-[15px] sm:text-[20px] font-bold text-cold-gray-100 tabular-nums tracking-tight` |
| KPI card meta | `text-[10px] sm:text-[11px] font-medium text-cold-gray-450` |
| Badge / pill label | `text-[9px] sm:text-[10px] font-semibold` |
| Axis tick (Recharts) | `fontSize={11}` prop on `<XAxis>` / `<YAxis>` |
| Monospace values | `font-mono` for date ranges, resolution labels |

---

## 8. Section & Layout Conventions

- **Widget root:** `w-full flex flex-col bg-transparent select-none space-y-6`
- **Section separators:** `border-b border-[#1e222d]` (horizontal line only — never full card borders)
- **Content rows:** `grid grid-cols-1 lg:grid-cols-12 gap-8`
- **KPI grid:** `grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3`
- **No `rounded-3xl` or outer card shells** — widgets are borderless content blocks inside `section-container` wrappers
- **Empty states:** centered icon (`text-[#333]`) + muted copy + underlined `<Link>`, never inside a box or alert
- **Scrollable tables:** `overflow-y-auto max-h-[280px] custom-scrollbar` (never `overflow-hidden`)

---

## 9. Privacy Mode Guardrail

All rendered monetary/numerical values **must** respect the privacy toggle:

```tsx
const { isPrivacy } = usePrivacyMode();

// Value display
value: isPrivacy ? '••••••••' : actualFormattedValue

// Axis formatter
tickFormatter={(v) => isPrivacy ? '•••' : formatPriceValue(v)}

// Inline formatters
const formatMoney = (val: number): string => {
  if (isPrivacy) return '•••••• £';
  // ... real formatting
};
```

Never render raw numbers without this guard.

---

## 10. Animation Policy

- **Recharts series:** Always `isAnimationActive={false}` — avoids janky redraws on state changes.
- **UI micro-interactions:** `transition-colors` or `transition-all` (implicit `duration-150`) — fast and snappy.
- **Conditional panel reveal** (e.g., custom date picker appearing): `animate-in fade-in duration-150`.
- **No CSS keyframe animations** on data or numbers — values update instantly.
