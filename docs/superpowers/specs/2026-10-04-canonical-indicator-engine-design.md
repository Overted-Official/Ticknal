# Canonical Indicator Engine Design

Date: 2026-10-04

Status: Approved architecture, pending written-spec review

Backlog: [`docs/product/indicator-library-backlog.md`](../../product/indicator-library-backlog.md)

## 1. Summary

Ticknal will implement the 411-entry indicator backlog as one canonical, deterministic quantitative engine rather than as separate chart, backtest, scanner, and alert implementations. The engine will be a pure TypeScript package under `@ticknal/quant-engine`. It will receive validated market data, perform no fetching or database access, and return typed results with provenance and diagnostics.

The system has four hard promises:

1. The same formula version and parameters produce the same result everywhere.
2. Production calculations use authentic data at its actual frequency. Missing inputs produce an explicit unavailable result; they are never fabricated or silently substituted.
3. Every indicator is an isolated, testable module registered through small category manifests. No 411-item monolith is permitted.
4. Every result explains what data and formula version produced it, when the inputs were current, and whether the latest value was final or provisional.

This document defines the program architecture for all 411 backlog entries. It deliberately does not implement indicators or finalize the visual strategy-builder interaction.

## 2. Goals and success criteria

### 2.1 Goals

- Establish `@ticknal/quant-engine` as the only production authority for indicator mathematics.
- Preserve all 411 stable backlog IDs through implementation, review, release, and future formula migrations.
- Support single-series indicators, multi-asset comparisons, breadth, portfolio analytics, Egypt market intelligence, and Ticknal composites without forcing unlike calculations into one oversized interface.
- Make every output usable by charts, no-code rules, backtests, scans, and notifications.
- Prevent look-ahead bias, accidental repainting, unit mismatches, adjusted/unadjusted price mixing, and time-frequency substitution.
- Allow data-gated indicators to be discoverable without publishing fake results.
- Make formula changes reproducible so future saved no-code rules can remain pinned to their original behavior.

### 2.2 Program-level success

The 411-entry program is complete only when every backlog entry is either:

- implemented, independently verified, integrated with every applicable consumer, and backed by an authentic production data source; or
- retired by an explicit product decision recorded against its stable backlog ID.

Registering an indicator as data-gated or unavailable is valid incremental progress, but it does not count as implementing that indicator and does not complete the program.

### 2.3 Indicator-level success

An individual indicator is complete only when it meets the backlog definition of done and the stricter acceptance gates in section 18. A line appearing on a chart is not sufficient.

## 3. Non-negotiable integrity rules

### 3.1 Authentic data only

Production inputs must come from Ticknal's authentic stored or streamed sources. Each input must retain source, effective frequency, observation time, retrieval time, finality, adjustment mode, and revision information where available.

The following are prohibited in production calculations:

- inventing volume, trades count, bid/ask, order-book depth, NAV, holdings, fundamentals, macro data, interest rates, inflation, FX, investor flow, breadth constituents, or benchmark values;
- replacing a requested intraday series with daily bars, or replacing one timeframe with another;
- treating a missing observation as zero unless zero is an authentic observed value and the field contract permits it;
- forward-filling across missing sessions or observations unless the indicator definition explicitly allows it and returns that transformation in its diagnostics;
- mixing adjusted and unadjusted prices within one calculation;
- relabeling delayed or provisional data as live or final.

If required data is absent, stale beyond the definition's policy, licensed for a different use, or at the wrong frequency, the engine returns `unavailable` with a machine-readable reason.

### 3.2 Fixtures are not production data

Tests may use immutable fixtures when they are:

- hand-calculated reference vectors;
- published formula examples with a recorded citation and license-compatible use; or
- frozen snapshots of authentic market data with source, capture date, frequency, adjustment mode, and anonymization/licensing notes.

Fixtures may never be reachable through production adapters or used as a runtime fallback. Random generated data may be used only for property testing and must not be described as market data or used to establish numerical correctness by itself.

### 3.3 One formula everywhere

New indicator consumers—charts, no-code rule backtests, screeners, alerts, and notifications—call the same definition and executor. Consumers may format, round, label, or render a result, but must not reproduce or alter its mathematics.

The three existing strategies—HYDRA, PSI, and PSI V2—are explicitly outside this program's write scope. Their files, imports, parameters, calculations, backtest engines, registries, stored optimized parameters, and runtime behavior remain untouched. Connecting or migrating any of them to the canonical engine requires a separate design and explicit user approval.

