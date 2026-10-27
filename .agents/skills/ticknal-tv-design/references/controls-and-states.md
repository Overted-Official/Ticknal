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

- 36px control height (`.seg-control-compact` is 28–32px);
- compact 12px label;
- rounded-lg or rounded-full group container with hairline border;
- muted inactive text (`text-plt-muted`), bright active text (`text-white`);
- active button background `bg-surface-active` or `bg-white/10`;
- 150–240ms transition.

### Production Timeframe Segmented Control (`PerformanceChartToolbar.tsx`)

~~~tsx
export function TimeframeToolbar({ timeframe, onTimeframeChange }: TimeframeToolbarProps) {
  const TIMEFRAMES = ['1M', '3M', '6M', '1Y', 'All'];

  return (
    <div className="flex items-center gap-1 select-none font-sans">
      <div className="seg-control">
        {TIMEFRAMES.map((tf) => {
          const isSelected = timeframe === tf;
          return (
            <button
              key={tf}
              type="button"
              onClick={() => onTimeframeChange(tf)}
              className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
            >
              {tf}
            </button>
          );
        })}
      </div>
    </div>
  );
}
~~~

## Sticky floating section navigation (`HomeFloatingNav.tsx`, `MarketsFloatingNav.tsx`)

Used on all multi-section platform pages to provide smooth in-page navigation:

~~~tsx
export function PageFloatingNav({ sections }: { sections: Array<{ id: string; label: string; shortLabel: string }> }) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id);

  // Target the inner scroll container (.command-surface-page)
  const scrollToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    const container = document.querySelector('.command-surface-page') as HTMLElement | null;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const elementRect = element.getBoundingClientRect();
      const targetScrollTop = container.scrollTop + (elementRect.top - containerRect.top) - 56;
      container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
    } else {
      const top = element.getBoundingClientRect().top + window.scrollY - 56;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }
  }, []);

  // 160px Top-Threshold Scroll Spy
  useEffect(() => {
    const handleScroll = () => {
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.getBoundingClientRect().top <= 160) {
          setActiveSection(sections[i].id);
          return;
        }
      }
      setActiveSection(sections[0]?.id);
    };

    const container = document.querySelector('.command-surface-page');
    if (container) container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
    handleScroll();
    return () => {
      if (container) container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [sections]);

  return (
    <nav className="sticky top-0 z-30 w-full py-2.5 sm:py-3 px-3 sm:px-6 pointer-events-none select-none font-sans flex items-center justify-center">
      <div className="relative pointer-events-auto rounded-full border border-plt-border bg-plt-base/90 backdrop-blur-xl p-1 sm:p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.8)] flex items-center justify-center max-w-[calc(100vw-24px)] sm:max-w-full">
        <div role="tablist" aria-orientation="horizontal" className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-full">
          {sections.map((sec) => {
            const isSelected = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                role="tab"
                tabIndex={isSelected ? 0 : -1}
                aria-selected={isSelected}
                type="button"
                onClick={() => scrollToSection(sec.id)}
                className={`relative inline-flex items-center justify-center px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-[13px] font-medium transition-all duration-150 cursor-pointer whitespace-nowrap outline-none ${
                  isSelected
                    ? 'bg-plt-active text-plt-text font-semibold shadow-xs'
                    : 'bg-transparent text-plt-muted hover:text-plt-text hover:bg-plt-hover'
                }`}
              >
                <span className="sm:hidden">{sec.shortLabel}</span>
                <span className="hidden sm:inline">{sec.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
~~~

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

## Loading and skeleton primitives

Ticknal uses 4 shared loading primitives:

### 1. Inline Spinner (`InlineSpinner.tsx`)
Used inside buttons, search bars, and breadcrumbs:
~~~tsx
<span className="inline-flex shrink-0" role="status" aria-label="Loading">
  <CometSpinner decorative className="h-4 w-4" />
  <span className="sr-only">Loading</span>
</span>
~~~

### 2. Section Loading State (`SectionLoadingState.tsx`)
Centered within lazily loaded analytical sections or workspaces:
~~~tsx
<div className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-xs text-text-muted" role="status" aria-live="polite">
  <CometSpinner decorative className="h-7 w-7" />
  <span>Loading section data...</span>
</div>
~~~

### 3. Skeleton Shimmer (`Skeleton.tsx`)
Designed strictly for pitch-black surfaces with `bg-plt-hover` and `animate-pulse`:
~~~tsx
export function Skeleton({ className, variant = 'rounded' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-plt-hover animate-pulse motion-reduce:animate-none',
        variant === 'circular' && 'rounded-full',
        variant === 'rounded' && 'rounded-md',
        variant === 'rectangular' && 'rounded-none',
        className
      )}
    />
  );
}
~~~

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
