# Splash Screen & Modern Skeleton Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the mobile and desktop loading experience of Ticknal by implementing a seamless native/web splash screen pipeline (Phase 1) and replacing full-screen spinning loaders with high-fidelity, zero-layout-shift skeleton transitions across all core platform routes and widgets (Phase 2).

**Architecture:** 
- **Phase 1 (Splash Screen):** Integrate `@capacitor/splash-screen` into the Capacitor Android container with smooth fade handoff (`SplashScreen.hide({ fadeDuration: 250 })`), configure PWA standalone startup branding in `manifest.ts`, and refine root `LoadingScreen.tsx` for brand entrance.
- **Phase 2 (Skeletons):** Build a unified design-token-compliant `Skeleton` primitive in `@/components/ui/Skeleton.tsx`, replace route-blocking full-screen spinners with route-specific skeletons for `/home`, `/charts`, `/markets`, `/strategies`, and `/news`, and upgrade widget loading states in drawers and market sections from spinners to structured skeletons.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Framer Motion, `@capacitor/splash-screen`, `@capacitor/core`.

---

## Global Constraints

- **Surface Tokens:** All skeletons and placeholder cards must strictly adhere to the pitch-black surface rule (`bg-black` or `bg-transparent`). Never use elevated gray container backgrounds (`zinc-900`, `#18181b`).
- **Hairlines & Shimmer:** Skeleton elements must use cold-gray translucent fills (`bg-white/[0.06]`, `bg-white/[0.08]`) with subtle `animate-pulse` or linear-gradient shimmer. Hairline borders must use `border-white/10` or `border-white/[0.06]`.
- **Typography:** Strictly sans-serif (`font-sans`), `tabular-nums` for numeric placeholders. Zero `font-mono`.
- **Brand Identity:** The wordmark is strictly lowercase `ticknal` in EuclidCircularSemibold (`<TicknalBrand />`).
- **Safe-Area Alignment:** Skeletons and splash screens must incorporate `var(--ticknal-safe-area-top)` and `var(--ticknal-safe-area-bottom)` for mobile notches and home indicators.
- **Verification Rule:** Proactively verify `npx tsc --noEmit` and `npm run build` after every step to guarantee zero build, type, console, or runtime errors.

---

## Review Focus

1. **Native Android Cold Start Flash:** Verify that the native Android splash screen (`@drawable/splash`) does not flash white or snap to black before the web shell is ready.
2. **Cumulative Layout Shift (CLS):** Ensure route and section skeletons match the exact dimensions, heights, and column grids of real content so that content pop-in causes zero visual jump.
3. **Responsive Parity (Mobile vs Desktop):** Skeletons must correctly reflect mobile layouts (`BottomNav`, 1-column cards) and desktop layouts (`SidebarNav`, multi-column cards, right watchlist rail).
4. **RTL / Arabic Support:** Skeletons with asymmetric layouts (e.g. icon on one side, text on the other) must mirror cleanly under `dir="rtl"` without breaking alignment.
5. **Reduced Motion:** Honor `prefers-reduced-motion` by disabling pulse animation and using a static low-contrast fill.

---

## Phase 1: Splash Screen & Startup Pipeline

### Task 1: Native Capacitor Splash Screen Integration
**Files:**
- Modify: `package.json`
- Modify: `capacitor.config.ts`
- Modify: `src/lib/native/capacitor-bridge.ts`
- Modify: `src/components/platform/NativeBridgeProvider.tsx`

- [ ] **Step 1: Install `@capacitor/splash-screen`**
  - Run: `npm install @capacitor/splash-screen`
  - Verify package addition in `package.json`.

- [ ] **Step 2: Configure splash screen plugin in `capacitor.config.ts`**
  - Add `SplashScreen` configuration:
    ```ts
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      backgroundColor: '#000000',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    }
    ```

- [ ] **Step 3: Add programmatic splash dismissal to `capacitor-bridge.ts`**
  - Export `dismissNativeSplashScreen()` using `SplashScreen.hide({ fadeDuration: 250 })`.
  - Wire safe invocation in `initNativeBridge()` and `NativeBridgeProvider.tsx` once the client shell mounts.

- [ ] **Step 4: Verify Android build resources**
  - Verify `@drawable/splash` in `android/app/src/main/res/` and check `styles.xml` launch theme compatibility.

---

