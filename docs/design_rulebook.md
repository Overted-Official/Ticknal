# Ticknal Landing Page — Comprehensive Design Rulebook & System Specification

> **Status**: Institutional Reference & Living Style Guide  
> **Target Application**: Ticknal Quantitative Trading Terminal (`https://ticknal.com`)  
> **Source Inspiration**: Framer Lateral Template Architecture (`https://lateral.framer.media/`)  
> **Tech Stack**: Next.js 15 (App Router), Tailwind CSS v4, Framer Motion, Lenis Smooth Scroll, TypeScript  

---

## Table of Contents
1. [Design Philosophy & Aesthetic Direction](#1-design-philosophy--aesthetic-direction)
2. [Dual-Canvas Alternation & Rhythm](#2-dual-canvas-alternation--rhythm)
3. [Typography System & Hierarchy](#3-typography-system--hierarchy)
4. [Color Palette & Token Specifications](#4-color-palette--token-specifications)
5. [Spacing, Sizing & Layout Geometry](#5-spacing-sizing--layout-geometry)
6. [Component Anatomy & UI Patterns](#6-component-anatomy--ui-patterns)
7. [Motion, Physics & Animation Principles](#7-motion-physics--animation-principles)
8. [Section-by-Section Implementation Breakdown](#8-section-by-section-implementation-breakdown)
9. [Developer Implementation & Guardrails Checklist](#9-developer-implementation--guardrails-checklist)

---

## 1. Design Philosophy & Aesthetic Direction

The Ticknal design system embodies **Institutional Modernism & Editorial Precision**. It balances the clinical rigor demanded by high-frequency quantitative traders with the bespoke aesthetic elegance of Swiss typography and high-end editorial publications.

### Core Tenets
1. **High Signal, Zero Clutter**: Every element serves an informational or hierarchical purpose. Extraneous lines, flashy multi-colored gradients, and heavy drop-shadows are strictly avoided in favor of hairline borders and calibrated typography.
2. **Dual-Canvas Narrative Flow**: Rather than confining the user to an eternal dark or light interface, Ticknal shifts dynamically between **Deep Terminal Pitch Black (`#000000` / `#030303`)** and **Architectural Paper White (`#F9F9F9` / `#E5E5E3`)**. This creates distinct visual chapters as the visitor scrolls through the platform narrative.
3. **Typographic Duality**: Headlines utilize a serif typeface (**Spectral / Sentient**) to evoke authority, compounding alpha, and timeless financial legacy, while all body, numbers, and user interface controls rely on an ultra-clean sans-serif (**Geist Sans / Inter**) and technical monospaced font (**Geist Mono / SF Mono**) for crystal-clear readability.
4. **Subtle Tactility**: Interactive elements employ micro-springs, hairline borders (`border-white/10`, `border-zinc-200`), soft radial vignettes, and muted backdrops rather than garish skeuomorphism.

---

## 2. Dual-Canvas Alternation & Rhythm

The page is architected into alternating thematic zones. This deliberate rhythmic contrast prevents cognitive fatigue and demarcates conceptual shifts from macro features to deep quantitative mechanics.

| Section | Component File | Canvas Color | Canvas Name | Semantic Intent |
| :--- | :--- | :--- | :--- | :--- |
| **00. Navbar** | `Navbar.tsx` | `transparent` / `rgba(0,0,0,0.8)` | Floating Glass | Unobtrusive navigation, adapts on scroll with backdrop blur |
| **01. Hero** | `Hero.tsx` | `#000000` | Dark Void | Immersion, terminal setup, institutional trading desk imagery |
| **02. Value Metrics** | `WhyChooseUs.tsx` | `#F9F9F9` | Paper Daylight | Open, breathable daylight editorial presenting backtested proof |
| **03. Deep Architecture**| `BentoGrid.tsx` | `#000000` | Dark Terminal | Technical deep-dive, 2-column sticky scroll, platform UI cards |
| **04. Market Solutions** | `LanguagesSection.tsx`| `#F9F9F9` | Warm Stone | Strategy segmentation (Day Trading, Swing, Algos) via tabs |
| **05. Social Proof** | `Testimonials.tsx` | `#000000` | Dark Stage | High-conviction trader case studies with photographic backdrops |
| **06. Knowledge Base** | `FAQ.tsx` | `#F9F9F9` | Crisp Paper | Clean question-and-answer accordions without dark distractions |
| **07. Cockpit CTA** | `QuickStartSection.tsx`| Outer: `#F9F9F9` / Inner: `#191919`| Floating Cockpit | Floating elevated dark terminal card resting on paper canvas |
| **08. Global Anchor** | `Footer.tsx` | `#000000` | Pitch Obsidian | Terminal closure with 10% opacity oversized brand watermark |

---

## 3. Typography System & Hierarchy

The typography system relies on three distinct font families, each fulfilling a rigorous role across the document object model.

### 3.1 Font Families

```css
/* Display Serif - Headlines, Quotes, Metric Numbers */
--font-spectral: 'Spectral', 'Sentient', 'Georgia', serif;

/* Interface Sans - Body, Navigation, Buttons, Subtitles */
--font-geist-sans: 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Technical Monospace - Badges, Timestamps, Tickers, Step Numbers */
--font-mono: 'Geist Mono', 'SF Mono', Menlo, Monaco, Consolas, monospace;
```

### 3.2 Typographic Hierarchy & Scale

#### A. Hero Display Title (Display 01)
- **Tag**: `<h1>`
- **Font Family**: `font-serif` (`--font-spectral`)
- **Font Weight**: `font-normal` (400)
- **Size**: `text-4xl sm:text-6xl md:text-7xl lg:text-[76px]`
- **Line Height**: `leading-[1.06]` (tight vertical rhythm)
- **Tracking**: `tracking-[-0.03em]`
- **Color Treatment**: Two-tone gradient contrast:
  - Line 1: `text-white` (100% white)
  - Line 2: `text-white/40` (40% muted white)

#### B. Major Section Headings (Display 02)
- **Tag**: `<h2>`
- **Font Family**: `font-serif` (`--font-spectral`)
- **Font Weight**: `font-normal` (400)
- **Size**: `text-4xl sm:text-5xl md:text-6xl lg:text-[64px]`
- **Line Height**: `leading-[1.08]`
- **Tracking**: `tracking-[-0.03em]`
- **Color**:
  - Dark canvas: `text-white` (`#FFFFFF`)
  - Light canvas: `text-[#080808]` (Deep Obsidian)

#### C. Card & Feature Headings (Display 03 / H3)
- **Tag**: `<h3>`
- **Font Family**: `font-serif` (`--font-spectral`)
- **Font Weight**: `font-normal` (400) or `font-light` (300)
- **Size**: `text-2xl sm:text-3xl lg:text-[32px]` to `text-3xl sm:text-4xl`
- **Line Height**: `leading-[1.2]`
- **Tracking**: `tracking-[-0.05em]` to `tracking-tight`

#### D. Stat Giant Numerals (Hero Stats)
- **Tag**: `<div>`
- **Font Family**: `font-serif` (`--font-spectral`)
- **Font Weight**: `font-light` (300)
- **Size**: `text-6xl sm:text-7xl lg:text-[84px]` (in `WhyChooseUs.tsx`) / `text-5xl sm:text-6xl` (in `LanguagesSection.tsx`)
- **Line Height**: `leading-none`
- **Tracking**: `tracking-tight`

#### E. Section Kicker / Subtitle Badges
- **Tag**: `<span>`
- **Font Family**: `font-mono`
- **Font Weight**: `font-medium` (500)
- **Size**: `text-xs` (12px)
- **Transform**: `uppercase`
- **Letter Spacing**: `tracking-widest` (0.1em)
- **Color**: `text-[#969290]`
- **Prefix Graphic**: `w-2 h-2 rounded-[2px] bg-[#969290]` (solid square dot)

#### F. Lead Paragraphs & Body Prose
- **Tag**: `<p>`
- **Font Family**: `font-sans` (`--font-geist-sans`)
- **Font Weight**: `font-normal` (400)
- **Size**: `text-base sm:text-lg` (16px to 18px)
- **Line Height**: `leading-relaxed` (1.625)
- **Color**:
  - Dark Canvas: `text-white/70` or `text-white/60`
  - Light Canvas: `text-[#636363]`

#### G. Secondary Body & Card Explanations
- **Tag**: `<p>`
- **Font Family**: `font-sans`
- **Font Weight**: `font-normal` (400)
- **Size**: `text-sm sm:text-base` (14px to 16px)
- **Line Height**: `leading-relaxed`

#### H. Interactive Buttons & Navigation Links
- **Tag**: `<a>`, `<button>`
- **Font Family**: `font-sans`
- **Font Weight**: `font-medium` (500)
- **Size**: `text-[13px]` to `text-sm` (14px)
- **Tracking**: `tracking-tight`

---

## 4. Color Palette & Token Specifications

Ticknal strictly prohibits arbitrary neon hues or generic saturated blues. The palette is rooted in monochromatic depth with precision accents.

### 4.1 Surface & Background Tokens

| Token / Value | Tailwind Class | Semantic Context |
| :--- | :--- | :--- |
| `#000000` | `bg-black` | Primary dark canvas (Hero, Bento, Testimonials, Footer) |
| `#030303` | `bg-[#030303]` | Root body container background |
| `#0e0e0e` | `bg-[#0e0e0e]` | Dark card surface (Bento cards, Testimonial cards) |
| `#191919` | `bg-[#191919]` | Elevated dark card container (QuickStart cockpit) |
| `#F9F9F9` | `bg-[#F9F9F9]` | Primary light canvas (WhyChooseUs, Solutions, FAQ) |
| `#EBEBEB` | `bg-[#EBEBEB]` | High-contrast light card in BentoGrid (Trader Spotlight) |
| `#E5E5E3` | `bg-[#E5E5E3]` | Architectural warm-grey tab card container (Solutions) |

### 4.2 Text Color Tokens

| Token / Value | Tailwind Class | Usage & Contrast |
| :--- | :--- | :--- |
| `#ffffff` (100%) | `text-white` | High-emphasis headlines, active links, primary buttons |
| `rgba(255,255,255, 0.70)` | `text-white/70` | Subtitles, primary lead paragraphs on dark |
| `rgba(255,255,255, 0.60)` | `text-white/60` | Secondary descriptions, card body text on dark |
| `rgba(255,255,255, 0.40)` | `text-white/40` | Muted headline accents, step numbers, subtle metadata |
| `rgba(255,255,255, 0.30)` | `text-white/30` | Inactive step indicators, background borders |
| `#080808` | `text-[#080808]` | High-emphasis headlines and primary text on light canvas |
| `#636363` | `text-[#636363]` | Subtitles, body prose, and secondary text on light canvas |
| `#969290` / `#8F8B85`| `text-[#969290]` | Monospace kicker badges, stat labels, category tags |

### 4.3 Border & Separator Tokens

| Token / Value | Tailwind Class | Placement |
| :--- | :--- | :--- |
| `rgba(255,255,255, 0.10)` | `border-white/10` | Bento card frames, footer divider, partner ticker top line |
| `rgba(255,255,255, 0.15)` | `border-white/15` | Pill tag borders, metric vertical sub-dividers |
| `rgba(255,255,255, 0.08)` | `border-white/[0.08]` | Sticky navbar bottom border during scroll |
| `rgba(255,255,255, 0.06)` | `border-white/[0.06]` | QuickStart card outer border |
| `#E5E7EB` / Zinc-200 | `border-zinc-200` | WhyChooseUs metric dividers, FAQ accordion row dividers |

### 4.4 Semantic & Functional Accents

- **Signal Confluence / Profit / Active State**: `#10B981` (`bg-emerald-600` / `text-emerald-500`)
- **Risk / Stop Loss**: `#EF4444` (`text-red-500`)
- **Selection / Highlight**: `selection:bg-white selection:text-black`

---

## 5. Spacing, Sizing & Layout Geometry

### 5.1 Max-Width Container Standard
- **Global Container Width**: `max-w-[1440px] mx-auto w-full`
- **Cockpit CTA Inner Card**: `max-w-[1360px] mx-auto w-full`
- **Text Readability Containers**:
  - Section Headers: `max-w-3xl mx-auto` (center-aligned) or `max-w-4xl` (left-aligned)
  - Subtitle Paragraphs: `max-w-xl` or `max-w-md` (prevents line length from exceeding 65–75 characters)

### 5.2 Section Padding Rhythm
- **Vertical Spacing**: `py-24 sm:py-32` (96px mobile -> 128px desktop)
- **Horizontal Gutters**: `px-6 sm:px-10 lg:px-14` (24px mobile -> 40px tablet -> 56px desktop)
- **Navbar Height**: Exact `h-[72px]` fixed at `top-0`

### 5.3 Element Gaps & Micro-Spacing
- **Kicker Badge to H2**: `mb-6` (24px)
- **H2 to Subtitle Paragraph**: `mb-6` (24px)
- **Subtitle Paragraph to Action Button**: `mb-8` to `mb-10` (32px to 40px)
- **Action Button to Section Content/Grid**: `mb-14` to `mb-24` (56px to 96px)
- **Card Grids**: `gap-6 sm:gap-8` (24px to 32px)
- **Sticky Bento Layout Columns**: `gap-12 lg:gap-20` (48px to 80px)

---

## 6. Component Anatomy & UI Patterns

### 6.1 Pill Buttons (Primary & Secondary)

Pill buttons are the quintessential interactive element in Ticknal.

#### Primary Light Button (on Dark Canvas)
```html
<Link 
  href="/login" 
  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all font-sans"
>
  Start Trading
</Link>
```
- **Border Radius**: `rounded-full` (9999px)
- **Padding**: `px-5 py-2.5` (nav/cards) or `px-6 py-3` (hero/sections)
- **Typography**: `font-sans font-medium text-sm` (or `text-[13px]`)
- **Hover Behavior**: `hover:bg-white/90` with micro-scale `hover:scale-[1.02]` and click press `active:scale-[0.98]`
- **Hero Variant Shadow**: `shadow-[0_4px_24px_rgba(255,255,255,0.18)]` (soft white atmospheric bloom)

#### Primary Dark Button (on Light Canvas)
```html
<Link 
  href="/login" 
  className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#030303] text-white text-sm font-medium hover:bg-zinc-800 transition-colors font-sans"
>
  Start Trading
</Link>
```

---

### 6.2 Announcement Pill Badge
Used in the Hero for major model updates and feature announcements.
```html
<Link
  href="#strategies"
  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 hover:border-white/30 hover:bg-white/[0.1] transition-all text-[13px] text-white/90 backdrop-blur-md font-sans tracking-tight"
>
  <span>Proprietary PSI V2 &amp; Thoth Models Live</span>
  <span className="text-white/60">→</span>
</Link>
```

---

### 6.3 Monospace Kicker Badge
Anchors every section header with a disciplined, technical marker.
```html
<div className="flex items-center gap-2 mb-6">
  <span className="w-2 h-2 rounded-[2px] bg-[#969290]" />
  <span className="text-xs font-mono uppercase tracking-widest text-[#969290] font-medium">
    Platform Intelligence
  </span>
</div>
```

---

### 6.4 Two-Column Sticky Scroll (Bento Grid)
A defining architectural pattern of the landing page.
- **Left Column**: `sticky top-36 w-[300px] lg:w-[360px] shrink-0`
  - Remains pinned in place while the user scrolls through the 3 cards.
  - Active step item displays full white title and animated subtitle:
  ```html
  <span className="text-xs font-mono block mb-1.5 text-white/70">01</span>
  <span className="text-xl lg:text-2xl font-sans block tracking-tight text-white font-medium">
    Eliminate Blind Entries
  </span>
  <p className="text-sm text-white/60 font-sans font-normal mt-2 leading-relaxed">
    Proprietary PSI & Thoth models that quantify trend momentum...
  </p>
  ```
  - Inactive steps are dimmed to `text-white/40` and expand smoothly on click or scroll.
- **Right Column**: `space-y-28 lg:space-y-36 flex-1 w-full`
  - Contains full-bleed terminal screenshots, sub-headlines, descriptions, and 2-column key metric callouts.

---

### 6.5 Interactive Underline Tab Switcher (Solutions)
Allows rapid switching between trading styles without leaving the section.
- **Tab Header**: `border-b border-zinc-200 gap-8 sm:gap-12`
- **Active Indicator**: Animated Framer Motion underline with layout spring:
```html
<motion.div
  layoutId="solutionsUnderline"
  className="absolute bottom-0 inset-x-0 h-0.5 bg-[#080808]"
  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
/>
```
- **Card Container**: Architectural grey card (`bg-[#E5E5E3] rounded-3xl p-8 sm:p-14`) hosting a 2-column layout (Text + Visual with partner logo and large metric).

---

### 6.6 Accordion FAQ Pattern
- **Layout**: 2 columns (Left column: Sticky header; Right column: Accordion rows).
- **Row Styling**: `border-t border-b border-zinc-200 divide-y divide-zinc-200`.
- **Trigger**: Full-width button with hover color shift.
- **Icon**: Minimal SVG plus (+) that rotates 45 degrees into an (x) upon expansion:
```html
<svg className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}>
  <line x1="12" y1="5" x2="12" y2="19" />
  <line x1="5" y1="12" x2="19" y2="12" />
</svg>
```

---

### 6.7 Infinite Marquee Partner Ticker
Continuous horizontal animation displaying enterprise liquidity and partner brands.
- **CSS Keyframes**:
```css
@keyframes marquee {
  0% { transform: translateX(0%); }
  100% { transform: translateX(-50%); }
}
.animate-marquee {
  display: flex;
  width: max-content;
  animation: marquee 35s linear infinite;
}
.animate-marquee:hover {
  animation-play-state: paused;
}
```
- **Implementation**: Duplicated logo array `[...partnerLogos, ...partnerLogos]` in a single flex track. Images rendered with `opacity-70 hover:opacity-100 transition-opacity`.

---

### 6.8 Giant Vector Brand Watermark
Positions Ticknal's symbol subtly across the lower edge of the footer.
- **File**: `/images/landing/ticknal_watermark.svg`
- **Dimensions**: Responsive scale `w-[450px] sm:w-[650px] md:w-[911px]`
- **Opacity**: `opacity-10`
- **Positioning**: `absolute right-0 bottom-0 pointer-events-none select-none translate-y-[10%]`

---

## 7. Motion, Physics & Animation Principles

Ticknal adheres to natural, non-distracting physics. Animations exist exclusively to convey depth, confirm actions, or smoothly transition between content states.

### 7.1 Scroll Physics (Lenis Smooth Scroll)
- **Library**: `lenis`
- **Configuration**: Wrapped inside `<SmoothScroll>` provider.
- **Experience**: Inertia-damped scroll wheel acceleration mimicking high-end native desktop applications.

### 7.2 Entrance Transitions (Scroll In-View)
Elements animate when scrolling into viewport with subtle vertical translation and opacity:
```javascript
initial={{ opacity: 0, y: 16 }}
whileInView={{ opacity: 1, y: 0 }}
viewport={{ once: true }}
transition={{ duration: 0.5, delay: idx * 0.15 }}
```
- **Y-Distance**: 14px to 24px (never large, floaty 60px jumps)
- **Trigger**: `viewport={{ once: true }}` (prevents distracting re-animations when scrolling back up)

### 7.3 Layout Springs
Used for active tab indicators and accordion transitions:
- **Type**: `'spring'`
- **Stiffness**: `500`
- **Damping**: `35`
- **Accordion Bezier**: `ease: [0.16, 1, 0.3, 1]` (Apple cubic-bezier curve)

### 7.4 Micro-Interactions on Hover
- **Pill Buttons**: `hover:scale-[1.02] active:scale-[0.98]`
- **Card Images**: `group-hover:scale-105 transition-transform duration-700` inside `overflow-hidden` containers.

---

## 8. Section-by-Section Implementation Breakdown

### 8.1 Navbar (`src/components/landing/Navbar.tsx`)
- **Structure**: `<header>` fixed at top (`z-50`).
- **Scroll Detection**: Listens to `window.scrollY > 20`.
- **Top State**: `bg-transparent`.
- **Scrolled State**: `bg-black/80 backdrop-blur-xl border-b border-white/[0.08]`.
- **Links**: `text-[14px] font-normal text-white/90 hover:text-white`.
- **Actions**: "Log In" text link + "Start Trading" white pill button.
- **Mobile Menu**: Responsive hamburger with `AnimatePresence` animated drawer.

### 8.2 Hero Section (`src/components/landing/Hero.tsx`)
- **Structure**: `<section>` with `min-h-[900px] lg:h-[950px] bg-black text-white`.
- **Background Visual**: Real photographic trading terminal desk (`hero1.jpg`) with dual dark gradient overlays:
  - Horizontal: `bg-gradient-to-r from-black via-black/60 to-transparent` (protects headline readability).
  - Vertical: `bg-gradient-to-t from-black via-black/70 to-transparent` (seamless transition to section below).
- **Typography**: Dual-tone 76px Spectral serif title.
- **Bottom Shelf**: Enterprise partner marquee ticker divided by `border-t border-white/10`.

### 8.3 Why Choose Us (`src/components/landing/WhyChooseUs.tsx`)
- **Structure**: Light canvas `bg-[#F9F9F9] text-[#080808]`, `py-24 sm:py-32`.
- **Content**: Left-aligned headline, lead text, and black pill CTA.
- **Data Strip**: 3-column metric grid divided by `border-zinc-200` lines.
- **Stats**: `15+` Years backtested data, `98%` Signal confluence accuracy, `32k+` Active signals analyzed in `84px` light serif numerals.

### 8.4 Bento Grid (`src/components/landing/BentoGrid.tsx`)
- **Structure**: Deep black canvas `bg-black text-white`.
- **Layout**: Center header + 2-column sticky layout.
- **Interactive State**: `activeStep` automatically synchronized via scroll listener and clickable step indicators.
- **Right Cards**:
  - Card 1: *Spot Setups Instantly* with 15m intraday resolution stats.
  - Card 2: *Trade With Disciplined Rules* with nested light testimonial card (`bg-[#EBEBEB]`).
  - Card 3: *Institutional Risk Intelligence* with `+42.8%` average alpha stats.

### 8.5 Solutions by Style (`src/components/landing/LanguagesSection.tsx`)
- **Structure**: Light canvas `bg-[#F9F9F9] text-[#080808]`.
- **Navigation**: 4 horizontal tabs (Day Trading, Swing Trading, Portfolio Funds, Quant & Algos).
- **Showcase Container**: `bg-[#E5E5E3] rounded-3xl p-8 sm:p-14`.
- **Right Image**: Architectural visual with client logo top-left and giant metric bottom-left.

### 8.6 Testimonials & Case Studies (`src/components/landing/Testimonials.tsx`)
- **Structure**: Dark stage `bg-black text-white`.
- **Grid**: 3 large cards (`rounded-3xl border border-white/10 bg-[#0e0e0e] min-h-[480px] sm:min-h-[540px]`).
- **Interactivity**: First card expanded by default; cards 2 & 3 feature a round plus button that expands the quote on click.

### 8.7 FAQ Accordion (`src/components/landing/FAQ.tsx`)
- **Structure**: Light canvas `bg-[#F9F9F9] text-[#080808]`.
- **Layout**: Sticky left column with section title & CTA; right column with 5 accordion items.
- **Accordion Logic**: Mutually exclusive single-open index state with smooth height animation.

### 8.8 QuickStart Cockpit (`src/components/landing/QuickStartSection.tsx`)
- **Structure**: Outer light canvas `bg-[#F9F9F9]` hosting an inner dark cockpit card (`bg-[#191919] rounded-[20px] border border-white/[0.06] shadow-2xl`).
- **Layout**: Left side text and white CTA button; right side full-width dashboard screenshot.

### 8.9 Footer Anchor (`src/components/landing/Footer.tsx`)
- **Structure**: Absolute black `bg-[#000000] text-white`.
- **Elements**: Top CTA banner, divider line, 3-column navigation directory (Platform, Company, Connect), and bottom bar with legal copyright.
- **Graphic**: Faded 10% opacity SVG watermark anchored to bottom right.

---

## 9. Developer Implementation & Guardrails Checklist

When adding new components, pages, or features to the Ticknal landing page, verify adherence to the following rules:

- [ ] **Canvas Integrity**: If adding a section, explicitly designate it as either **Pitch Dark (`#000000`)** or **Daylight Paper (`#F9F9F9`)**. Never mix mismatched background greys.
- [ ] **Serif for Headlines Only**: All major titles (`h1`, `h2`, `h3`, giant stat numbers) MUST use `font-serif` (`--font-spectral`). Never use serif for buttons, badges, navigation, or body paragraphs.
- [ ] **Sans & Mono for UI**: All body text, button labels, and tables MUST use `font-sans` (`--font-geist-sans`). All kickers, tickers, and resolution tags MUST use `font-mono`.
- [ ] **Hairline Borders**: Borders on dark mode MUST be `border-white/10` or `border-white/15`. Borders on light mode MUST be `border-zinc-200`. Never use solid heavy borders.
- [ ] **Pill Button Consistency**: Buttons MUST be `rounded-full`. Use pure white background with black text on dark canvas; use black (`#030303`) with white text on light canvas.
- [ ] **Image Vignettes**: When placing text over photography (like in the Hero or Testimonials), always include dark gradient vignettes (`bg-gradient-to-t`, `bg-gradient-to-r`) to maintain strict WCAG AAA contrast ratios.
- [ ] **Container Constraints**: All section content MUST sit inside `max-w-[1440px] mx-auto w-full px-6 sm:px-10 lg:px-14`.
- [ ] **Motion Calibration**: Use `viewport={{ once: true }}` for entrance fades and spring physics for layout transitions. Avoid jarring or high-displacement translate animations.
