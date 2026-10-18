# Home Page In-App Tutorial & Spotlight Tour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a high-performance, lightweight, bilingual In-App Product Tour system for Ticknal, starting with an interactive 4-step walkthrough on the Home page (`/home`) that introduces new users to portfolio performance, positions, algorithmic buy signals, and quick navigation.

**Architecture:** A native React + Framer Motion headless Tour Provider mounts an SVG spotlight cutout mask portal at `<body>` level, dynamically positioning a pitch-black floating popover card next to tagged DOM elements (`data-tour="..."`), with bilingual English/Arabic RTL mirroring and persistent first-time completion tracking via `localStorage`.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Framer Motion, Tailwind CSS, Lucide Icons, Ticknal Design Tokens (`AGENTS.md`).

**Spec:** In-App Walkthrough Tour Specification for Ticknal Home Page.

---

## Global Constraints

- **Strict Pure Pitch Black Surfaces (`AGENTS.md`)**: Tour cards must strictly use `#000000` (`bg-black`) with hairline borders (`border-white/10`). NEVER use elevated dark grays (`#18181b`, `zinc-900`, etc.).
- **No Monospace Typography (`AGENTS.md`)**: All step numbers and badges must use sans-serif with CSS `tabular-nums`, NEVER `font-mono`.
- **Bilingual & RTL**: All labels, step counters, and navigation arrows must support English (LTR) and Arabic (RTL) seamlessly.
- **Zero Heavy Dependencies**: Must not install WalkMe, Pendo, or heavy 3rd-party tour packages; uses native React portals and existing Framer Motion.
- **Non-blocking & Dismissible**: Users must be able to skip the tour at any time with Escape key or "Skip" button, with zero UI freezing or stuck overlays.

---

## Review Focus

1. **Hydration / SSR Safety**: Tour elements must only mount on client-side after initial page hydration and splash completion without SSR mismatches.
2. **Dynamic Coordinate Calculation**: Popovers must cleanly re-calculate positions on window resize, scroll, or orientation changes.
3. **Off-screen Element Scrolling**: Target elements scrolled out of view must smoothly scroll into view (`scrollIntoView({ behavior: 'smooth', block: 'center' })`) before rendering the spotlight.
4. **Mobile Responsiveness**: On small mobile viewports, the popover must dock cleanly at the bottom or top without overflowing the screen width.
5. **Re-triggerability**: Users must be able to replay the tour at any time via a "Quick Tour" button in the header, even after dismissing it once.

---

## Task Decomposition

### Task 1: Tour Core Types & Home Tour Configuration

**Files:**
- Create: `src/components/ui/tour/types.ts`
- Create: `src/lib/tours/home-tour-config.ts`

**Steps:**
- [ ] Define `TourStep`, `TourConfig`, and `TourContextType` interfaces in `src/components/ui/tour/types.ts`.
- [ ] Create `HOME_PAGE_TOUR` in `src/lib/tours/home-tour-config.ts` with 4 steps in English and Arabic:
  1. `[data-tour="home-portfolio-summary"]`: Portfolio Balance, Net Worth, & Cash/Stock Split.
  2. `[data-tour="home-positions-section"]`: Active Positions & Exit Signal Safeguards.
  3. `[data-tour="home-signals-section"]`: Algorithmic Buy Opportunities & Strategy Switcher.
  4. `[data-tour="home-floating-nav"]`: Floating Navigation & Quick Order Execution.
- [ ] Export step definitions and verify type correctness.

---

### Task 2: Spotlight Mask & Pitch-Black Popover Card Primitives

**Files:**
- Create: `src/components/ui/tour/TourSpotlightOverlay.tsx`
- Create: `src/components/ui/tour/TourPopoverCard.tsx`

**Steps:**
- [ ] Create `TourSpotlightOverlay.tsx`:
  - Renders a fixed fullscreen SVG overlay with a rectangular cutout mask (`mask="url(#spotlight-mask)"`) and rounded corners (`rx="16"`).
  - Uses Framer Motion for smooth animated transitions between bounding rects when advancing steps.
  - Hairline glowing cyan/emerald border (`stroke="#00F5A0"`) around the active spotlight element.
- [ ] Create `TourPopoverCard.tsx`:
  - Pure `#000000` pitch black surface, `border border-white/10`, `rounded-xl`, shadow-2xl.
  - Step counter: `Step {current} of {total}` using `tabular-nums`.
  - Bilingual Title (`titleEn` / `titleAr`) and Description (`descEn` / `descAr`).
  - Action buttons: `Skip`, `Previous`, and `Next` / `Finish` with Arabic RTL chevron mirroring.
  - Keyboard listener: `Escape` to dismiss, `ArrowRight` / `ArrowLeft` to navigate steps.

---

### Task 3: Global Tour Provider & Context Hook

**Files:**
- Create: `src/components/ui/tour/TourProvider.tsx`
- Create: `src/components/ui/tour/TourTriggerButton.tsx`
- Create: `src/components/ui/tour/index.ts`

**Steps:**
- [ ] Implement `TourProvider`:
  - State: `activeTour: TourConfig | null`, `currentStepIndex: number`, `isOpen: boolean`.
  - Methods: `startTour(config: TourConfig, force?: boolean)`, `nextStep()`, `prevStep()`, `skipTour()`, `completeTour()`.
  - Check `localStorage.getItem('ticknal_tour_completed_' + id)` to avoid re-annoying returning users unless triggered manually.
  - Auto-scroll target into view smoothly before calculating popover coordinates.
  - React Portal rendering at `document.body` level with `z-[9999]`.
- [ ] Implement `TourTriggerButton.tsx`:
  - Subtle, elegant pill button with a `<HelpCircle />` or Sparkles icon: "Quick Tour" / "جولة تعريفية".
- [ ] Export public API from `src/components/ui/tour/index.ts`.

---

### Task 4: Integrate Tour in Home Page & Root Layout

**Files:**
- Modify: `src/app/layout.tsx` (wrap tree in `<TourProvider>`)
- Modify: `src/components/platform/home/HomePageView.tsx` (tag elements with `data-tour`)
- Modify: `src/components/platform/home/investments/HomeInvestmentsHeader.tsx` (add Quick Tour trigger button)

**Steps:**
- [ ] Wrap application root in `TourProvider` inside `src/app/layout.tsx`.
- [ ] In `src/components/platform/home/HomePageView.tsx`:
  - Add `data-tour="home-portfolio-summary"` to `PerformanceOverviewSection`.
  - Add `data-tour="home-positions-section"` to `MyPositionsSection`.
  - Add `data-tour="home-signals-section"` to `MarketSignalsSection`.
  - Add `data-tour="home-floating-nav"` to `HomeFloatingNav`.
  - Add `useEffect` to trigger `startTour(HOME_PAGE_TOUR)` automatically after 1000ms on first-ever user visit.
- [ ] In `HomeInvestmentsHeader.tsx`, add the `<TourTriggerButton />` alongside existing action buttons so users can re-open the walkthrough at any time.

---

### Task 5: Verification & Quality Audit

**Files:**
- Verification: `npx tsc --noEmit`
- Verification: `npm run build`

**Steps:**
- [ ] Run `npx tsc --noEmit` and confirm exit code 0.
- [ ] Run `npm run build` and confirm exit code 0.
- [ ] Verify both English and Arabic rendering, smooth spotlight transitions, and responsive mobile behavior.