### 3.4 No hidden look-ahead

An output may use only information available as of that output's evaluation time. Confirmed pivots, fractals, centered filters, ZigZag-like structures, and other future-dependent calculations must declare their confirmation delay. Their events are emitted on the confirmation bar, with the original pivot time carried as metadata; they are never back-painted as a tradeable event on the earlier bar.

### 3.5 No silent numerical failure

NaN, positive or negative Infinity, divide-by-zero, invalid logarithms, singular matrices, insufficient history, and non-convergent models must not leak into public outputs. They yield null at an expected warm-up position or an explicit invalid/unavailable diagnostic, depending on cause.

## 4. Current-state problems this design resolves

The current repository is a useful starting point but cannot safely scale to 411 entries:

- indicator and strategy trees are mirrored between the application source tree and `packages/quant-engine`, creating drift risk; this program resolves the indicator side only;
- seven chart indicators are mirrored in the package, while Smart Money logic remains application-local;
- conventional calculations such as SMA, EMA, RSI, and MACD are not yet available as independent reusable definitions; existing strategy-local versions may be inspected for context but are not edited, moved, or imported by this work;
- chart-oriented APIs and rendering concerns are mixed with calculations;
- package inputs do not yet carry sufficient provenance, finality, frequency, or field-availability metadata;
- current hourly data paths may fall back to daily data, which violates timeframe correctness;
- there is no package-level numerical test runner or independent reference suite;
- a legacy third-party calculation package exists, but one dependency cannot be the sole mathematical authority;
- current notification evaluation covers only a limited daily-equity workflow and does not yet consume a canonical user-rule engine.

Migration must therefore establish the contracts and verification system before expanding breadth.

## 5. System boundaries

```text
authentic providers / Ticknal database
               |
               v
server-side data adapters and capability checks
               |
               v
validated domain request(s) + provenance
               |
               v
@ticknal/quant-engine
  validate -> resolve dependencies -> compute -> validate outputs
               |
               v
typed result envelope
               |
       +-------+---------+----------+----------+
       |                 |          |          |
     chart            scanner    backtest    alerts
```

### 5.1 Engine responsibilities

The engine owns:

- domain contracts and validation;
- reusable numerical and series primitives;
- formula definitions and versioning;
- dependency resolution for composite indicators;
- deterministic calculation;
- output validation;
- metadata and category registries;
- diagnostic codes;
- compatibility rules for assets, timeframes, and fields.

### 5.2 Engine exclusions

The engine must not import or depend on:

- Next.js, React, server actions, route handlers, or browser APIs;
- Drizzle, Supabase, database clients, or SQL;
- network fetching or provider SDKs;
- Lightweight Charts or any presentation library;
- notification delivery services;
- entitlement or billing logic;
- mutable application-global state;
- wall-clock time as an implicit calculation input.

Any current time needed for freshness evaluation is passed explicitly in the request context.

### 5.3 Application responsibilities

The application and server layer own:

- authentic data access;
- user authorization and entitlements;
- data-source licensing controls;
- conversion from persistence schemas into validated engine domains;
- caching and orchestration;
- chart rendering and localized explanations;
- rule persistence, scheduling, notification delivery, and audit history.

## 6. Package and module structure

The target structure is deliberately layered and category-based:

```text
packages/quant-engine/
  src/
    contracts/
      common/
      time-series/
      pair-series/
      cross-sectional/
      portfolio/
      macro-context/
      composite/
    core/
      numeric/
      series/
      rolling/
      alignment/
      statistics/
      linear-algebra/
    validation/
      inputs/
      outputs/
      parameters/
    execution/
      executors/
      dependencies/
      cache-identity/
    registry/
      category-registry.ts
      program-manifest.ts
      resolve-definition.ts
    indicators/
      price-return/
      trend/
      momentum/
      volatility/
      volume-flow/
      market-structure/
      cycles-signal-processing/
      statistical-quantitative/
      breadth-participation/
      relative-intermarket/
      risk-performance-portfolio/
      candlestick-price-action/
      egypt-market-intelligence/
      ticknal-composites/
    index.ts
  test/
    references/
    authentic-snapshots/
    contracts/
    integration/
```

Every indicator receives its own folder:

