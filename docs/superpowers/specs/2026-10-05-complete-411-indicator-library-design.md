# Complete 411-Indicator Library and Charts Integration Design

**Status:** Conversational architecture approved on 2026-10-05; pending written-spec review
**Extends:** `docs/superpowers/specs/2026-10-04-canonical-indicator-engine-design.md`

## 1. Purpose

Ticknal will complete the 411-item indicator program as a production library and expose every item appropriately from the Charts page. The library is the mathematical foundation for the later no-code strategy builder, scanner, backtester, alerts, and notifications.

This design closes the scope that the original canonical-engine design intentionally deferred: the complete delivery program, the Charts-page interaction model, generic visual rendering, and the authentic-data work required by the non-price indicators.

The work remains strictly limited to the indicator platform. The existing HYDRA, PSI, and PSI V2 strategies are protected and will not be edited, migrated, re-wired, or made dependent on the indicator engine.

## 2. Definition of completion

The goal is complete only when all 411 manifest entries satisfy every applicable condition below:

1. The formula and interpretation have an approved review record.
2. The canonical Ticknal-owned calculation is implemented and versioned.
3. Its advertised inputs come from authentic, licensed, operational data adapters.
4. Numerical, edge-case, no-look-ahead, and performance verification passes.
5. Chart, rule, scanner, backtest, and alert consumers use the same canonical result rather than reimplementing the formula.
6. English and Arabic user-facing names, descriptions, parameters, outputs, limitations, and availability messages are present.
7. The item is accessible from the Charts-page indicator browser and rendered in the placement appropriate to its output.
8. Its manifest state is `integrated`.

`registered`, `formula-review`, `implementation`, `data-gated`, and `verified` are intermediate states, not completion. A disabled entry backed by missing data is visible program progress but does not count toward the 411 completed items. An entry cannot be retired merely to reach the target; retirement would require a separate, explicit product decision.

## 3. Current baseline

The canonical program manifest contains exactly 411 entries in 14 categories:

| Category | Count |
|---|---:|
| Price and Return | 20 |
| Trend | 40 |
| Momentum | 40 |
| Volatility | 32 |
| Market Structure | 32 |
| Price Action | 20 |
| Volume and Flow | 38 |
| Quantitative | 38 |
| Cycles | 24 |
| Breadth | 25 |
| Relative and Intermarket | 20 |
| Risk and Portfolio | 36 |
| Egypt Intelligence | 36 |
| Ticknal Composites | 10 |
| **Total** | **411** |

The implemented baseline is:

- 20 Price and Return definitions implemented and numerically verified;
- 9 of those definitions available as canonical chart overlays;
- canonical adapters proven for chart, rule evaluation, scanning, and non-delivering alert evaluation;
- exact stored-frequency loading for daily, weekly, monthly, hourly, and 15-minute requests;
- 391 definitions still requiring formula implementation;
- generic pane, market-output, and metric-card rendering still to be built.

The full program therefore consists of integrating the existing 20 definitions completely and implementing and integrating the remaining 391.

## 4. Scope boundaries

### 4.1 Included

- canonical implementations for every manifest entry;
- formula research and review records;
- reusable numerical primitives and domain executors;
- missing authentic-data ingestion and adapters required by the manifest;
- generic Charts-page discovery, configuration, persistence, and rendering;
- chart, rule, scan, backtest, and alert parity contracts;
- bilingual explanatory metadata;
- release, observability, and completion auditing.

### 4.2 Excluded

- changes to `src/strategies/**` or `packages/quant-engine/src/strategies/**`;
- the drag-and-drop strategy-builder interface itself;
- notification-delivery product design;
- subscription tiers, billing, or entitlements;
- investment recommendations generated automatically from indicator states;
- silent replacement of unavailable data with estimates, zeroes, or another frequency.

The indicator metadata and execution contracts needed by the later strategy builder are included even though that builder's interface is not.

## 5. Architectural principles

### 5.1 One calculation, many consumers

Every formula lives in the canonical indicator engine. Charts, rules, scanners, backtests, and alerts select and adapt the same versioned result. A consumer may change presentation, filtering, or scheduling, but it may not maintain its own formula.

### 5.2 Ticknal owns the production formula

Original papers, exchange methodologies, and reputable references define the intended mathematics. Independent libraries such as `technicalindicators` may be used as comparison oracles, but no third-party package is the sole source of truth and no incompatible source code is copied.

### 5.3 Data capabilities are explicit

Each definition declares the fields, frequencies, universe, benchmark, point-in-time behavior, and minimum coverage it requires. Adapters advertise capabilities. An unmet capability returns a typed unavailable result with an exact reason; it never produces a plausible substitute.

