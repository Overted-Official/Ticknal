# Wave 3 Market Structure, Price Action, and Volume/Flow Plan

**Goal:** Implement and expose the 90 Wave 3 backlog rows while preserving honest typed unavailability for inputs the repository does not possess.

**Architecture:** Single-series OHLCV/trades formulas reuse the Wave 2 aligned primitives and category factory. Confirmed structures and patterns emit boolean/category outputs with explicit confirmation delays. Volume profiles use deterministic rolling/full-frame price bins. Definitions that genuinely require fundamentals or order-book fields must declare a non-fabricated availability barrier until an authentic adapter exists.

## Tasks

- [ ] Add shared pivot, regression, profile, and pattern primitives with hand-calculated tests.
- [ ] Implement 32 Market Structure definitions, presentations, program identities, and coverage tests.
- [ ] Implement 20 Price Action definitions, presentations, program identities, and coverage tests.
- [ ] Implement 38 Volume/Flow formula definitions and presentations; gate unsupported fundamentals/order-book inputs without proxies disguised as observations.
- [ ] Run exact registry/browser coverage, package/support tests, type checks, build, endpoint/runtime/console checks, and protected-strategy diff.

## Release accounting

- Wave 2 baseline: 132 integrated.
- Wave 3 formula target: 90 definitions.
- Wave 3 integration target: 222 only if every required authentic adapter is operational; otherwise report the exact data-gated rows rather than inflating the count.
