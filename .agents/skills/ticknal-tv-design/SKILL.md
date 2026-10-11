---
name: ticknal-tv-design
description: Use when building, restyling, reviewing, or debugging any Ticknal web UI, including landing pages, authenticated pages, sections, widgets, charts, tables, controls, drawers, responsive layouts, Arabic/RTL behavior, loading states, and design-system primitives.
---

# Ticknal UI Library

This skill is the UI source of truth for Ticknal. It is derived from the production Landing, Home, and Markets pages and the shared design system in `src/app/globals.css`.

## Non-negotiable workflow

1. Read `src/app/globals.css` before changing UI. Reuse its semantic variables, Tailwind theme aliases, and component classes. Do not create a local color, spacing, typography, radius, or control convention when a global token/class already expresses it.
2. Classify the surface:
   - **Editorial landing**: cinematic marketing composition, wider spacing, controlled gradients, device mockups, and larger display type.
   - **Authenticated platform**: dense, quiet command interface on black, transparent sections, hairline separators, compact controls, and data-first hierarchy.
3. Keep the composition boundary: route `page.tsx` → centralized `*PageView.tsx` → page sections → focused widgets/rows/charts.
4. Reuse existing primitives before inventing another variant.
5. Verify mobile, desktop, keyboard, loading/empty/error, privacy, and Arabic/RTL states.

## Absolute rules

- Platform pages, main widgets, section panels, drawers, and modals use `bg-black`/`bg-plt-base` or `bg-transparent`; never gray or navy panel fills.
- Hovercards/popovers are the only `#3D3D3D` surface. Use `.surface-popover`/`.hover-card`.
- Drawers are pure black with `rounded-none`.
- Use `font-sans`; use `tabular-nums` for numeric alignment. Never use `font-mono`.
- Render the brand with `<TicknalBrand />`; the wordmark is lowercase `ticknal`, Euclid semibold, `-0.04em` tracking, and `leading-none`.
- Positive, negative, warning, and information colors communicate meaning, not decoration.
- New reusable visual decisions belong in `globals.css`, then components consume their class/token.

## Reference routing

- Read [architecture.md](references/architecture.md) for ownership, composition, data/state, and file boundaries.
- Read [foundations.md](references/foundations.md) for tokens, colors, type, spacing, geometry, and surfaces.
- Read [page-patterns.md](references/page-patterns.md) for Landing, Home, and Markets composition.
- Read [widgets-and-data-viz.md](references/widgets-and-data-viz.md) for KPIs, charts, tables, rows, heatmaps, and financial formatting.
- Read [controls-and-states.md](references/controls-and-states.md) for buttons, filters, tabs, inputs, interaction, loading, empty, error, and locked states.
- Read [responsive-and-overlays.md](references/responsive-and-overlays.md) for breakpoints, rails, sticky navigation, drawers, modals, and safe areas.
- Read [accessibility-and-localization.md](references/accessibility-and-localization.md) for semantics, focus, motion, privacy, Arabic, RTL, and bidirectional numbers.
- Read [component-inventory.md](references/component-inventory.md) to find the production reference component closest to the work.

When existing code conflicts with this library, prefer the global semantic system and these rules; treat old local hard-coded classes as migration debt, not precedent.