### 5.4 Calculation and presentation stay separate

Definition modules return neutral typed outputs and visual hints. React and Lightweight Charts code interpret those hints. Indicator calculations do not import UI, database, network, or chart libraries.

### 5.5 The registry drives the product

The program manifest and canonical registry are the source of truth for identity, status, formula version, parameters, data needs, output schema, placement, consumer readiness, and bilingual copy. The Charts page does not maintain a second hard-coded indicator list.

## 6. Definition and presentation metadata

The existing canonical definition contract will be extended with declarative metadata sufficient for discovery and generic rendering:

- stable backlog ID, machine ID, formula version, and category;
- English and Arabic name, short explanation, long explanation, and limitations;
- supported asset classes, timeframes, and execution domains;
- parameter schema with type, default, range, step, enum labels, and dependency rules;
- output schema with key, type, unit, precision, bounds, and rule-compatible operations;
- warm-up, finality, confirmation delay, repaint behavior, and data-confidence rules;
- required data capabilities and minimum coverage;
- one or more visual descriptors;
- default visibility, color role, line style, histogram baseline, thresholds, and scale group;
- runtime placement and proprietary-formula exposure policy.

Visual descriptors are declarative. They can map an output to a price series, line, histogram, band, level, marker, state region, metric value, ranked table, or market summary. Parameters and visual metadata may evolve without moving mathematics into the UI.

## 7. Charts-page experience

### 7.1 Indicator browser

The current fixed popover becomes a registry-driven browser with:

- English and Arabic search across names, aliases, descriptions, and categories;
- easy-to-understand category groups matching the 14-category library;
- a compact description, required data, supported placement, and availability state for each item;
- filters for overlays, panes, market intelligence, portfolio/risk, and cards;
- an active-indicators section for editing parameters, hiding, removing, and restoring defaults;
- disabled entries that explain the exact missing source or unsupported context;
- formula-stage and internal implementation details hidden from ordinary users.

Adding an indicator opens a schema-driven parameter editor only when configuration is useful. Defaults allow immediate use. Active definitions are persisted by stable ID, formula version, parameters, output selection, timeframe, benchmark/universe identity, and placement settings.

### 7.2 Placement model

The authoritative manifest currently divides the 411 entries into these presentation classes:

| Placement | Count | Charts-page treatment |
|---|---:|---|
| Price overlay | 108 | Drawn on the main price chart and aligned to its time scale. |
| Synchronized pane | 200 | Drawn in one or more resizable panes below the price chart. |
| Pane or overlay | 1 | User-selectable placement, with a definition-provided default. |
| Market output | 52 | Shown in a market-context dock or drawer opened from Charts. |
| Metric card | 40 | Shown in a configurable metrics dock associated with the chart context. |
| Ticknal composite without a fixed legacy view | 10 | Placed by explicit output descriptors in the Ticknal Models group; never plotted arbitrarily. |
| **Total** | **411** | |

### 7.3 Main-chart overlays

Overlays share the chart time scale but may use the price scale, a definition-specific scale, bands, markers, or state regions. The renderer supports multiple outputs per definition, correct warm-up gaps, provisional states, sparse events, and user-controlled visibility. Removing an overlay disposes its chart series and subscriptions cleanly.

### 7.4 Synchronized panes

A generic pane host supports multiple simultaneous indicator panes. Each pane:

- synchronizes visible time range and crosshair with the main chart;
- can contain multiple compatible outputs from one definition;
- supports lines, histograms, bands, levels, markers, and state regions;
- owns its scale, legend, thresholds, loading, unavailable, and stale states;
- can be resized, collapsed, reordered, or removed;
- retains stable state across symbol and timeframe changes where the definition remains supported.

The host shares input loading and canonical results where possible. It does not evaluate all 411 items merely because the browser is open.

### 7.5 Market and card surfaces

Cross-sectional, macro, breadth, flow, and portfolio results are not forced into price-series shapes. The Charts page exposes two contextual surfaces:

- **Market Intelligence:** ranked tables, distributions, breadth states, flows, comparative market outputs, and coverage information;
- **Metrics:** compact scalar or small-structure cards for risk, return, valuation, liquidity, and state summaries.

Both surfaces inherit the selected symbol, universe, benchmark, portfolio, date, and timeframe when applicable. An output states clearly when the current context does not apply.

### 7.6 Visual rules

All new Charts-page surfaces follow the repository's Ticknal design rules: transparent or pure-black main surfaces, pure-black square-edged drawers, hairline neutral borders, sans-serif typography, and no navy or elevated gray panel backgrounds. Numeric alignment uses `tabular-nums`, never a monospace font.