```text
indicators/momentum/relative-strength-index/
  definition.ts
  compute.ts
  README.md
  relative-strength-index.test.ts
```

Complex indicators may add small local helpers and focused test files. Shared mathematics moves to `core` only after it is used by multiple definitions and has an independent contract. Indicator folders may not import application code or another indicator's private implementation.

### 6.1 No monolithic registry

Each category publishes a small immutable manifest. The root registry composes category manifests and checks uniqueness at startup/build time. It does not contain 411 hand-maintained imports in one file. Registry generation, if introduced later, must be deterministic and committed or checked during CI; it may not depend on filesystem order at runtime.

### 6.2 Stable identity

Every definition carries:

- the stable backlog ID, such as `MOM-001`;
- a stable machine ID, such as `relative-strength-index`;
- a semantic formula version;
- a definition schema version.

Backlog IDs are never recycled. Renames preserve the stable machine ID through aliases or a controlled migration. A breaking mathematical change requires a new formula version; future saved no-code rules remain pinned until explicitly migrated.

## 7. Calculation domains

The backlog contains fundamentally different kinds of computations. They share a result envelope, but not a misleading single input shape.

### 7.1 Time-series domain

One ordered asset series, typically OHLC with optional authentic volume or trades. This covers most price, trend, momentum, volatility, flow, structure, cycle, statistical, and pattern indicators.

### 7.2 Pair or benchmark domain

Two or more explicitly aligned series with relationship roles, currency context, and benchmark identity. This covers relative strength, beta, correlation, spreads, and intermarket comparisons.

### 7.3 Cross-sectional domain

A point-in-time universe and its constituent histories, membership intervals, weights, suspensions, and coverage. This covers breadth and participation. Universe membership must be historical and survivorship-aware for backtests.

### 7.4 Portfolio and trade domain

Positions, cash flows, trades, benchmark, valuation times, and risk-free-rate inputs as required. Portfolio calculations must distinguish time-weighted returns, money-weighted returns, realized results, unrealized results, and benchmark-relative results.

### 7.5 Macro and Egypt-context domain

Named, dated macroeconomic, FX, rate, inflation, commodity, market-flow, and index observations with source-specific release or revision metadata. A source's publication timestamp and observation period are separate fields to prevent using future releases in historical evaluation.

### 7.6 Composite domain

Inputs are canonical indicator results referenced by stable ID, formula version, parameters, and output key. Composite definitions do not copy component formulas. They declare normalization, weighting, missing-component behavior, minimum coverage, and whether weights are fixed or trained.

### 7.7 Proprietary model domain

Proprietary Ticknal models use the same deterministic and versioned contracts. Model artifacts, coefficients, training windows, feature definitions, and calibration dates are explicit immutable inputs. A model result must not be recomputed from a newly trained artifact under an old formula version.

## 8. Core contracts

The names below are conceptual TypeScript contracts. Exact syntax belongs in the implementation plan and TDD cycle.

### 8.1 Market frame metadata

Every market frame includes:

- `instrumentId`, display symbol, exchange, and asset class;
- quote currency and, when applicable, base currency;
- requested timeframe and effective timeframe;
- source ID, source type, and source revision or batch identity;
- earliest and latest observation times;
- `asOf` time and `receivedAt` time;
- timezone, exchange calendar, and session definition;
- adjustment mode: raw, split-adjusted, total-return-adjusted, or another explicit mode;
- latest-bar finality and overall session completeness;
- field availability and observed/missing counts;
- licensing/use flags required by the adapter boundary.

### 8.2 Bar observations

Each bar includes:

- open time and close time;
- open, high, low, and close;
- optional volume and verified trade count;
- observed/missing markers for optional fields;
- final/provisional status;
- source revision when it can vary per observation.

Zero and missing are distinct. Numeric values are finite. A suspended session, a zero-volume traded session, and a session with unavailable volume must not collapse into one state.

### 8.3 Input validation

Before computation, the engine validates:

- strictly increasing, unique timestamps;
- exchange-calendar and timeframe consistency when calendar metadata is supplied;
- finite numeric values;
- `low <= open/close <= high` and `low <= high`;
- non-negative volume and trades where present;
- no required-field gaps;
- sufficient, correctly aligned histories;
- declared adjustment consistency;
- parameter compatibility with data length and frequency;
- no duplicate universe constituents or overlapping membership intervals;
- point-in-time release availability for macro inputs.

