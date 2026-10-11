# Page Patterns: Landing, Home, and Markets

## Shared rule: pages are ordered stories

A PageView should read top-to-bottom as a clear information hierarchy. Each section answers a distinct question and exposes an `id` when it participates in sticky navigation. Do not scatter page-level controls between unrelated widgets.

## Landing: editorial acquisition surface

Production root: `src/components/landing/LandingPageView.tsx`.

### Composition

1. `SmoothScroll` wrapper.
2. Fixed floating `LandingNavbar`.
3. `LandingHero` with value proposition, primary CTA, and device stage.
4. `LandingTickerMarquee` as live market proof.
5. `LandingAssetCoverage` for investable-universe breadth.
6. `LandingWorkflowPipeline` for the product workflow.
7. `LandingBrokerWorkflowSection` for alert-to-broker positioning.
8. `LandingPricingSection`.
9. `LandingCtaSection`.
10. `LandingFaqSection`.
11. `LandingFooter`.

### Landing shell

Use one continuous `bg-black text-white font-sans overflow-x-hidden` canvas. Sections are `bg-transparent` and separated with breathing room and occasional `border-t border-white/[0.06]`—not alternating gray bands.

Typical vertical rhythm:

- compact proof section: `py-12 sm:py-16`;
- standard marketing section: `py-16 sm:py-20 lg:py-24`;
- major conversion/pricing section: `py-20 sm:py-28`.

Section headers center the title/subtitle, usually with `max-w-2xl` or `max-w-3xl`. Titles use `.section-title`; subtitles use `.section-subtitle` plus a landing-specific centered width.

### Floating landing navigation

The navbar is fixed near the top, centered, pointer-events disabled on the outer wrapper and restored on the pill. Its visual grammar:

- rounded-full glass pill;
- black at ~60% opacity;
- `border-white/15`;
- strong backdrop blur/saturation;
- white active tab at ~14% opacity;
- 12–13px labels;
- desktop anchor links, compact language/login/CTA controls;
- real scroll-position tracking, not a hard-coded active state.

Use `<TicknalBrand />`. The primary nav CTA is white-on-black inverse. Keep mobile navigation compact instead of squeezing desktop anchors.

### Hero

The hero begins below the floating navbar and keeps text centered:

- two-line display heading, maximum three lines after localization;
- white first line and controlled blue/purple gradient emphasis;
- muted 14–18px supporting copy;
- one dominant CTA;
- product/device visual immediately below.

Use cinematic effects only inside the hero. Decorative cables and glows are pointer-inert, layered behind content, and clipped to the hero. Preserve readability with shadow/contrast and avoid effects behind dense body copy.

### Marquees and proof rails

Ticker pills combine circular logo, name/symbol, price, and signed change. They:

- use subtle translucent fill and hairline border;
- keep numeric data tabular;
- pause marquee motion on hover;
- use long, readable linear animation;
- run LTR even on Arabic so market movement remains mechanically stable;
- fade at left/right edges;
- duplicate data only for seamless animation, not semantics.

Respect reduced motion; do not use marquee motion for essential information.

### Landing content cards

Marketing cards may use 16–32px radii, subtle white translucency, gradients, and device frames. Keep their internal hierarchy:

1. eyebrow/step label;
2. 18–24px title;
3. 13–15px muted explanation;
4. proof chips or visual;
5. one clear action.

On mobile, multi-card showcases become horizontal `snap-x snap-mandatory` rails with ~84–86vw cards and visible position dots. Do not shrink three desktop cards into unreadable columns.

### Workflow, pricing, FAQ, footer

- Workflow is numbered and sequential; the selected step controls the visual, with compact proof pills.
- Pricing uses one cohesive black enclosure divided into plans. Price is 30–36px and tabular. Use white or brand-blue CTAs according to emphasis. Feature rows remain 12–13px and aligned.
- FAQ uses a desktop 12-column composition with sticky context at left and a divider-led accordion at right; on mobile it becomes one column. Accordion expansion should not shift unrelated content abruptly.
- Footer uses restrained type, brand component, link groups, and legal/support metadata. It closes the canvas; it is not another hero.

## Home: personal command dashboard

Production root: `src/components/platform/home/HomePageView.tsx`.

### Shell

~~~tsx
<div className="command-surface-page ... overflow-y-auto overflow-x-hidden custom-scrollbar bg-plt-base text-plt-text">
  <div className="px-4 sm:px-6 pt-3 pb-1 bg-plt-base">{/* breadcrumb/header */}</div>
  <HomeFloatingNav />
  <div className="app-page page-sections-stack pb-28 md:pb-20 pt-1 space-y-8">
    {/* sections */}
  </div>
</div>
~~~

The inner command surface is the scroll owner. Floating navigation and section scrolling must target it, not assume `window`.

### Home information sequence

1. Investment breadcrumb/header.
2. Floating nav for Performance, Positions, Signals.
3. Performance overview:
   - section title/subtitle;
   - mode switcher;
   - KPI rail;
   - chart toolbar and visualization.
4. Positions:
   - gainers/losers summary;
   - mobile tab vs desktop two-column lists;
   - row-driven ticker detail drawer;
   - clear footer link/count.
5. Market signals:
   - strategy and time controls;
   - responsive signal grid;
   - expandable result count;
   - full screener link.

Home prioritizes “what changed, what do I own, what needs attention.” Do not let a decorative chart outrank those decisions.

## Markets: macro-to-micro analytical workspace

Production root: `src/components/platform/markets/MarketsPageView.tsx`.

### Markets information sequence

1. Breadcrumb, page title, refresh/live action.
2. Floating section nav.
3. Market Overview:
   - timeframe;
   - five-KPI market rail;
   - major indices progression;
   - investor flow.
4. FX & Currency Risk:
   - “Live Macro” status;
   - four-KPI rail;
   - money-supply visualization.
5. Sector Rotation:
   - hierarchy and timeframe controls;
   - large RRG canvas;
   - sector concentration/capital-flow inspector.
6. Market Heatmap:
   - hierarchy, sizing, and timeframe controls;
   - large treemap;
   - constituent list/inspector.
7. Guest conversion and locked-state surfaces.

### Analytical workspaces

On desktop, a visualization workspace is:

- fluid primary canvas;
- `gap-4`;
- fixed 370px rail, up to 410px on XL;
- matched heights based on viewport;
- transparent inspector shell with divider-led rows.

On screens below `lg`, the primary canvas remains full-width and the inspector becomes a bottom drawer opened by selecting a sector/ticker. Do not place a 370px side rail below the chart as a long static block.

Timeframe, hierarchy, and sizing controls sit directly below the section header. Related controls group together; unrelated controls separate left/right at desktop and stack/scroll at mobile.

## Floating section navigation

Home and Markets use the same pattern:

- sticky near top, `z-30`;
- outer wrapper `pointer-events-none`;
- centered black/90 pill with white/15 border, blur, and shadow;
- inner tablist horizontally scrollable with `no-scrollbar`;
- active tab `bg-white/15 text-white`;
- inactive tab muted with white/8 hover;
- short mobile labels and full desktop labels;
- click scrolls the command surface with roughly 56px offset;
- scroll spy marks the last section whose top crossed roughly 160px.

New page-specific floating navs should be data-driven variants of a shared primitive, not copied implementations.