## 8. Execution domains

The time-series executor remains the foundation, but the 411 definitions require additional explicit domains:

1. **Single-series:** one instrument's OHLCV and optional trade fields.
2. **Pair or benchmark:** aligned target and comparison series with declared calendars and currency treatment.
3. **Universe or breadth:** point-in-time constituents, per-member series, coverage, and eligibility.
4. **Portfolio and trade:** holdings, cash flows, benchmark, risk-free rate, valuation times, and transaction context.
5. **Macro and Egypt intelligence:** releases, revisions, effective dates, investor flows, indices, sectors, rates, inflation, FX, and commodities.
6. **Order-book and transaction statistics:** authenticated depth, trades, aggressor or exchange-provided classifications, and coverage.
7. **Fundamental:** point-in-time company facts with period, publication date, revision, currency, and consolidation basis.
8. **Composite:** a versioned dependency graph over other canonical outputs.

Each domain has a small request contract and executor. Definitions cannot inspect application database models directly. Cross-domain composites declare dependencies so the orchestrator can load, align, cache, and audit inputs consistently.

## 9. Authentic-data program

The 2026-10-05 repository audit found substantial daily price, macro, money-supply, and investor-flow history, but no populated intraday-candle or EGX trade-statistic rows and no general order-book or fundamentals pipeline. Benchmark candidates such as EGX30, EGX70, and EGX100 exist. Breadth can be derived from instrument history, but point-in-time membership must be added to eliminate survivorship leakage.

The data work is part of completing the indicators, not a separate optional project. A source becomes production-ready only after all of the following exist:

- source ownership and licensing approval;
- canonical schema, units, identifiers, and exchange-calendar behavior;
- idempotent ingestion and revision handling;
- historical backfill and an incremental freshness process;
- point-in-time availability timestamps where releases can be revised;
- quality checks for gaps, duplicates, ordering, impossible values, and coverage;
- capability reporting and user-visible failure semantics;
- development and staging fixtures with recorded provenance;
- operational monitoring and recovery guidance.

Required source tracks are:

| Track | Current position | Completion requirement |
|---|---|---|
| Daily/weekly/monthly prices | Large authentic history exists | Preserve adjustments, calendars, revisions, and exact aggregation semantics. |
| Intraday prices | Schema exists; audited row count is zero | Connect and backfill licensed 15-minute and hourly data or derive coarser bars only from authentic finer bars. |
| Volume and verified trade statistics | Price volume exists; audited trade-stat rows are zero | Ingest every advertised transaction field and expose field-level coverage. |
| Historical index/universe membership | Incomplete for point-in-time breadth | Store effective-dated membership and eligibility history. |
| Benchmarks and intermarket assets | EGX benchmark candidates exist | Formalize identities, calendars, currency conversion, and alignment. |
| Order book | No general operational feed/schema | Add licensed depth ingestion, snapshots/events, and coverage contracts. |
| Fundamentals | No general point-in-time pipeline | Add publication-aware facts, periods, revisions, and currency/consolidation metadata. |
| Macro and Egypt intelligence | Partial operational history exists | Close missing series, preserve release/revision timing, and document sources. |
| Portfolios, trades, and cash flows | Application context varies | Provide tenant-safe point-in-time adapters without exposing user data to shared caches. |

Missing sources are implemented before dependent definitions can reach `integrated`. Where a licensed source is not yet available, the entry remains truthfully data-gated and the program remains incomplete rather than fabricating an answer.

## 10. Formula governance and verification

### 10.1 Formula review

Every definition receives a review record resolving equations, initialization, smoothing, statistical conventions, zero denominators, missing observations, gaps, suspended sessions, corporate actions, warm-up, first valid index, parameters, bounds, finality, confirmation delay, repainting, outputs, units, tolerances, and authoritative references.

Research-stage or proprietary entries also define their interpretation, input normalization, weighting, failure behavior, and whether formula details may be sent to the client.

### 10.2 Test requirements

Applicable tests include:

- exact hand-calculated vectors for primitives;
- primary-reference or independently generated vectors;
- comparison against a second implementation where available;
- authentic-data regression fixtures with provenance;
- constant, short, gapped, zero-range, zero-volume, missing-field, and extreme-value cases;
- parameter boundaries and invalid parameters;
- mathematical properties such as bounds, scale invariance, symmetry, or monotonicity where valid;
- prefix-stability and no-look-ahead checks;
- pivot, pattern, release-time, and confirmation-delay checks;
- dependency-graph, formula-version, and cache-identity checks;
- cross-consumer equality;
- representative single-chart and whole-EGX performance benchmarks.

