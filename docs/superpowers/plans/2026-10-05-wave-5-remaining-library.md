# Wave 5 Remaining Indicator Library Plan

**Goal:** Build the remaining 127 Breadth, Relative/Intermarket, Risk/Portfolio, Egypt, and Ticknal Composite definitions so every one of the 411 backlog entries has an auditable implementation module and Charts catalog identity.

**Architecture:** Every definition owns `<category>/<indicator-id>/logic.ts`. Category definition files contain metadata and registration only. Indicators whose authentic inputs do not exist in `TimeSeriesFrame` return typed `unavailable` diagnostics; they never fabricate breadth, benchmark, macro, order-book, trade-history, portfolio, or proprietary-strategy data.

## Tasks

- [x] Implement and verify all 36 Risk/Portfolio definitions; expose price-series metrics and gate external-input metrics.
- [x] Implement all 25 Breadth definitions with explicit cross-sectional-data availability barriers.
- [x] Implement all 20 Relative/Intermarket definitions with explicit multi-series availability barriers.
- [x] Implement all 36 Egypt definitions, exposing only frame-authentic data-quality metrics until macro/breadth adapters exist.
- [x] Implement all 10 Ticknal Composite definitions without importing or modifying protected strategy code.
- [x] Integrate all 411 identities into the Charts catalog, with unavailable computations surfaced honestly.
- [x] Run architecture, formula, registry, build, type, runtime, and protected-strategy verification.
