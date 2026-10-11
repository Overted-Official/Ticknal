# Controls, Interaction, and UI States

## Control selection

Choose by intent:

| Intent | Primitive |
|---|---|
| One choice among 2–7 compact options | `.seg-control` + `.seg-control-btn` |
| Page/section navigation | `.tab-button` or floating-nav tab pattern |
| Primary/secondary/destructive action | `.btn-token` + variant |
| Icon-only action | `.btn-icon` / `.btn-icon-compact` |
| Filter trigger | `.filter-control-btn` |
| Clear filters | `.filter-reset-btn` |
| Select/date/text field | `.select-token`, `.date-token`, `.input-token` |
| Boolean state | `.toggle-token` |
| Status/count | `.badge` variants, `.badge-count`, `.badge-symbol` |

Do not implement a new pill switcher with local gray hex colors. Use the global primitive.

## Segmented controls

`.seg-control` is the canonical timeframe/mode/hierarchy control:

- 36px control height;
- compact 12px label;
- consistent group radius;
- muted inactive text;
- visible active state;
- 150–240ms transition;
- `.seg-control-compact` for paired phone filters.

Rules:

- Use buttons with `type="button"`.
- Expose `aria-pressed` or tab semantics for the selection model.
- Keep labels short; use localized short labels on mobile if necessary.
- Do not wrap individual options unpredictably. Scroll the group or use a full-width grid.
- If two groups control different concepts, keep a visible gap and separate accessible labels.

## Buttons

Use `.btn-token` and size variants:

- `.btn-lg`: 48px, hero/auth/major CTA;
- default: 40px, forms/modal actions;
- `.btn-compact`: 36px, filters/toolbar actions;
- `.btn-micro`: 26px, dense table/chip actions.

Variants:

- `.btn-primary`: white surface, black text; one dominant action.
- `.btn-secondary`: secondary action; preserve contrast and do not use as a widget fill.
- `.btn-danger`: destructive intent only.

Buttons need default, hover, active, focus-visible, disabled, and loading states. Icon-only controls need an accessible name and a tooltip when the meaning is not universal.

## Links

- Navigation uses links, actions use buttons.
- Platform text links commonly use TradingView blue and become lighter on hover.
- Landing navbar anchors use neutral text until active.
- Footer/secondary links remain muted until hover.
- Do not underline every navigation link; do show underline or another non-color cue for inline prose links.

## Inputs and forms

Use global field primitives. Compact platform inputs are usually 32–40px high, 12–14px text, and a dark control-only surface.

Every field needs:

- persistent label;
- value/placeholder;
- unit/suffix when relevant;
- helper or validation text;
- hover and focus border;
- disabled state;
- localized date/number behavior.

Do not put placeholder text in place of a label. Keep financial units visible. Use `color-scheme: dark` for native date fields. Native select options must use black background and white text.

Form spacing follows a 16px field stack and 12px two-column gap. Collapse two-column form grids when labels or values become cramped.

## Badges and status

Use:

- `.badge-profit` for gains/success/inflow;
- `.badge-risk` for loss/error/outflow;
- `.badge-warning` for caution/concentration;
- `.badge-info` for informational state;
- `.badge-muted` for metadata;
- `.badge-symbol` for ticker symbols only.

Badges are compact supporting labels, never the only explanation of a critical state. Avoid all-caps prose; uppercase is appropriate for short symbol/status labels.

## Hover and selection

Interaction intensity:

1. Default: transparent/black.
2. Hover: 4% white fill or slightly stronger border.
3. Active/selected: 8–15% white/semantic soft fill.
4. Focus: global `--ring-focus`.
5. Disabled: lower opacity, no pointer, but readable label.

Do not make hover move dense rows. A 1px translate is acceptable on a standalone KPI/marketing object, not tables.

## Loading

Use the shared loading components/skeletons closest to the content shape.

- Page bootstrap: branded full-page loader only when the whole app is unavailable.
- Section fetch: `SectionLoadingState` centered within the section/workspace.
- List: skeleton rows matching final height.
- Chart: preserve chart height to avoid layout shift.
- Button: inline spinner, stable button width, disabled repeated action.

Keep prior valid data visible during background refresh where safe. A refresh icon may spin, but avoid blanking the section.

## Empty

Empty state explains what is absent and, when useful, what the user can do:

- small muted icon;
- concise 12–13px copy;
- optional relevant CTA/link;
- centered in the available content space;
- no alert-colored box for a normal empty result.

Differentiate “no data exists,” “filters returned zero,” and “not yet configured.”

## Error and stale data

- Keep unaffected sections usable.
- Show the error at the narrowest failing boundary.
- Use risk color for the error marker, not the whole panel.
- Provide retry when meaningful.
- If displaying cached/stale data, label its timestamp/state.
- Never silently replace a failed value with zero.

## Locked, guest, and premium states

Use a clear, honest locked treatment:

- retain enough surrounding structure to explain the feature;
- prevent interactive actions, not merely visually blur them;
- label the requirement;
- one conversion CTA;
- open the shared guest/pro modal instead of bespoke overlays.

Do not disguise unavailable data as a loading state.

## Destructive and financial actions

Actions that close positions, delete records, or commit transactions need:

- explicit verb and entity;
- amount/quantity/price summary;
- clear cancel path;
- disabled submit while invalid/loading;
- success/error feedback;
- no ambiguous icon-only confirmation.

Analytical buy/sell signals are visual information unless the feature explicitly performs an order. Make that boundary obvious in copy and button labels.
