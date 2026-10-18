# Globals CSS MECE Architecture & Theming Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish `src/app/globals.css` as the single, MECE (Mutually Exclusive, Collectively Exhaustive) source of truth for all CSS and design tokens across Ticknal, unifying dual token families and laying the robust foundation for light/dark theme switching.

**Architecture:** Alias legacy surface/text/border variables directly to platform `--plt-*` tokens so all 500+ legacy TSX usages remain stable and theme-reactive. Prune 50+ verified dead utility classes from `globals.css`. Convert internal hardcoded color literals (`#000`, `#fff`, `rgba(255,255,255,...)`) inside rules to semantic variables, and define the `html[data-theme="light"], html.light` variable overrides block.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS v4 (`@theme inline`), CSS Custom Properties, TypeScript, Vitest.

**Spec:** User request: "confirm that src/app/globals.css is the one source of truth for all css code so that we could plan how to implement dark/light modes... ensure that it is MECE so that we dont have a class that is just used once or very few times for no reason while we have another class that is exactly the same... we must do it carefully".

## Global Constraints

- **Single Source of Truth:** `src/app/globals.css` is the sole global styling stylesheet; do not introduce separate CSS files or split token definitions.
- **Pure Black Dark Mode:** Main widgets, sheets, and section panels in dark mode must strictly use pitch black (`#000000` / `--plt-bg-base`), never dark grays (`#18181b`, `zinc-900`) per `AGENTS.md`.
- **Brand Typography:** Preserve `.ticknal-wordmark` and `.font-euclid` (mandated by `AGENTS.md`). No `font-mono` anywhere.
- **No Scratch Files:** All audits and scratch scripts must remain in `_technical_support/` subfolders only.
- **Strict Verification:** Every task must verify `npx tsc --noEmit` and `npm run build` with exit code 0.

## Review Focus

1. **Legacy token breakage:** Replacing `--surface-*`, `--border-*`, and `--text-*` with aliases must not change the computed color in dark mode for any existing component.
2. **False dead-class removal:** Any class that is dynamically referenced or mandated by `AGENTS.md` (e.g., `.ticknal-wordmark`, `.rtl-mirror`) must not be deleted.
3. **Contrast regressions in light mode:** Light mode tokens must provide sufficient contrast (`--plt-text-primary: #09090b` on `#ffffff`, `--plt-border: #e4e4e7`).
4. **Tailwind v4 `@theme inline` compatibility:** Variable aliases in `:root` must cleanly pass through Tailwind v4 theme utility compilation.
5. **Strategy Studio & Leaflet rendering:** Hardcoded color replacements inside Canvas/Dock and Leaflet must look identical in dark mode.

---

### Task 1: Legacy Variable Aliasing & Token Harmonization

**Files:**
- Modify: `src/app/globals.css:430-466` and `src/app/globals.css:602-631`

**Interfaces:**
- Consumes: `--plt-bg-base`, `--plt-bg-surface-elevated`, `--plt-bg-raised`, `--plt-bg-active`, `--plt-bg-hover`, `--plt-border`, `--plt-border-soft`, `--plt-border-strong`, `--plt-text-primary`, `--plt-text-secondary`, `--plt-text-muted`, `--plt-text-faint`.
- Produces: Seamless CSS variable aliases for `--surface-base`, `--surface-input`, `--surface-raised`, `--surface-active`, `--surface-hover-subtle`, `--surface-hover-raised`, `--border-default`, `--border-subtle`, `--border-hover`, `--border-input-hover`, `--text-primary`, `--text-muted`, `--text-secondary`, `--text-faint`.

- [ ] **Step 1: Update `:root` to alias legacy tokens to `--plt-*` tokens**

In `src/app/globals.css` around lines 430-466, replace the raw hardcoded hex definitions of the legacy home page tokens with direct `var(--plt-*)` aliases:
```css
  /* Surfaces */
  --surface-base: var(--plt-bg-base);
  --surface-input: var(--plt-bg-surface-elevated);
  --surface-raised: var(--plt-bg-raised);
  --surface-active: var(--plt-bg-active);
  --surface-hover-subtle: var(--plt-bg-hover);
  --surface-hover-raised: var(--plt-bg-active);

  /* Borders */
  --border-default: var(--plt-border);
  --border-subtle: var(--plt-border-soft);
  --border-hover: var(--plt-border-strong);
  --border-input-hover: var(--plt-border);

  /* Text Colors */
  --text-primary: var(--plt-text-primary);
  --text-muted: var(--plt-text-muted);
  --text-secondary: var(--plt-text-secondary);
  --text-faint: var(--plt-text-faint);
```