The engine rejects invalid data. Adapters may perform documented normalization before the boundary, but must record each transformation in provenance. Sorting, deduplication, aggregation, resampling, currency conversion, and corporate-action adjustment are not silent engine behavior.

### 8.4 Indicator definition

Each `IndicatorDefinition<Parameters, Inputs, Outputs>` declares:

- stable backlog ID, machine ID, names, category, and tags;
- formula version and definition schema version;
- calculation domain and executor kind;
- formula description and trusted references;
- required fields, related series, and source capabilities;
- supported assets and timeframes;
- minimum history and any dynamic warm-up rule;
- typed parameter schema, explicit defaults, valid ranges, increments, and cross-parameter validation;
- typed output schema, units, bounds, nullability, visual hints, and rule-builder capabilities;
- provisional/final behavior;
- repaint behavior and confirmation delay;
- numerical tolerance policy;
- dependency declarations for composites;
- limitations, warnings, and interpretation guidance.

Defaults are documented product choices, not hidden assumptions. A definition must never infer a benchmark, risk-free rate, exchange calendar, adjustment mode, or macro series when more than one valid choice exists.

### 8.5 Output types

An indicator may publish:

- numeric series;
- boolean event series;
- categorical state series;
- level or band series;
- sparse annotations tied to observation and confirmation times;
- scalar summary values;
- cross-sectional ranks or tables;
- structured component explanations.

Every output declares its unit and semantic range. Price, percent, decimal return, basis points, shares, EGP value, count, rank, probability-like score, and dimensionless index are distinct units. The engine calculates at full supported precision; presentation rounding happens only in consumers.

### 8.6 Result envelope

All executors return an `IndicatorResult` with:

- `status`: `ok`, `unavailable`, or `invalid`;
- stable definition identity and formula version;
- normalized parameters actually used;
- typed outputs aligned to their declared observation axes;
- null warm-up positions rather than shortened or shifted arrays;
- input provenance summaries and source revisions;
- effective `asOf`, calculation time supplied by the caller, and finality;
- coverage and freshness information;
- structured diagnostics with severity, code, message key, and relevant fields;
- dependency identities for composites.

Expected lack of history is not an exception. Programmer errors and violated internal invariants are exceptions and must be observable by the server layer. User-facing consumers receive safe structured errors without silently converting a failed result into a neutral value.

## 9. Data availability and diagnostic semantics

### 9.1 Capability negotiation

Before computation, adapters expose a capability record for the requested instrument, universe, or portfolio. It answers whether the exact fields, frequency, time range, adjustment mode, and related series required by a definition are available.

Definitions may be listed even when their current capability is unavailable. The UI can explain the missing input, but cannot invoke a substitute calculation.

### 9.2 Standard diagnostic families

Initial machine-readable families include:

- `DATA_FIELD_MISSING`
- `DATA_FREQUENCY_UNAVAILABLE`
- `DATA_STALE`
- `DATA_INCOMPLETE_SESSION`
- `DATA_SOURCE_REVISION_MISMATCH`
- `DATA_ALIGNMENT_FAILED`
- `DATA_UNIVERSE_HISTORY_MISSING`
- `DATA_RELEASE_TIME_MISSING`
- `INPUT_INVALID_OHLC`
- `INPUT_NON_FINITE`
- `INPUT_DUPLICATE_TIMESTAMP`
- `INPUT_ADJUSTMENT_MISMATCH`
- `PARAMETER_OUT_OF_RANGE`
- `HISTORY_INSUFFICIENT`
- `NUMERIC_DIVIDE_BY_ZERO`
- `NUMERIC_NON_CONVERGENCE`
- `DEPENDENCY_UNAVAILABLE`
- `DEPENDENCY_VERSION_MISMATCH`
- `OUTPUT_INVARIANT_FAILED`

Messages are localized outside the engine using stable codes and structured details.

### 9.3 Staleness and provisional bars

Freshness policy belongs to each definition or data product, not to an invisible global guess. A daily indicator can evaluate a provisional daily bar only when explicitly requested. The result and any rule event remain provisional and must not trigger a final-bar notification path.

A final-bar rule is evaluated only after the adapter verifies that the relevant market session is final. Egyptian holidays, shortened sessions, suspensions, and provider delays must be represented through the configured exchange calendar and source metadata.

## 10. Execution model

