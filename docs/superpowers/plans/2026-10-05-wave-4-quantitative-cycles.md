# Wave 4 Quantitative and Cycles Plan

**Goal:** Implement all 38 Quantitative and 24 Cycle definitions and expose every definition whose authentic inputs are available.

**Architecture:** Every indicator owns a dedicated `<category>/<indicator-id>/logic.ts`; category `definitions.ts` files contain metadata and registration only. Reusable rolling statistics, regression, entropy, digital-filter, spectral, and regime primitives stay dependency-free and timestamp-aligned in explicit shared modules. Benchmark-dependent definitions use an availability barrier until the chart executor can supply a second authenticated series.

## Tasks

- [x] Implement and type-check 38 Quantitative formula definitions in dedicated logic modules; data-gate only benchmark-series requirements.
- [x] Add a permanent architecture test that rejects missing per-indicator logic files and inline category formula bodies.
- [ ] Implement and verify 24 Cycle formula definitions, including spectral/filter outputs and calendar-aware seasonality.
- [ ] Add bilingual presentation entries and program identities.
- [ ] Verify cumulative registry/browser counts, build, runtime, and protected-strategy boundary.