- [ ] **Step 2: Verify Tailwind `@theme inline` mapping**

Ensure lines 602-619 in `src/app/globals.css` correctly reference these aliased variables:
```css
  --color-surface-base: var(--surface-base);
  --color-surface-input: var(--surface-input);
  --color-surface-raised: var(--surface-raised);
  --color-surface-active: var(--surface-active);
  --color-surface-hover-subtle: var(--surface-hover-subtle);
  --color-surface-hover-raised: var(--surface-hover-raised);

  --color-border-default: var(--border-default);
  --color-border-subtle: var(--border-subtle);
  --color-border-hover: var(--border-hover);
  --color-border-input-hover: var(--border-input-hover);

  --color-text-primary: var(--text-primary);
  --color-text-muted: var(--text-muted);
  --color-text-secondary: var(--text-secondary);
  --color-text-faint: var(--text-faint);
```

- [ ] **Step 3: Run TypeScript & Build verification**

Run: `cmd /c npx tsc --noEmit`
Expected: Exits with code 0.
Run: `cmd /c npm run build`
Expected: Next.js production build succeeds with exit code 0.

---

### Task 2: Pruning Verified Dead / 0-Usage CSS Classes in `globals.css`

**Files:**
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: Verified audit results from `_technical_support/css_mece_audit/audit_summary.json`.
- Produces: Cleaned, MECE Layer 4 utility classes with zero orphaned/unused code.

- [ ] **Step 1: Prune verified dead surface & container classes**

Remove the following dead classes from `src/app/globals.css` that have 0 occurrences across `src/`:
- `.page-content-wide`
- `.dashboard-widget-height`
- `.card-shell`, `.card-widget`, `.card-widget-compact`, `.card-widget-hover`
- `.command-surface-page` (and nested `.command-surface-page .card-*` rules)
- `.surface-flush`, `.surface-popover`
- `.hovercard-surface` (keep `.hover-card` which is actively used)

- [ ] **Step 2: Prune verified dead typography & layout classes**

Remove the following dead classes from `src/app/globals.css`:
- `.page-title`, `.page-subtitle`, `.widget-subtitle`, `.kpi-title`
- `.widget-grid`, `.widget-stack`, `.widget-row-gap`, `.kpi-grid-2`, `.insights-grid`

- [ ] **Step 3: Prune verified dead table, button, and badge classes**

Remove:
- `.tv-filmstrip-track`
- `.filter-reset-btn`
- `.tv-holdings-table` (and nested thead/th/td rules)
- `.btn-lg`, `.btn-icon`, `.btn-icon-compact`
- `.badge-active`, `.allocation-bar-fill`
- `.portfolio-table-min`, `.opportunity-table-min`, `.account-summary-table-min`, `.trade-drawer-width`, `.heatmap-workspace`, `.heatmap-pane`, `.heatmap-inspector-width`, `.table-layout-account-summary`, `.table-layout-portfolio`, `.table-layout-opportunity`

- [ ] **Step 4: Prune dead strategy decision, holding cells, nav flyouts, and misc helpers**

Remove:
- `.strategy-decision-cell*`
- `.holding-position-cell*`
- `.operations-feedback-success`, `.operations-feedback-error`, `.portfolio-ticker-name`
- `.nav-flyout*`, `.tab-button*`
- `.max-h-drawer-mobile`, `.safe-area-bottom`, `.safe-area-top`, `.will-change-nav`, `.modal-search-offset`, `.animate-gradient-flow`, `.tv-attr-logo`, `.rtl-flip-x` (keep `.rtl-mirror`)

- [ ] **Step 5: Run TypeScript & Build verification**

Run: `cmd /c npx tsc --noEmit`
Expected: Exits with code 0.
Run: `cmd /c npm run build`
Expected: Next.js production build succeeds with exit code 0.

---

### Task 3: Refactoring Hardcoded Color Literals Inside `globals.css` to Semantic Tokens

**Files:**
- Modify: `src/app/globals.css` (Layer 4 & Layer 5 rules)

**Interfaces:**
- Consumes: Platform tokens (`--plt-bg-base`, `--plt-bg-elevated`, `--plt-border`, `--plt-border-soft`, `--plt-text-primary`, `--plt-text-muted`, `--plt-bg-hover`).
- Produces: Pure token-driven CSS rules with zero hardcoded theme-dependent hex/rgba values.

- [ ] **Step 1: Replace hardcoded colors in Strategy Studio and Flow Canvas**

