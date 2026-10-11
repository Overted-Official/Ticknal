# UI Architecture and Ownership

## Canonical composition

Every substantial page follows this dependency direction:

~~~text
app route page.tsx
  -> centralized PageView.tsx
    -> page section components
      -> focused widgets / charts / lists
        -> row, card, control, and formatting primitives
~~~

Do not flatten a page into one file or let a leaf widget coordinate unrelated sections.

### Route `page.tsx`

The route owns server-only concerns:

- authentication and redirects;
- server locale when needed;
- parallel data fetching and graceful fallbacks;
- serialization of database/domain objects for client components;
- dynamic/static route configuration.

It should render one page view and pass typed initial data. Examples:

- `src/app/page.tsx` → `LandingPageView`
- `src/app/(main)/home/page.tsx` → `HomePageView`
- `src/app/(main)/markets/page.tsx` → `MarketsPageView`

Avoid putting presentation markup, browser effects, or page interaction state in the route.

### Centralized `*PageView.tsx`

The page view is the composition and coordination boundary. It owns:

- page shell and scrolling container;
- page header/breadcrumb;
- sticky/floating section navigation;
- order of sections;
- state shared across more than one section;
- page-wide refresh and client revalidation;
- guest/paywall orchestration;
- selected entities when multiple sections need them.

It imports section components; it does not absorb their internal chart, row, or form markup.

Production shapes:

- `LandingPageView`: `SmoothScroll` → black landing root → fixed navbar → ordered marketing sections → footer.
- `HomePageView`: `.command-surface-page` → investments header → floating nav → `.app-page.page-sections-stack` → performance, positions, signals.
- `MarketsPageView`: `.command-surface-page` → breadcrumb/refresh header → floating nav → `.app-page.page-sections-stack` → overview, FX, rotation, heatmap → guest conversion/lock surfaces.

### Section component

A section owns one user question or analytical domain. It should:

- expose a stable `id` for section navigation;
- use `.section-container`;
- render one section header with `.section-title` and `.section-subtitle`;
- own local mode/timeframe/filter state when no sibling needs it;
- compose a small number of widgets;
- provide loading, empty, and error handling at the narrowest useful boundary.

Platform section baseline:

~~~tsx
<section
  id="market-heatmap"
  className="section-container space-y-4 scroll-mt-16"
>
  <div className="flex flex-col gap-0.5 border-b border-border-subtle pb-2">
    <h2 className="section-title">Market Heatmap</h2>
    <p className="section-subtitle">...</p>
  </div>
  {/* controls, KPIs, workspace */}
</section>
~~~

### Widget/component boundary

Create a focused widget when it has its own:

- data visualization or transformation;
- loading/empty/error behavior;
- interaction model;
- reusable composition;
- meaningful props contract.

Create a row/card primitive when many items repeat the same visual grammar. Keep formatters and domain math outside render markup when they can be tested independently.

## State and data placement

Use the narrowest owner that satisfies all consumers:

| Concern | Owner |
|---|---|
| Authentication, initial database load | route |
| Page-wide timeframe/granularity/selected sector | PageView |
| Section-only filter or expanded row | section |
| Tooltip hover, chart series hover | widget |
| Formatting and aggregation math | library/domain helper |

Prefer server-loaded initial data, then cached client revalidation. Markets uses SWR with deduplication for shared datasets and performs hierarchy aggregation in memory so changing granularity does not refetch.

Do not let a presentational row fetch its own dataset. Avoid repeated database calls from sibling widgets.

## Dependency rules

- Sections may import widgets; widgets must not import PageViews.
- PageViews may coordinate sections through typed props/callbacks.
- Shared controls live under `src/components/ui` or an appropriate platform-level shared folder.
- Page-specific code stays in the page domain folder until it is reused.
- Use shared icon exports from `@/components/ui/icon-library`.
- Use `next/image` for managed images unless the source/runtime requires `<img>`.
- Keep user-facing copy localizable; do not bury English strings in generic primitives.

## Modification checklist

Before adding UI:

1. Find the closest production section/widget in the component inventory.
2. Search `globals.css` for the semantic token/class.
3. Decide which layer owns data and state.
4. Keep the PageView readable as an ordered table of contents.
5. Avoid duplicate navigation, drawer, card, and control implementations.
6. Add a global primitive only when the visual decision is reusable.