For every request, the appropriate domain executor performs:

1. resolve the exact definition and formula version;
2. validate and normalize parameters through the definition schema;
3. check capabilities and required inputs;
4. validate domain inputs and provenance;
5. resolve declared dependencies at their pinned versions;
6. execute the pure calculation;
7. validate output length, alignment, units, ranges, and finite values;
8. build the result envelope and diagnostics.

### 10.1 Determinism

Given identical validated inputs, parameters, definition version, dependency versions, and explicit execution context, results must be byte-equivalent after stable serialization. Calculations cannot read global time, locale, process environment, network state, or mutable caches.

### 10.2 Alignment

Time-series outputs preserve the input axis. Pair, breadth, and macro calculations use explicit alignment policies declared in the definition. Policies may include exact observation matching, session-close alignment, or point-in-time as-of joins. A policy is never selected implicitly.

### 10.3 Composite dependency graph

Composite dependencies form a directed acyclic graph. Registry validation rejects cycles, unknown output keys, and incompatible units. A composite may define explicit partial-coverage behavior; otherwise any missing required dependency returns `DEPENDENCY_UNAVAILABLE`.

### 10.4 Caching

Caching is outside pure calculations. A cache identity must include at least:

- definition ID and formula version;
- normalized parameters;
- input source IDs and revisions;
- instrument, universe, or portfolio identity;
- requested and effective timeframe;
- adjustment and alignment modes;
- start/end or as-of range;
- provisional/final state;
- dependency identities and formula versions.

A cache entry with unknown source revision or incompatible finality cannot satisfy a request. Formula updates cannot overwrite prior-version cache entries.

### 10.5 Batch execution

Whole-universe scans and backtests use bounded concurrency and shared immutable input frames. Definitions remain unaware of batching. Executors may reuse verified primitives or dependency results for performance, provided cache identity and isolation preserve exact mathematical equivalence with single-instrument execution.

## 11. Formula integrity and numerical verification

### 11.1 Authority hierarchy

For each indicator, the implementation record identifies the best available authority in this order:

1. an original paper, exchange/provider methodology, or primary specification;
2. a reputable technical reference with a fully defined formula;
3. a hand-derived reference agreed in formula review;
4. an independent implementation used only as a comparator.

Third-party libraries, including `technicalindicators`, may assist comparison but cannot be the only source of truth. Their edge behavior, warm-up convention, and defaults must be independently checked before use. The canonical production implementation remains owned by Ticknal.

### 11.2 Formula review record

Before coding each definition, its review record resolves:

- exact equations and recurrence initialization;
- population versus sample statistics;
- smoothing convention and seed;
- treatment of equal values, zero denominators, missing fields, gaps, and suspended sessions;
- warm-up and first valid index;
- parameter defaults and allowed ranges;
- units and bounds;
- confirmation delay and repaint behavior;
- comparison tolerance;
- source citations and any licensing constraint.

No unresolved mathematical choice may be filled in silently by the implementer.

### 11.3 Test layers

The package will use a dedicated TypeScript test runner, with Vitest as the initial choice unless repository compatibility testing disproves it. Tests include:

- exact hand-calculated examples for primitives;
- reference-vector parity against the formula authority;
- cross-checks against an independent implementation where available;
- authentic-data snapshot regressions with recorded provenance;
- property tests for invariants such as bounds, scale behavior, monotonicity, or symmetry where mathematically valid;
- edge tests for constant series, one-bar series, gaps, zero volume, zero range, missing optional data, extreme magnitudes, and insufficient history;
- parameter-boundary and invalid-parameter tests;
- no-look-ahead prefix tests: appending future observations cannot change past confirmed outputs;
- confirmation-delay tests for pivots and patterns;
- dependency and formula-version tests for composites;
- contract tests proving chart, scanner, backtest, and alert adapters receive identical canonical results;
- performance tests at one-instrument and whole-EGX scales;
- integration smoke tests against authentic development/staging data adapters.

### 11.4 Tolerances

Every numeric output declares an absolute and/or relative tolerance suitable for its scale. Tests cannot use an arbitrary repository-wide decimal rounding rule. Exact integer, boolean, categorical, and timestamp outputs use exact equality.

### 11.5 Prefix stability and repainting

For a non-repainting indicator, computing the first `N` bars alone must match the first `N` confirmed outputs obtained after appending later bars. Any allowed exception is part of the definition, tested, and surfaced in metadata.