In `src/app/globals.css`:
- Update `.strategy-flow-canvas`, `.strategy-flow-card`, `.strategy-studio-dock`, `.strategy-library-panel`, `.strategy-library-search`, `.strategy-flow-picker`, and `.strategy-analytics-kpi`:
  - Replace `background: #000;` or `background: rgba(0,0,0,...)` with `background: var(--plt-bg-base);` or `var(--plt-bg-elevated);`.
  - Replace `color: #fff;` with `color: var(--plt-text-primary);`.
  - Replace `border: 1px solid rgba(255,255,255,.13)` with `border: 1px solid var(--plt-border);`.
  - Replace hover backgrounds `rgba(255,255,255,.07)` with `var(--plt-bg-hover);`.

- [ ] **Step 2: Replace hardcoded colors in Leaflet Map and Drawer overrides**

In `src/app/globals.css`:
- Update Leaflet popup and container rules: replace `#121214` and `#000000` with `var(--plt-bg-elevated)` and `var(--plt-bg-base)`.
- Replace white hairline border literals with `var(--plt-border-soft)`.

- [ ] **Step 3: Run TypeScript & Build verification**

Run: `cmd /c npx tsc --noEmit`
Expected: Exits with code 0.
Run: `cmd /c npm run build`
Expected: Next.js production build succeeds with exit code 0.

---

### Task 4: Define Clean Light Mode Theme Token Foundation

**Files:**
- Modify: `src/app/globals.css` (Layer 1)

**Interfaces:**
- Consumes: Platform CSS tokens.
- Produces: `html[data-theme="light"], html.light` variable override block.

- [ ] **Step 1: Add `html[data-theme="light"], html.light` block to `globals.css`**

Add the scoped light theme block immediately after `:root`:
```css
html[data-theme="light"],
html.light {
  color-scheme: light;

  /* Shadcn / Sonner light overrides */
  --background: #ffffff;
  --foreground: #09090b;
  --border: rgba(0, 0, 0, 0.1);
  --muted: rgba(0, 0, 0, 0.05);
  --muted-foreground: rgba(0, 0, 0, 0.6);
  --primary: #09090b;
  --primary-foreground: #ffffff;

  /* Semantic Platform Colors (Light Mode) */
  --plt-bg-base: #ffffff;
  --plt-bg-raised: #f7f7f8;
  --plt-bg-surface: transparent;
  --plt-bg-surface-elevated: #f0f0f2;
  --plt-bg-hovercard: #f4f4f5;
  --plt-bg-muted: transparent;
  --plt-bg-brand: #ffffff;
  --plt-bg-hover: rgba(0, 0, 0, 0.04);
  --plt-bg-active: rgba(0, 0, 0, 0.07);
  --plt-bg-chart: #ffffff;
  --plt-bg-console: #f4f4f5;
  --plt-bg-overlay: rgba(0, 0, 0, 0.5);

  --plt-text-primary: #09090b;
  --plt-text-secondary: #52525b;
  --plt-text-muted: #71717a;
  --plt-text-faint: #a1a1aa;
  --plt-text-inverse: #ffffff;

  --plt-border-subtle: transparent;
  --plt-border: #e4e4e7;
  --plt-border-soft: #f4f4f5;
  --plt-border-strong: #d4d4d8;
  --plt-border-active: rgba(0, 0, 0, 0.25);

  --surface-card: rgba(0, 0, 0, 0.02);

  --plt-accent: #09090b;
  --plt-accent-hover: #18181b;
  --plt-accent-pressed: #27272a;
  --plt-accent-soft: rgba(0, 0, 0, 0.06);
  --plt-accent-softer: rgba(0, 0, 0, 0.03);
  --plt-accent-border: rgba(0, 0, 0, 0.12);

  /* Button Color Tokens (Light Mode) */
  --btn-primary-bg: #09090b;
  --btn-primary-text: #ffffff;
  --btn-primary-border: #09090b;
  --btn-primary-hover-bg: #18181b;
  --btn-secondary-bg: #f4f4f5;
  --btn-secondary-text: #09090b;
  --btn-secondary-border: #e4e4e7;
  --btn-secondary-hover-bg: #e4e4e7;
  --btn-secondary-hover-text: #000000;
  --btn-secondary-hover-border: #d4d4d8;
}
```

- [ ] **Step 2: Run Full Test Suite and Production Build**

Run: `cmd /c npx tsc --noEmit`
Expected: Exits with code 0.
Run: `cmd /c npm test`
Expected: 351 tests pass cleanly.
Run: `cmd /c npm run build`
Expected: Next.js production build succeeds with exit code 0.