### Task 2: PWA & Web Startup Entrance Polish
**Files:**
- Modify: `src/app/manifest.ts`
- Modify: `src/components/ui/LoadingScreen.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Polish web manifest splash properties**
  - Verify `manifest.ts` colors (`background_color: '#000000'`, `theme_color: '#000000'`) and maskable icon resolutions.

- [ ] **Step 2: Refine `LoadingScreen.tsx` entrance & exit motion**
  - Wrap `LoadingScreen` in smooth fade transitions.
  - Standardize brand mark typography using `<TicknalBrand />` below the central mark.
  - Add safe-area padding for mobile devices.

- [ ] **Step 3: Verification**
  - Run `npx tsc --noEmit` and confirm exit code 0.

---

## Phase 2: Modern Skeleton Transitions & Loading Patterns

### Task 3: Unified Skeleton Primitive Library
**Files:**
- Create: `src/components/ui/Skeleton.tsx`
- Modify: `src/app/globals.css` (if needed for shimmer keyframe)

- [ ] **Step 1: Implement `Skeleton` primitive**
  - Create `Skeleton({ className, variant, ...props })` supporting:
    - Text lines (`rounded-md`, `h-3` / `h-4`)
    - Circular avatars/badges (`rounded-full`)
    - Rectangular cards/charts (`rounded-none` or `rounded-lg`)
    - Subtle shimmer effect using pure black compatible token: `bg-white/[0.06]`.
    - Automatic `motion-reduce:animate-none`.

- [ ] **Step 2: Create unit tests for `Skeleton` component**
  - Test custom classes, accessibility attributes (`aria-hidden="true"`), and variants.

---

### Task 4: Route-Level Skeleton Shells (Replacing Full-Screen Loader)
**Files:**
- Create: `src/components/platform/home/HomePageSkeleton.tsx`
- Create: `src/components/platform/charts/ChartsPageSkeleton.tsx`
- Create: `src/components/platform/markets/MarketsPageSkeleton.tsx`
- Create: `src/components/platform/news/NewsPageSkeleton.tsx`
- Create: `src/components/platform/strategies/StrategiesPageSkeleton.tsx`
- Modify: `src/app/(main)/loading.tsx`
- Modify: `src/app/(main)/home/page.tsx`
- Modify: `src/app/(main)/charts/page.tsx`
- Modify: `src/app/(main)/markets/page.tsx`
- Modify: `src/app/(main)/news/page.tsx`

- [ ] **Step 1: Build `HomePageSkeleton.tsx`**
  - Replicate Home layout:
    - User greeting bar + Quick KPIs (Net Worth, 24h PnL)
    - Open positions / holding table shell with 3 placeholder rows
    - 2-column market opportunities / signals grid (reusing refined `MarketSignalsSkeleton`)

- [ ] **Step 2: Build `ChartsPageSkeleton.tsx`**
  - Replicate Charts workspace layout:
    - Header ticker pill, quote prices, strategy dropdown, timeframe pills
    - Main chart canvas area with subtle coordinate grid lines and bottom volume bars
    - Desktop right sidebar / watchlist rail placeholder (`hidden xl:flex`)

- [ ] **Step 3: Build `MarketsPageSkeleton.tsx`**
  - Replicate Markets layout:
    - Top sticky control bar & timeframe presets (`1D`, `1W`, `1M`, `1Y`)
    - Market Overview KPI cards (3-card grid)
    - Sector Heatmap placeholder grid (treemap block placeholders)
    - Foreign Investor Flow chart placeholder container

- [ ] **Step 4: Build `NewsPageSkeleton.tsx` & `StrategiesPageSkeleton.tsx`**
  - News: Filter chips + search input + 5 article cards with avatar, headline, summary lines.
  - Strategies: Builder workspace toolbar + node canvas / strategy flow placeholder.

- [ ] **Step 5: Refactor `src/app/(main)/loading.tsx` and Route Suspense Boundaries**
  - Route suspense to specific skeleton based on route or route-matching shell, keeping desktop `SidebarNav` and mobile `BottomNav` completely responsive and visible during page loads.

---

### Task 5: Widget & Drawer Loading Upgrades (Replacing Spinners)
**Files:**
- Modify: `src/components/platform/chart/ChartLoadingSkeleton.tsx`
- Modify: `src/components/platform/markets/sections/InvestorFlowSection.tsx`
- Modify: `src/components/platform/markets/sections/MajorIndicesSection.tsx`
- Modify: `src/components/platform/markets/sections/MarketHeatmapSection.tsx`
- Modify: `src/components/platform/markets/sections/MoneySupplySection.tsx`
- Modify: `src/components/platform/home/investments/positions/TickerPositionsDrawer.tsx`
- Modify: `src/components/platform/NotificationsDrawer.tsx`

- [ ] **Step 1: Modernize `ChartLoadingSkeleton.tsx`**
  - Remove intrusive center spinner; use subtle canvas shimmer + top bar status badge.

- [ ] **Step 2: Upgrade Markets section loading states**
  - Replace `<SectionLoadingState />` with responsive SVG / grid skeletons in:
    - `MajorIndicesSection` (3 index summary card placeholders)
    - `MarketHeatmapSection` (proportional mosaic blocks)
    - `InvestorFlowSection` (bar chart column placeholders with baseline axis)
    - `MoneySupplySection` (dual-line curve placeholder)

- [ ] **Step 3: Upgrade Drawers loading states**
  - Replace spinner in `TickerPositionsDrawer` and `NotificationsDrawer` with 3 card skeleton rows.

---

### Task 6: Comprehensive Verification & Build Green Check
**Files:**
- Codebase-wide verification

- [ ] **Step 1: Run typecheck**
  - `npx tsc --noEmit` exits with code 0.

- [ ] **Step 2: Run production build**
  - `npm run build` exits with code 0 across all static and dynamic routes.

- [ ] **Step 3: Verify mobile & desktop runtime behavior**
  - Test phone viewport (390px, 430px) and desktop (1280px, 1440px).
  - Verify smooth transition between skeleton and loaded data with zero Cumulative Layout Shift (CLS).
