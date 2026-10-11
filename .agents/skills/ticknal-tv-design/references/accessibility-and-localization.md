# Accessibility, Localization, Privacy, and Motion

## Semantic structure

- One primary page heading when the page exposes a visible title.
- Section titles follow heading order.
- Use `nav`/`role="tablist"` for navigation and tabs, not anonymous divs.
- Use real `button`, `a`, `table`, `input`, and `label` elements.
- Clickable rows need button/link semantics or complete keyboard handling.
- Charts and canvases need an accessible name and a text/table alternative for essential data.

## Keyboard and focus

`globals.css` applies `--ring-focus` to focus-visible links, buttons, inputs, selects, and textareas. Do not remove it without an equal or stronger replacement.

- Tab order follows visual order.
- Enter/Space activates row-style buttons.
- Escape closes dismissible overlays.
- Arrow keys are appropriate for true tablists/menus when implemented completely.
- Icon buttons always have `aria-label`.
- Disabled controls use the native `disabled` attribute.

Touch targets should be at least 36–40px for primary compact controls. A small icon can sit inside a larger hit area.

## Contrast and color

- White primary text on black.
- Muted gray remains readable; do not use faint text for essential values.
- State is never communicated by red/green alone. Include sign, arrow, word, regime, or icon.
- Avoid low-opacity colored text on transparent backgrounds when it drops below usable contrast.
- Focus must remain visible on every surface.

## Arabic and RTL

The global document direction and locale system handle the foundation:

- Arabic uses Cairo through `--font-sans-token`.
- Global Arabic rules remove letter spacing.
- Use logical layout utilities (`start/end`, RTL variants) instead of duplicating markup.
- Directional icons use `.rtl-mirror`/`.rtl-flip-x` when meaning should reverse.
- Desktop drawers automatically anchor left in RTL and mirror their border.
- Flex/grid order should express reading order; do not arbitrarily reverse data series.

### Bidirectional numeric content

Apply `tabular-nums`. Global RTL rules isolate numeric runs as LTR so signs, decimals, currency codes, and percentages remain stable.

Keep the unit adjacent to its value. Test:

- negative percentage;
- plus sign;
- decimal price;
- EGP and USD;
- date ranges;
- mixed Arabic company name + Latin ticker.

Do not use `font-mono` to fix numeric alignment.

### Copy length

Arabic labels may be wider than English. Controls must:

- allow short localized labels;
- avoid fixed text widths;
- truncate only non-critical metadata;
- expose full text through title/tooltip when truncation is necessary;
- wrap descriptive copy naturally.

## Privacy mode

All personal financial values must honor privacy mode:

- KPI values;
- table/list amounts;
- chart axes and tooltips;
- drawer totals;
- summary copy that embeds an amount.

Mask at the formatting boundary, not with a visual overlay that leaves accessible/raw text exposed. Market-wide public values do not require masking unless the product intentionally treats them as private.

## Motion

Global durations:

- fast: ~160ms;
- base: ~240ms;
- easing: `cubic-bezier(0.22, 1, 0.36, 1)`.

Use motion to explain state:

- control hover/selection;
- accordion reveal;
- drawer entry/exit;
- content fade when mode changes;
- long passive marquee on landing.

Avoid:

- animating dashboard numbers;
- chart redraw animation after every filter;
- looping decoration inside the command interface;
- layout motion that prevents comparison.

`prefers-reduced-motion: reduce` is globally respected. Essential meaning must remain without animation.

## Live updates

- Do not steal focus on refresh.
- Keep controls stable while data revalidates.
- Use `aria-live="polite"` only for concise, meaningful status changes.
- Do not announce every market tick.
- “Live” indicators need text or accessible labels, not only a pulsing dot.

## Images and icons

- Informative images have localized alt text.
- Decorative imagery uses empty alt and no pointer events.
- Ticker logos may fall back to a text symbol.
- Shared icons come from the project icon library and use consistent 14–18px sizing in dense UI.
- Stroke width is typically 1.8–2.

## Content selection and cursor

Dashboard shells often use `select-none` for app-like interaction, but preserve text selection in long explanations, tables intended for copying, support/legal text, and form fields. Use `cursor-pointer` only on actual interactive targets.

## Validation checklist

For every new or changed interface, verify:

1. keyboard-only path and focus visibility;
2. 320–390px phone layout;
3. 768px drawer/list transition;
4. 1024px analytical split;
5. Arabic direction and copy expansion;
6. mixed RTL numeric formatting;
7. reduced motion;
8. loading, zero-result, error, and stale state;
9. privacy mode;
10. touch and hover behavior;
11. no horizontal page overflow;
12. no drawer content beneath native safe areas.