## 12. Data adapters and live-source policy

Adapters live in the application/server layer and produce the domain contracts in section 7. Separate adapters are expected for:

- daily market bars;
- intraday bars at exact stored frequencies;
- verified transaction statistics;
- benchmark and comparison assets;
- historical index constituents and breadth universes;
- funds/NAV and portfolio records;
- gold, silver, FX, and relevant macro series;
- Egyptian investor-flow, sector, industry, rate, inflation, and devaluation-context data.

Each adapter exposes the exact date range, observation frequency, field coverage, source, freshness, revision, adjustment status, and licensing capability available. Aggregating a lower frequency from authentic higher-frequency data is allowed only through a documented adapter transformation with exchange-calendar semantics. Disaggregating a higher frequency from lower-frequency data is prohibited.

The existing hourly-to-daily fallback must be removed from indicator execution paths. When authentic hourly data is missing, an hourly request returns `DATA_FREQUENCY_UNAVAILABLE`.

## 13. Registry and 411-entry program manifest

The product backlog remains the human-readable source of scope. A typed program manifest provides machine-enforced tracking for every ID, including:

- backlog ID and canonical machine ID;
- category and delivery stage;
- implementation status;
- data requirements and source readiness;
- formula-review status and reviewer;
- current formula version;
- verification status;
- consumer integration status;
- known limitations and blocked reason;
- ownership and linked specification/plan.

Allowed program states are:

- `unimplemented`
- `formula-review`
- `implementation`
- `data-gated`
- `verified`
- `integrated`
- `retired`

State transitions are validated. `data-gated` is not equivalent to `verified` or `integrated`. CI compares the manifest with the Markdown backlog to enforce exactly 411 unique IDs and reports missing, duplicate, or orphaned entries.

## 14. Consumer integration and migration

### 14.1 Charting

Charts become renderers of neutral output metadata. A generic adapter maps output types and visual hints to Lightweight Charts primitives. An indicator may provide a price overlay, synchronized pane, level, band, histogram, state background, or sparse marker without importing the chart library into its calculation.

Presentation choices such as color and precision cannot change the underlying values. The chart also displays warm-up, stale/provisional, unavailable, and data-confidence states instead of drawing fabricated zeroes.

### 14.2 Rule builder

The builder consumes output schemas and exposes only valid operations for each output type and unit. Numeric comparisons, crossovers, zones, direction, history operations, state changes, and boolean composition operate on canonical outputs. Rules persist definition IDs, formula versions, output keys, parameters, timeframe, finality policy, and any benchmark/universe identity.

The builder does not interpret overbought as sell or oversold as buy. Users define those relationships explicitly.

### 14.3 Backtesting

Backtests invoke the same engine with point-in-time data, historical universe membership, historical macro release availability, and pinned formula versions. They must model session timing and confirmation delay. Future constituent lists, revised macro releases unavailable at that date, or today's adjusted universe cannot leak backward.

### 14.4 Scanners and whole-universe evaluation

Scanners use the same definitions in batch mode. Ranking outputs declare coverage, ties, eligible universe, missing constituents, and normalization. A market-wide result below its minimum coverage is unavailable rather than silently computed over a biased subset.

### 14.5 Alerts and notifications

Alert evaluation consumes persisted canonical rules. The audit record captures data source/revision, formula version, parameters, output value, rule decision, evaluation time, bar finality, and delivery status. Notification delivery never recomputes the formula independently.

### 14.6 Existing indicator migration and protected strategy boundary

Indicator migration proceeds by parity, not by immediate deletion:

1. establish the new contracts, registry, primitives, executor, and tests;
2. migrate foundational price/return primitives;
3. port all current chart indicators, including Smart Money and its verified-trades requirement;
4. implement canonical standalone SMA, EMA, RSI, MACD, and other backlog indicators from reviewed formula authorities without extracting or changing strategy-local code;
5. prove indicator output parity or document and approve intentional formula corrections;
6. switch chart and new indicator-library consumers to the package;
7. switch new indicator scanners, rule-builder backtests, and rule alert evaluators;
8. remove duplicate application **indicator** implementations only after tests and production telemetry confirm no remaining imports.

