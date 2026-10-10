# Hero Device Fixed-Snapshot Motion Design

**Date:** 2026-10-10  
**Status:** Awaiting written-spec review  
**Scope:** The landing hero's tablet and phone scenes only

## Purpose and success criteria

The hero devices should demonstrate Ticknal as a working product, not show static miniature pages or accept visitor interaction. They should autoplay a legible journey through the *actual* Charts, notifications, Markets, and News interfaces. The two device compositions may stagger their beats, but both must show all four experiences. A visitor should see COMI on the real chart, a deliberate tap that opens buy/sell alerts with company images, a transition to Markets with slow section-by-section scrolling, then a transition to News with a readable feed scroll.

The displayed financial and news data must be a **fixed snapshot captured on 2026-10-10**. Market prices should retain their true latest-session date (2026-10-07 in the inspected source), rather than be represented as 2026-10-10 prices. The snapshot does not refresh daily or read live databases at scene runtime. If capture-time data is unavailable or invalid, preserve the last complete checked-in snapshot; if there is no complete snapshot yet, stop and report the gap rather than fill it with fabricated values.

## Architecture

Keep the existing isolated `heroScene=landing` route convention, iframe viewports, real platform page components, and choreography controller in `src/components/landing/hero-scenes/`. Add a versioned, typed static snapshot module beside the scene files, with separate chart, Markets, News, alert, and asset manifests. The snapshot is captured once from the platform's existing data sources, trimmed only where rendering does not need the full history, checked into the repository, and annotated with capture time, source endpoint/query, and underlying market/news timestamps. It must be importable without a runtime fetch.

Scene mode supplies these fixtures to the **same** `ChartsWorkspaceView`, `NotificationsDrawer`, `MarketsPageView` and its section widgets, and `NewsPageView`/`NewsFeedTimeline`/`FeedPost` used on the main site. Use narrowly scoped optional snapshot props or a typed scene data context where props would become excessively deep. Do not create duplicate visual interpretations of those widgets or replace them with screenshots. Normal routes without `heroScene=landing` must retain their existing live behavior.

The Charts server route branches on the scene flag **before** Supabase auth, cached ticker/price retrieval, or portfolio queries. Its scene branch builds the real workspace from static chart/watchlist data. Client-side scene branches suppress or replace all chart-related data fetches, including intraday prices, signals, quote, opportunities, and strategy champion. Markets scene branches supply fixed sector performance/signals, FX fair-value, and investor-flow data to the real sections instead of SWR or effect-driven requests. The News scene passes fixed feed items and totals into the real page and disables SWR loading, revalidation, refresh, pagination fetches, and scene-only live-data actions. Any shared providers or nested widgets that would still issue data requests in scene mode must also be guarded. Static local image assets may load normally; no scene-time `/api/` request or database query is acceptable.

The four alert records remain an illustrative UI sequence, not historical trade recommendations; label them as a product preview where needed. Their price/company presentation should be internally consistent with the captured snapshot, and their date formatting must use the fixed 2026-10-10 as-of clock rather than `new Date()`. Company profile images for COMI, SWDY, EFID, and HRHO should be checked-in local assets used through the real drawer's existing logo rendering path. News age labels likewise use the fixed as-of clock (or absolute dates) so the snapshot does not appear to age into an inaccurate “live” feed. Avoid a visible “Live” claim in scene mode; an unobtrusive snapshot date is acceptable.

## Motion and device geometry

The sequence is a self-running, non-interactive product demonstration. The simulated cursor/tap is the only trigger; visitor clicks, focus, and scrolling inside either device stay disabled. The tablet leads with the chart and alerts; the phone can be offset in time to keep both screens from changing simultaneously. Each device eventually shows:

1. COMI Charts: settle on readable price/chart information and hold.
2. Alerts: animate a tap on the actual bell, open the actual drawer, hold long enough to read the buy/sell rows and logos, then close. On the phone, use the existing visible Markets bell after chart-to-Markets navigation, because the real mobile Charts view hides its bell; do not invent a new chart control.
3. Markets: navigate through the actual platform nav, settle, then scroll through the existing overview, FX, sector rotation, and heatmap areas with visible pauses at meaningful headings/widgets.
4. News: navigate through the actual platform nav, settle, then scroll multiple feed items at a reading pace before the loop returns to Charts. The phone therefore orders its beats Charts → Markets → Alerts → Markets scroll → News; the tablet orders them Charts → Alerts → Markets scroll → News.

Replace Markets' current one-size-fits-all 1,450 ms scroll with distance-aware timing and a capped, gentle velocity; use the same rule for News. Scroll the correct owner: the Markets page container, the desktop/tablet News feed's internal main scroller, and the phone News page's outer scroller. Use easing that starts and ends softly, with no abrupt snap on navigation. The choreography waits for the page/target to mount and fails to a stable held frame if a selector is missing; it must not fling the wrong container. When `prefers-reduced-motion` is enabled, show a stable representative chart view rather than autoplaying taps and scrolling.

Reserve an opaque black safe strip inside the tablet and phone scene viewports, beneath the mock hardware's time/battery overlay: at least 28 CSS px on the tablet and 32 CSS px on the phone, measured in the corresponding iframe viewport before outer device scaling. Clip page content to the remaining scene rectangle; no page header, cursor, drawer, or scrolling content may paint into that top strip. Keep the phone's bottom home-indicator region clear as well. The black strip and any drawer surfaces must obey Ticknal's pure-black/square-edge design rules.

## Data capture and integrity

Capture one complete snapshot for the 2026-10-10 version. For chart and market series, include actual latest available session dates and enough real observations to render the native widgets. For News, retain real item IDs, source names, headlines, bodies, links, and publication times needed by the existing feed components. Trim large responses to the fields/records required by the hero, but do not alter numeric values or rewrite headlines. Record the capture provenance in code comments or a manifest, including an explicit `capturedAt` and `asOf` for each data family.

The implementation should make the snapshot boundary testable: scene-mode data is an imported constant; scene-mode components do not initiate fetch/SWR/database work; production routes without the flag are unaffected. A browser network test must reject any hero iframe `/api/` data request during a full tablet and phone cycle, not merely assert that responses happened to be successful. It must also catch server-side scene database access by instrumented tests or a deliberately unavailable database during scene-route rendering.

## Error handling and verification

Asset failures fall back to the existing ticker initials, but the acceptance test must confirm that all four local logos normally load. A failed transition or absent scroll target holds the current scene and retries/loops safely, without a blank viewport or uncaught promise rejection. Both devices must render correctly at representative desktop and mobile landing widths.

Acceptance checks cover: real component identity and visual comparison with corresponding platform pages; all four scenes and paced Markets/News scrolling; readable logo-bearing alerts; no collision with status bars/home indicator at any phase; deterministic snapshot dates and values after reload; zero scene-time data API requests/database queries; no 500s, console errors, hydration mismatches, or unhandled exceptions. Run focused tests, `npx tsc --noEmit`, and `npm run build`, then visually inspect a complete cycle on tablet and phone. Do not claim completion if build, type, console, or runtime verification is red.

## Out of scope

This change does not redesign Charts, Markets, News, navigation, or notifications for ordinary users; wire a daily snapshot job; add visitor interaction inside mock devices; or portray the fixed data as live/current market prices. The requested work is confined to the landing hero demonstration and its scene-only data adapters.