Numeric tolerances are definition-specific. Integer, boolean, categorical, event, and timestamp outputs use exact equality.

### 10.3 Performance

Only active definitions are evaluated for a chart. The orchestrator shares immutable inputs, aligned series, primitives, and dependency results where equivalence is preserved. Straightforward reference algorithms remain available in tests for optimized recurrences. Any algorithm above linear or `n log n` complexity requires documented justification and a measured dataset limit.

Each delivery wave establishes and passes budgets for its representative active chart set, a 6,000-bar instrument history, a whole-EGX scan, and its largest market or portfolio computation. A release cannot rely on an unbounded browser calculation.

## 11. Consumer parity

The canonical result envelope carries definition ID, formula version, parameters, input identities and revisions, requested and effective timeframe, output values, first-valid information, finality, coverage, diagnostics, and calculation identity.

- **Charts** render the result without changing values.
- **Rules** expose only operations valid for each output type and unit.
- **Scanners** batch the same executor and report coverage and eligibility.
- **Backtests** pin formula versions and point-in-time data, membership, releases, and confirmation delays.
- **Alerts** evaluate saved canonical rules and store the exact calculation identity; delivery does not recompute the formula.

Contract tests evaluate identical requests through every adapter and require equal canonical outputs and compatible diagnostics.

## 12. Delivery program

Implementation proceeds through seven independently reviewable waves. A wave may release its completed items progressively, but the program goal is not declared complete until the final 411 audit passes.

### Wave 1: Generic Charts infrastructure and Price/Return integration

- replace the hard-coded canonical chart-indicator union with registry-driven discovery;
- add visual descriptors and the parameter-schema renderer;
- build generic overlay, synchronized pane, market-output, and metric-card hosts;
- add active-indicator persistence and availability messaging;
- integrate all 20 already verified Price and Return definitions;
- preserve legacy indicator behavior until parity and cutover checks pass.

**Indicator result after wave:** 20 integrated, 391 remaining.

### Wave 2: Trend, Momentum, and Volatility

- implement and integrate all 40 Trend definitions;
- implement and integrate all 40 Momentum definitions;
- implement and integrate all 32 Volatility definitions;
- deliver reusable smoothing, rolling-statistic, band, oscillator, and threshold primitives.

**Wave count:** 112. **Cumulative:** 132.

### Wave 3: Market Structure, Price Action, and Volume/Flow

- implement and integrate all 32 Market Structure definitions;
- implement and integrate all 20 Price Action definitions;
- implement and integrate all 38 Volume and Flow definitions;
- prioritize confirmation-delay, repaint, gap, liquidity, trade-statistic, and order-book integrity.

**Wave count:** 90. **Cumulative:** 222.

### Wave 4: Quantitative and Cycles

- implement and integrate all 38 Quantitative definitions;
- implement and integrate all 24 Cycles definitions;
- add audited numerical methods and server-side placement where client exposure or runtime is unsuitable.

**Wave count:** 62. **Cumulative:** 284.

### Wave 5: Breadth, Relative/Intermarket, and Risk/Portfolio

- implement and integrate all 25 Breadth definitions;
- implement and integrate all 20 Relative and Intermarket definitions;
- implement and integrate all 36 Risk and Portfolio definitions;
- complete point-in-time membership, alignment, currency, cash-flow, benchmark, and coverage contracts.

**Wave count:** 81. **Cumulative:** 365.

### Wave 6: Egypt Intelligence and Ticknal Composites

- implement and integrate all 36 Egypt Intelligence definitions;
- implement and integrate all 10 Ticknal Composite definitions;
- complete licensed data, release/revision timing, proprietary execution, dependency graphs, and auditable component coverage.

**Wave count:** 46. **Cumulative:** 411.

### Wave 7: Authoritative completion audit

- prove exact one-to-one coverage between backlog, manifest, registry, formula records, tests, adapters, and Charts-page discovery;
- prove every entry is `integrated` and none is left in an intermediate or retired state;
- run full numerical, parity, performance, build, type, endpoint, runtime, console, and visual smoke checks;
- prove the protected strategy trees are unchanged;
- publish the final limitations and data-provenance record.

Each formula wave implements every delivery stage represented in its categories, including advanced and research entries. Data dependencies may reorder tasks within a wave but do not reduce the category count.

## 13. Per-wave release gates

A wave cannot be released until:

