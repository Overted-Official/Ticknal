# Responsive Layouts, Drawers, and Overlays

## Breakpoint model

Ticknal is mobile-first:

- base: phone;
- `sm` (640px): more generous type/padding and two-column compact grids;
- `md` (768px): desktop-style side drawers and two-column list layouts;
- `lg` (1024px): full analytical workspace splits, desktop KPI grids;
- `xl`: wider inspector rail and marketing refinements.

Use global mobile token overrides in `globals.css` instead of repeating page-specific reductions.

## Responsive transformation rules

Do not merely shrink desktop. Change the interaction model:

| Desktop | Mobile |
|---|---|
| KPI grid | horizontal snap rail |
| side inspector | bottom drawer |
| multi-column list | tabs or one-column list |
| full filter row | stacked/horizontal-scroll compact controls |
| full nav labels | short labels |
| hover detail | tap/select detail |
| 3-column marketing cards | ~85vw snap cards + dots |

Preserve information priority; secondary metadata may collapse, but the name, current value, direction, and primary action remain.

## Page sizing

Use:

- `.app-page` for platform horizontal padding and width;
- `.page-content-wide` only for intentionally broad analytical content;
- `.page-sections-stack` for section rhythm;
- bottom padding around 112px on mobile and 80px on desktop where bottom navigation overlaps content.

Avoid fixed viewport widths. All flex/grid children that can shrink need `min-w-0`. Use `max-w-full` and `overflow-x-hidden` at the page shell, not random clipping on content.

## Scroll ownership

Authenticated pages use `.command-surface-page` as the vertical scroll container.

- Sticky navigation observes and scrolls this element.
- Section anchors use `scroll-mt-16`.
- Nested tables/lists use bounded `overflow-y-auto custom-scrollbar`.
- Horizontal rails use `overflow-x-auto no-scrollbar` and snap where appropriate.
- Do not create nested full-page vertical scrollers.

## Mobile data rails

For KPIs/cards:

- `display: flex`;
- fixed readable card width;
- `shrink-0`;
- `snap-x snap-mandatory`;
- `snap-start` cards;
- 8–10px gap;
- 4px bottom breathing room;
- convert to grid at `lg`.

Do not hide the next card completely; a partial card can signal horizontal continuation.

## Drawer decision

Use a drawer when the user needs focused detail or a form without losing page context:

- ticker/position detail;
- sector/constituent inspector on mobile;
- quick-add/edit workflows;
- dense configuration that exceeds a popover.

Use a modal for a short confirmation or blocking decision. Use a popover for compact transient context. Do not use a drawer for a two-option menu.

## Shared drawer architecture

Prefer:

~~~tsx
<div className="drawer-overlay" role="dialog" aria-modal="true">
  <button className="drawer-backdrop" aria-label="Close" />
  <div className="drawer-sheet drawer-sheet-viewport-safe">
    <header className="drawer-header">...</header>
    <div className="drawer-body custom-scrollbar">...</div>
    <footer className="drawer-footer">...</footer>
  </div>
</div>
~~~

Forms use `.drawer-sheet-form`. Standalone/mobile inspectors that cannot use the full sheet class must opt into `.drawer-gradient-top` and otherwise match the system.

### Visual contract

- portal to `document.body`;
- fixed overlay around `z-index: 90`;
- backdrop black/75–80 with 4px blur;
- sheet pure black;
- square edges, `rounded-none`;
- 2px cyan → blue → magenta top accent;
- hairline top/side border;
- strong black shadow;
- header and footer remain fixed;
- body is the only vertical scroller.

### Mobile

- bottom sheet;
- 88–92vh maximum depending on detail/form;
- full width;
- top border;
- visible drag pill;
- spring enters/exits vertically;
- optional downward drag to dismiss;
- bottom actions clear the native home indicator;
- use dynamic viewport and safe-area tokens.

### Desktop

- right side sheet in LTR;
- full safe viewport height;
- general detail drawer: 50% width;
- form drawer: max 28rem;
- left border;
- no drag pill;
- spring enters/exits horizontally.

In RTL, the sheet anchors left and mirrors the border. Do not manually duplicate layouts; rely on the global RTL rules.

### Behavior

- Close on backdrop and Escape unless the workflow has unsaved/destructive constraints.
- Return focus to the trigger.
- Focus should stay within the modal drawer.
- Lock background scroll.
- Nested sub-modal state must not accidentally close the parent.
- Header close button remains reachable.
- Use `aria-labelledby`/`aria-describedby` where possible.

## Safe areas

Use:

- `--ticknal-safe-area-top/right/bottom/left`;
- `.safe-area-top` / `.safe-area-bottom`;
- `.drawer-sheet-viewport-safe` or `.drawer-sheet-viewport-safe-fixed`.

Do not hard-code iPhone inset pixels. Action bars need padding above the home indicator; full-height desktop/native sheets must stop beneath system bars.

## Modal geometry

Modals and main sheets use black surfaces and square outer geometry. Inner controls/cards may retain their own control radius. Confirmations should:

- constrain width;
- keep title and consequences visible;
- stack buttons on very narrow screens when necessary;
- preserve 40px control height;
- avoid a decorative gray modal card.

## Sticky and fixed UI

Reserve z-index tiers:

- content;
- sticky table headers;
- sticky/floating nav;
- mobile quick actions;
- drawers/modals;
- lock/critical overlay.

Use global z-index tokens/classes. Fixed mobile quick actions must not cover drawer footers or last-page content.