HYDRA, PSI, and PSI V2 remain read-only throughout every wave. Their source directories under both `src/strategies` and `packages/quant-engine/src/strategies` are excluded from edits, renames, deletions, import rewrites, registry changes, parity cutovers, and runtime experiments. Read-only comparison is permitted only when it does not change their files or behavior. The new indicator engine may run beside them, but it must not become a dependency of any existing strategy without a later approved project.

Any backlog indicator that references existing-strategy output, such as a consensus or opportunity-quality measurement, may consume only an already published, stable, read-only output through an external adapter. It cannot import strategy internals or require a strategy change. If the necessary output is not already available through a stable boundary, that indicator remains explicitly data-gated until a separate strategy-integration design is approved.

## 15. Delivery program

The 411 entries will be delivered through independently reviewable waves. Each wave receives its own implementation specification and executable plan after this program design is accepted.

### Wave A: Foundation and price/return primitives

- domain contracts, provenance, validation, result envelope, diagnostics, registry, manifest, executors, test runner, and CI checks;
- numerical, series, rolling, alignment, and statistics primitives;
- the 20 Price and Return (`PRC`) entries as the first canonical vertical slice;
- one chart integration, one backtest integration, one scanner integration, and one non-delivering alert-evaluation integration to prove shared outputs.

### Wave B: Existing Ticknal calculations and migration

- all T0 entries and current chart indicators;
- Smart Money with authentic verified trades data;
- independent canonical implementations of backlog indicators that may also exist inside strategies, without touching strategy code;
- indicator parity reporting and controlled chart/indicator-consumer cutover;
- a path-scope check that fails the wave if any HYDRA, PSI, or PSI V2 file changes.

### Wave C: Trend, momentum, and volatility foundation

- T1 Trend (`TRD`), Momentum (`MOM`), and Volatility (`VOL`) entries;
- generic overlay and pane consumption;
- complete rule-output metadata for these categories.

### Wave D: Flow, structure, and price action

- T1 Volume/Flow (`FLW`), Market Structure (`STR`), and Pattern (`PAT`) entries;
- confirmation-delay and no-look-ahead test emphasis;
- verified-trade and liquidity capability handling.

### Wave E: Breadth and relative analysis

- Breadth (`BRD`) and Relative/Intermarket (`REL`) entries;
- historical universe membership, benchmark alignment, and coverage reporting.

### Wave F: Risk, performance, and portfolio analytics

- Risk (`RSK`) entries;
- cash-flow, benchmark, risk-free-rate, and valuation-time contracts;
- portfolio-versus-security applicability controls.

### Wave G: Egypt market intelligence

- Egypt (`EGY`) entries whose authentic sources are production-ready;
- explicit point-in-time release and revision rules;
- source licensing review before user-facing availability.

### Wave H: Advanced quantitative expansion

- T2 and T3 entries across Cycles (`CYC`), Quantitative (`QNT`), and other categories;
- additional audited numerical methods where required.

### Wave I: Research and data-gated completion

- connect each missing authentic source;
- complete formula and interpretation research;
- implement remaining `R` entries only after their data and product framing pass review.

Wave order may be adjusted for dependencies, but no wave may bypass the integrity gates. Parallel teams may work on independent indicator folders only after common contracts are stable.

## 16. Performance and operational requirements

### 16.1 Performance budgets

Each implementation plan sets measurable budgets for:

- one indicator on one ticker;
- a normal user chart with several indicators;
- a whole-EGX scan;
- a representative portfolio calculation;
- memory per series and per batch.

The engine favors clear, verified `O(n)` rolling algorithms where available. Optimized recurrences must be tested against straightforward reference implementations. Optimization may not change edge semantics.

### 16.2 Runtime placement

Sensitive, licensed, cross-sectional, portfolio, and heavy computations run server-side. Safe single-series calculations may run in a browser or worker only if package parity is tested and no protected data or formula is exposed contrary to product policy. Server and browser runtimes must agree numerically within the declared tolerance.

### 16.3 Observability

Application orchestration records:

- definition and formula version;
- duration and input size;
- cache outcome;
- data source/revision and freshness;
- result status and diagnostic codes;
- unexpected exceptions without leaking user-sensitive portfolio data.

Metrics distinguish expected `unavailable` results from implementation failures.

## 17. Security, licensing, and governance