- its expected manifest count equals its implemented and integrated count;
- every formula record is approved and versioned;
- authentic input adapters pass freshness, revision, and quality checks;
- unit, property, reference, no-look-ahead, contract, integration, and relevant end-to-end tests pass;
- chart, rule, scanner, backtest, and alert parity passes for applicable definitions;
- the indicator browser exposes correct bilingual descriptions, parameters, placement, and unavailable states;
- representative performance budgets pass without unbounded client work;
- `npm run build` and `npx tsc --noEmit` exit successfully;
- affected endpoints have no unhandled exceptions or HTTP 500 responses;
- affected pages show no hydration mismatch, uncaught promise rejection, or browser-console error;
- changed-path inspection confirms no file in either protected strategy tree changed.

## 14. Final 411 acceptance audit

The final automated and manual audit must prove:

| Assertion | Required value |
|---|---:|
| Unique backlog IDs | 411 |
| Unique canonical machine IDs | 411 |
| Registered definitions | 411 |
| Approved formula records | 411 |
| Definitions with authentic operational inputs | 411 |
| Numerically verified definitions | 411 |
| Charts-page discoverable definitions | 411 |
| Manifest entries in `integrated` state | 411 |
| Entries in any other state | 0 |
| Protected strategy files changed | 0 |

The placement audit additionally requires exactly 108 overlays, 200 panes, 1 pane-or-overlay item, 52 market outputs, 40 cards, and 10 explicitly placed Ticknal composites, unless a later approved manifest correction changes both the authoritative backlog and this design.

Manual acceptance samples each category, each execution domain, each placement type, both languages, unavailable-source behavior, symbol/timeframe changes, persistence, multiple simultaneous panes, and mobile/desktop responsive behavior.

## 15. Migration and compatibility

Legacy chart calculations remain available during parity comparison. Cutover occurs definition by definition only after canonical output, warm-up, and visual behavior are reviewed. Intentional corrections are documented rather than hidden behind compatibility code. Duplicate application indicator implementations are removed only when no production import remains.

Saved indicator configurations persist stable definition IDs and formula versions. Breaking formula changes create a new semantic version and an explicit migration path; they do not silently alter historical backtests or alerts.

Existing strategies remain isolated even when they contain formulas with familiar names. Canonical indicators are independently implemented from formula authorities and cannot import, refactor, or replace strategy-local calculations.

## 16. Error handling and observability

Expected inability to calculate is represented by typed diagnostics such as insufficient history, unsupported asset, missing benchmark, missing field, unavailable frequency, stale source, low universe coverage, or permission restriction. Unexpected exceptions are failures and are monitored separately.

Operational records include definition and formula version, runtime, input size, cache outcome, source revision and freshness, result status, coverage, and diagnostic code. Portfolio-sensitive values never enter shared logs or cross-tenant caches.

The UI distinguishes loading, warming up, unavailable, stale, provisional, low-coverage, and failed states. It never renders missing numeric outputs as zero.

## 17. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Plausible but incorrect mathematics | Resolve conventions before coding and require independent vectors and explicit tolerances. |
| The browser becomes an unmanageable 411-item list | Registry-driven search, category grouping, placement filters, concise explanations, and active-item management. |
| Too many active panes degrade the page | Lazy evaluation, shared inputs, measured limits, disposal tests, and user-visible resource safeguards. |
| Missing licensed data blocks advanced entries | Treat data acquisition as a first-class delivery track and keep missing entries explicitly data-gated until authentic inputs operate. |
| Backtests leak future membership or revised releases | Effective-dated universes, release timestamps, revisions, prefix tests, and calculation identities. |
| Formula behavior diverges between product surfaces | One executor, pinned versions, and mandatory consumer-parity tests. |
| Third-party implementation quirks become product behavior | Ticknal-owned formulas with third-party code used only as a comparator. |
| Indicator work alters existing strategies | Read-only strategy boundary plus changed-path gates in every wave and the final audit. |
| Proprietary composites expose sensitive logic | Server-side execution and output-only client contracts when policy requires it. |
| Completing counts encourages weak or fabricated outputs | `integrated` requires approved mathematics, authentic data, tests, and consumer exposure; intermediate states never count. |

## 18. Approved decisions

This design records the approved direction:

- complete all 411 entries rather than limiting the program to common retail indicators;
- include required data pipelines in the program;
- use Ticknal-owned canonical implementations with external libraries only as references;
- use a generic Charts-page renderer for overlays, synchronized panes, market intelligence, cards, and composite outputs;
- release in category waves while preserving a single final 411 completion gate;
- keep HYDRA, PSI, and PSI V2 unchanged;
- defer the no-code builder interface while delivering the metadata and canonical outputs it will consume.

After this written design is approved, implementation planning will decompose the seven waves into executable, test-first plans. The first plan will cover Wave 1 only; later plans will reference this program design and the proven contracts from preceding waves.
