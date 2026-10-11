# Visual Foundations and Global Tokens

`src/app/globals.css` is authoritative. It is organized as framework imports, design tokens, Tailwind theme aliases, base defaults, semantic component classes, then animations/localization. Use the highest-level semantic class available.

## Token preference order

1. Existing semantic component class, e.g. `.section-container`, `.seg-control`, `.drawer-sheet`.
2. Tailwind alias backed by `@theme inline`, e.g. `bg-plt-base`, `text-plt-muted`, `border-plt-border`.
3. CSS variable, e.g. `var(--plt-profit)` for a chart-library prop.
4. A new reusable token/class in `globals.css`.
5. Hard-coded literal only for an isolated library limitation, and only after checking the four levels above.

Do not copy arbitrary hard-coded colors from older components.

## Surfaces and depth

The authenticated product is a pitch-black command surface, not a stack of gray cards.

| Role | Canonical token/class | Rule |
|---|---|---|
| App/page canvas | `--plt-bg-base`, `bg-plt-base`, `bg-black` | Pure black |
| Main section/widget | `--plt-bg-surface`, `bg-transparent` | Transparent |
| Raised platform surface | `--plt-bg-raised` | Still pure black |
| Row hover | `--plt-bg-hover`, `bg-white/[0.04]` | Subtle, temporary |
| Selected/active | `--plt-bg-active`, `bg-white/[0.08]` | Subtle, temporary |
| Overlay | `--plt-bg-overlay`, `bg-black/80` | With restrained blur |
| Hovercard/popover | `--plt-bg-hovercard`, `.surface-popover` | The only `#3D3D3D` panel |
| Drawer/modal | `bg-black` | Pure black, square edges |

Never use zinc/slate/navy/dark-gray fills for a main widget, section panel, drawer, or modal. Legacy `bg-surface-input`, `bg-surface-raised`, and `bg-surface-active` are limited to compact controls, form fields, and transient interaction states; they are not widget shells.

Platform hierarchy comes from spacing, typography, dividers, and content density—not stacked elevation. `.section-container` is intentionally borderless and transparent.

Landing pages may use translucent white overlays such as `bg-white/[0.03]` plus `border-white/[0.08]` for small marketing cards and pills. These are editorial exceptions, not platform widget defaults.

## Color semantics

Use semantic meaning consistently:

| Meaning | Global source | Typical use |
|---|---|---|
| Primary text | `--plt-text-primary`, `text-plt-text` | Titles, key values |
| Secondary text | `--plt-text-secondary` | Supporting values |
| Muted text | `--plt-text-muted`, `text-plt-muted` | Labels, subtitles, axes |
| Faint text | `--plt-text-faint` | Disabled/tertiary metadata |
| Positive number | `--color-profit-num` | Signed values in dense UI |
| Positive chart | `--color-profit-chart` / `--color-minty-green-500` | Lines, areas, market state |
| Negative number | `--color-loss-num` | Signed values in dense UI |
| Negative chart | `--color-loss-chart` / `--color-ripe-red-500` | Lines, areas, risk state |
| Information/selection | `--color-tv-blue-500`, `--plt-info` | Links, selected analytical series |
| Warning | `--plt-warning` | Concentration/risk attention |
| Brand accent | cyan → blue → magenta tokens | Brand line/hero emphasis only |

Positive/negative colors must represent a real positive/negative state. Do not color neutral decoration green or red. Always pair critical color meaning with text, sign, icon, label, or pattern.

Borders are hairlines: `border-white/[0.06]`, `border-white/10`, `border-border-subtle`, or `border-plt-border`. Prefer a single bottom/top divider over boxing every region.

## Typography

All UI uses sans-serif. Never use monospace.

- `font-sans` resolves through `--font-sans-token`.
- Arabic switches globally to Cairo.
- Use `tabular-nums` for financial values, prices, percentages, dates, axis values, and aligned metrics.
- Use `<TicknalBrand />` for the brand. The wordmark is lowercase `ticknal`, EuclidCircularSemibold 600, `tracking-[-0.04em]`, `leading-none`.

Canonical hierarchy:

| Role | Class/token | Production character |
|---|---|---|
| Page title | `.page-title` | 18px, bold |
| Page subtitle | `.page-subtitle` | 12px, muted |
| Section title | `.section-title` | 28px desktop / 22px mobile, semibold, tight |
| Section subtitle | `.section-subtitle` | 13px desktop / 12px mobile, muted |
| Widget title | `.widget-title` | 12px, semibold, uppercase label |
| Widget subtitle | `.widget-subtitle` | 11px, muted |
| KPI title | `.kpi-title` | 11px, semibold, uppercase |
| Dense body/table | `text-xs` or `text-[13px]` | 12–13px |
| Micro metadata/badge | `text-[9px]`–`text-[11px]` | Never the only critical explanation |

Landing hero display type is an intentional exception: roughly 30px mobile, 48px small desktop, and 54px large desktop; 600 weight; `-0.03em` tracking; ~1.14 line height. Marketing section headings still reuse `.section-title`.

Keep most platform copy at 10–13px and establish hierarchy through weight and muted color. Avoid bolding every value; reserve 600/700 for titles, totals, active items, and decisive metrics.

## Spacing and layout

The global spacing scale is an 8px grid: `--space-1` = 8px through `--space-8` = 64px.

- Page horizontal padding: `--space-page-x` (responsive; 12px on phones).
- Page vertical padding: `--space-page-y`.
- Section gap: `--gap-page-sections` / `.page-sections-stack`.
- Widget gap: `--gap-widget-grid` / `.widget-grid`.
- KPI gap: `--gap-kpi-grid`.
- Widget inner padding: `--space-widget-inner`.

Use 4px only for dense micro-alignment and 12px/20px where the existing responsive tokens/classes already do. Do not create random 5/7/15/19px spacing.

Landing content widths:

- primary editorial columns: `max-w-6xl` or `max-w-7xl`;
- broad asset showcase: up to roughly 1400px;
- hero copy: `max-w-3xl`;
- long subtitle/copy: `max-w-xl` to `max-w-2xl`;
- horizontal gutters: 16px mobile, 24px small, 32px large.

## Geometry

- Platform section roots: no outer rounding.
- Platform data rows: no pill shape; use separators and hover.
- KPI cards: `.tv-kpi-card` / the established `KPICard` shape.
- Controls/tabs/buttons: pill or compact rounded control according to the global primitive.
- Logos/status dots: circular.
- Drawers and main sheets: `rounded-none`.
- Marketing cards/device frames/pricing enclosure may use 16–32px radii because they are editorial objects.

Do not use large rounded cards as a default container.

## Shadows and effects

Platform pages are mostly flat. Use shadows for:

- floating navigation;
- hovercards/popovers;
- drawers/modals;
- a focused marketing CTA or device stage.

Use `--shadow-popover`, `--shadow-panel`, and global transition tokens. Avoid glow on ordinary data widgets.

Brand gradients are scarce:

- cyan → TradingView blue → magenta for brand accents;
- hero headline/CTA or the shared 2px drawer top line;
- never as a generic widget background.