- Data licenses are checked at the adapter and consumer boundaries; the pure engine does not grant access.
- Proprietary formula or model details are not serialized to clients unless explicitly approved.
- Portfolio and strategy inputs follow existing authorization and tenant-isolation rules.
- External formula references and code comparisons receive license review; Ticknal does not copy incompatible source code.
- Formula approvals, version releases, and migrations are reviewable in Git.
- Arabic and English explanations describe measurement and limitations without presenting an indicator as guaranteed investment advice.

## 18. Acceptance gates

### 18.1 Foundation gate

Before broad indicator implementation begins:

- contracts, domains, diagnostic semantics, and versioning are implemented and reviewed;
- the registry rejects duplicate backlog IDs and machine IDs;
- CI proves exact coverage of the 411-entry program manifest;
- the package test runner, reference-fixture policy, and provenance checks are active;
- an authentic end-to-end vertical slice proves chart, backtest, scanner, and alert-evaluation parity;
- the engine has no application, database, network, React, or chart dependency.

### 18.2 Per-indicator gate

Each indicator must have:

- an approved formula-review record;
- isolated implementation and definition modules;
- declared inputs, assets, timeframes, warm-up, outputs, units, defaults, bounds, finality, repainting, and confirmation delay;
- independent numerical reference tests and edge tests;
- no-look-ahead tests where applicable;
- authentic adapter integration for every advertised data requirement;
- chart and rule-builder metadata;
- English and Arabic plain-language explanations;
- acceptable performance at its promised scale;
- consumer parity evidence;
- a formula version and migration note for any later breaking change.

### 18.3 Release gate

Before a wave is enabled for users:

- build and type checks pass;
- unit, property, contract, integration, and relevant end-to-end tests pass;
- affected endpoints return without unhandled exceptions or 500 responses;
- affected pages have no hydration, browser-console, or uncaught-promise errors;
- live-source freshness and failure states are visibly correct;
- data-gated definitions remain disabled with accurate reasons;
- staged telemetry shows no formula divergence between consumers.

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Formula ambiguity creates plausible but wrong output. | Formula review resolves every convention before code; trusted references and independent vectors are mandatory. |
| A 411-item registry becomes a monolith. | One folder per definition, small category manifests, composed root registry, CI uniqueness checks. |
| Chart, backtest, and alert results drift. | All consumers call the same versioned executor; contract tests compare the full result identity. |
| Missing data gets disguised as zero or another timeframe. | Observed/missing fields, capability negotiation, exact frequency contracts, explicit unavailable diagnostics. |
| Future information leaks into backtests. | Point-in-time inputs, release timestamps, historical universe membership, prefix-stability and confirmation-delay tests. |
| Third-party library quirks become product behavior. | Ticknal-owned canonical formulas, reference hierarchy, third-party code used only as one comparator. |
| Formula improvements break future saved no-code rules. | Semantic formula versions, pinned persistence, side-by-side comparison, explicit migration. |
| Indicator work accidentally changes one of the three existing strategies. | Treat HYDRA, PSI, and PSI V2 trees as read-only; implementation plans and reviews include an explicit changed-path check. |
| Advanced indicators exceed practical runtime budgets. | Batch-aware orchestration, benchmark gates, verified optimized primitives, server-side placement. |
| Data licensing blocks a promised feature. | Source readiness and licensing are tracked per manifest entry before user-facing enablement. |
| A proprietary composite obscures weak inputs. | Component versions, coverage, normalization, weighting, and missing behavior are returned and auditable. |

## 20. Explicitly deferred design work

This program design intentionally defers:

- the visual design and interaction model of the indicator browser;
- the drag-and-drop rule-builder UI;
- the full persisted strategy schema;
- any modification, migration, refactor, or integration of HYDRA, PSI, or PSI V2;
- order simulation, fees, slippage, dividends, corporate actions, and survivorship details of the backtester;
- scheduling, throttling, deduplication, and delivery policy for notifications;
- pricing tiers and entitlements;
- investment-advice and compliance copy.

Those systems must consume the canonical contracts defined here and cannot introduce separate indicator mathematics.

## 21. First implementation-plan boundary

After this written specification is approved, the first implementation plan should cover only Wave A: foundation contracts plus the Price and Return vertical slice. It must be detailed enough to execute through tests, migration-safe integration, runtime checks, and documentation. Later waves receive their own plans after the foundation has proven numerical and operational correctness.

This boundary keeps the work reviewable without shrinking the committed scope: all 411 entries remain the program objective and remain tracked by the manifest from the first wave onward.
