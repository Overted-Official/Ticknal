# Data Requirements for the 112 Non-Operational Indicators

**Audit date:** 2026-10-06  
**Scope:** the 112 canonical indicators for which `isIndicatorOperational(...)` is currently false.  
**Purpose:** identify every dataset or data-domain capability required beyond a single selected instrument's OHLCV frame. This is a data backlog, not an implementation plan and not a decision to retain every data-gated indicator.

## Executive finding

The 112 indicators do **not** all require 112 new external datasets.

- **24 indicators** need aligned access to two or more price series that are already largely present in `daily_prices`. Their primary blocker is orchestration, not a new feed.
- **30 indicators** need a point-in-time EGX universe, index membership, or taxonomy layer on top of the existing EGX price panel.
- **4 indicators** need shares outstanding, free float, or market-cap history.
- **3 indicators** require order-book or signed-trade data and are the clearest paid/licensed-feed candidates.
- The remaining indicators depend on macroeconomic releases, official flows, funds, internal trade/portfolio ledgers, or existing proprietary model outputs.

The database already has useful coverage for EGX prices, the three main indices, USD/EGP, gold, silver, mutual-fund prices, inflation, and money supply. It also contains an investor-flow table, but that table does not persist row-level provenance and the current updater can create modeled flow estimates. Those rows cannot yet be treated as one clean official series.

## Status legend

| Status | Meaning |
|---|---|
| **Available** | The required raw series is populated and can be used after an adapter and validation layer are added. |
| **Partial** | Some fields or history exist, but the data is not yet sufficient or trustworthy for the stated indicator. |
| **Derivable** | No external feed is required; the dataset can be produced from existing authenticated data or product events. |
| **Obtainable** | A realistic public, official, or current-pipeline source candidate exists, but ingestion and licensing still need verification. |
| **Licensed** | Reliable implementation likely needs a paid/licensed feed or explicit redistribution permission. |
| **Internal** | The data must be produced by Ticknal's backtester, portfolio system, indicator graph, or existing strategies. |

## What is actually in the database now

This is a read-only snapshot of the configured cloud database on 2026-10-06.

| Existing data | Observed coverage | Assessment |
|---|---:|---|
| EGX instruments in `tickers` | 465 symbols | Strong current universe, but no effective-dated listing status or membership history. |
| EGX symbols with `daily_prices` | 465 symbols, 1997-02-12 to 2026-10-05 across the collection | Sufficient raw material for cross-sectional price/volume calculations after eligibility and alignment rules are added. |
| EGX30 | 1,861 rows, 2019-02-03 to 2026-10-05 | Available. |
| EGX70 | 2,365 rows, 2017-01-02 to 2026-10-05 | Available; not every row has non-zero volume, which is normal for an index but needs explicit semantics. |
| EGX100 | 1,551 rows, 2020-05-10 to 2026-10-05 | Available. |
| USD/EGP (`USDEGP`) | 5,036 rows, 2006-08-20 to 2026-10-04 | Available as a price series; volume is zero and must never be interpreted as traded FX volume. |
| Gold (`GC1!`) | 5,035 rows, 2006-10-12 to 2026-10-04 | Available. Current application metadata treats this as EGP per gram; unit consistency must remain explicit. |
| Silver (`SI1!`) | 5,035 rows, 2006-10-11 to 2026-10-04 | Available. Current application metadata treats this as EGP per gram; unit consistency must remain explicit. |
| Fund instruments/prices | 169 fund symbols with prices, collection range 2000-01-02 to 2026-10-05 | Useful fund unit-price history exists, but the generic price field does not distinguish official NAV, dealing price, or exchange market price. |
| Current sector/industry taxonomy | 469/469 with sector and industry; 468/469 with industry group and sub-industry | Available as current metadata only; not point-in-time history. |
| Egyptian inflation | 20 monthly rows, 2025-01 to 2026-08; headline, core, and US CPI rates present | Partial. Too short for many historical real-return studies and stores rates rather than a complete CPI index/release history. |
| Money supply | 1,042 rows: M0 310, M1 366, M2 366; M2 from 1996-02 to 2026-07 | Available, but publication timestamps, revisions, and units/source lineage need strengthening. |
| Nationality investor flows | 665 rows, 2024-01-02 to 2026-10-05 | Partial. Schema has Egyptian/Arab/foreign buy, sell, net, and turnover, but no provenance flag. The current sync can store modeled `DECOMPOSED_SESSION` values, so official and estimated observations cannot be separated reliably. |
| EGX trade statistics | 0 rows | Schema exists for trades, volume, value, average trade size, absorption ratio, and CLV, but no data is populated. |
| Price adjustments | 15 rows | Partial corporate-action/integrity support, not a complete official corporate-action ledger. |
| User positions | 30 rows | Useful application records, but not a complete historical portfolio valuation or strategy-backtest trade ledger. |
| Intraday positions | 0 rows | Does not currently provide trade-history coverage. |
| Policy rates, Treasury yields, order book, historical market cap, index constituents, NAV-specific facts | No matching production tables found | Missing. |

## Dataset register

### A. Market, universe, benchmark, and reference data

#### D01 — Aligned multi-series price service

- **Data:** authenticated close/return series for a selected asset, comparison asset, benchmark, sector/index, FX, or commodity; common date grid; missing-session policy; currency and unit metadata.
- **Granularity:** daily initially; one record per instrument and trading/valuation date.
- **Current state:** **Available raw data / missing adapter**. The required prices largely exist in `daily_prices`.
- **Update target:** after every daily price sync.
- **Why it matters:** pair, relative-strength, correlation, beta, alpha, currency conversion, and benchmark-risk indicators cannot be computed from the chart's one-symbol frame.

#### D02 — Point-in-time EGX eligible-universe history

- **Data:** symbol, listed/delisted/suspended state, first/last eligible date, security type, ordinary-share eligibility, trading-session status, and reason for exclusion.
- **Granularity:** effective-dated events plus a materialized daily universe snapshot.
- **Current state:** **Partial**. A broad current ticker list exists, but using today's list across the past creates survivorship bias.
- **Update target:** daily status check plus event-driven listing, delisting, and suspension changes.
- **Acquisition:** EGX instrument lists/disclosures are the preferred candidate; current ticker discovery can be a secondary reconciliation source.

#### D03 — Historical EGX30/EGX70/EGX100 constituents and weights

- **Data:** index code, constituent, effective-from/to dates, announced rebalance date, weight, free-float factor, and source document.
- **Granularity:** each rebalance/event; daily materialized membership for calculation.
- **Current state:** **Missing**. Index level histories exist, but constituent histories do not.
- **Update target:** on every announced index review/rebalance, with historical backfill.
- **Acquisition:** official EGX review files are the preferred candidate. Current membership alone is not enough for backtests.

#### D04 — Point-in-time sector and industry taxonomy

- **Data:** symbol, sector, industry group, industry, effective-from/to dates, and taxonomy version.
- **Granularity:** event-driven history.
- **Current state:** **Partial**. Current taxonomy coverage is almost complete, but changes are not versioned.
- **Update target:** event-driven, with a periodic current-universe reconciliation.
- **Acquisition:** derive the initial snapshot from `tickers`; backfill changes from official/reference histories where available.

#### D05 — Shares outstanding, free float, market capitalization, and cap weights

- **Data:** total shares, free-float shares or factor, close used for valuation, total market cap, free-float market cap, currency, observation date, publication timestamp, and corporate-action linkage.
- **Granularity:** daily market cap; effective-dated share/free-float changes.
- **Current state:** **Missing**.
- **Update target:** daily after close for market cap; event-driven for share-count/free-float changes.
- **Acquisition:** the existing TradingView scanner already uses `market_cap_basic` as a sort key, so a current-value snapshot is a realistic candidate to test. It would not provide point-in-time history automatically; Ticknal would need to begin storing snapshots and separately backfill or reconstruct share history. Licensing and redistribution rights must be checked before production use.

#### D06 — Benchmark, currency, unit, and calendar mappings

- **Data:** instrument-to-default-benchmark mapping, fund-declared benchmark, quote currency, conversion series, commodity unit, exchange/valuation calendar, and alignment policy.
- **Granularity:** effective-dated metadata.
- **Current state:** **Partial/Derivable**. Currency and high-level taxonomy exist, but benchmark assignments and alignment policy are not canonical datasets.
- **Update target:** event-driven.

#### D07 — Corporate-action event ledger

- **Data:** splits, consolidations, cash dividends, stock dividends, rights issues, ex-date, record date, payment date, adjustment factor, source, verification status, and publication timestamp.
- **Granularity:** one event per security.
- **Current state:** **Partial**. `price_adjustments` has 15 records, but it is an integrity/adjustment mechanism rather than a complete official event history.
- **Update target:** event-driven with daily disclosure reconciliation.
- **Why it matters:** market cap, turnover velocity, return comparisons, and portfolio/trade P&L need consistent adjusted-price and share-count treatment.

#### D08 — EGX session, holiday, and Ramadan calendar

- **Data:** EGX trading days, official holidays, exceptional closures, shortened sessions, Ramadan start/end labels, and calendar version.
- **Granularity:** one row per calendar date.
- **Current state:** **Obtainable/Derivable**. No dedicated table exists.
- **Update target:** maintain the future calendar annually and patch exceptional announcements immediately.

### B. Flow, transaction, and microstructure data

#### D09 — Official investor nationality flows

- **Data:** Egyptian, Arab, and other-foreign buy value, sell value, net value, total turnover, units/currency, session date, official-versus-estimated flag, source document, retrieved timestamp, and revision/version.
- **Granularity:** market-wide daily session.
- **Current state:** **Partial and provenance-blocked**. There are 665 rows, but no persisted source/provenance field and the current updater can generate modeled values from fixed participation assumptions and blue-chip direction.
- **Update target:** every EGX session after the official release.
- **Rule:** modeled values may be shown as estimates in a separate series, but must never silently populate the official series used for backtests or alerts.

#### D10 — Institutional-versus-retail participation flows

- **Data:** institutional and retail buy, sell, and net values, ideally split by nationality as well; official/estimated flag and source metadata.
- **Granularity:** market-wide daily session.
- **Current state:** **Missing**. The nationality table cannot derive this split.
- **Update target:** every EGX session.
- **Acquisition:** verify whether official EGX session reports expose the split and permit reuse. Otherwise this remains data-gated or is removed.

#### D11 — Verified daily EGX trade statistics

- **Data:** per symbol/session number of trades, traded volume, traded value, average trade size, active/suspended state, and market-wide totals. Absorption and CLV should normally be derived from authenticated fields rather than ingested as unexplained facts.
- **Granularity:** ticker-day plus market-day aggregate.
- **Current state:** **Missing data / schema present**. `egx_trade_statistics` has zero rows.
- **Update target:** every session after close.
- **Acquisition:** official daily EGX statistics are the preferred candidate; do not infer number of trades from OHLCV.

#### D12 — Best bid/ask quote history

- **Data:** best bid, best ask, bid/ask sizes, timestamp, sequence, session, source, and coverage flags.
- **Granularity:** intraday snapshots or quote events.
- **Current state:** **Licensed**. No table or feed exists.
- **Update target:** real time or frequent snapshots during market hours.
- **Likely decision:** exclude bid-ask spread from the initial 411 unless a licensed feed with redistribution rights is secured.

#### D13 — Order-book depth and signed trade prints

- **Data:** multiple bid/ask levels with sizes; trade price/size/time; aggressor side or exchange-provided trade direction; correction/cancel messages; sequence integrity and coverage.
- **Granularity:** event-level intraday data.
- **Current state:** **Licensed**. No table or feed exists.
- **Update target:** real time.
- **Likely decision:** exclude true order-book imbalance and true cumulative volume delta from the initial 411 unless licensed data is secured. A price-tick proxy must use a different name and cannot be presented as the original indicator.

### C. Egyptian macroeconomic and alternative-market data

#### D14 — Egypt CPI index and inflation release history

- **Data:** headline CPI index level, core CPI where available, monthly and annual rates, reference month, seasonal-adjustment status, publication timestamp, source, revision vintage, and US CPI index/rate for purchasing-power comparisons.
- **Granularity:** monthly observations plus release/revision events.
- **Current state:** **Partial**. The database has only 20 months of headline/core/US annual rates and no full CPI index or release-vintage model.
- **Update target:** on each CAPMAS/CBE/BLS release and revision.
- **Acquisition:** extend the current official CBE/BLS ingestion and add the Egyptian CPI index history needed for exact real-return compounding.

#### D15 — CBE policy rates and canonical risk-free rate

- **Data:** overnight deposit, overnight lending, main-operation/discount rate as applicable; effective date; decision/publication timestamp; and a declared Ticknal risk-free series, preferably also a short Treasury-bill alternative.
- **Granularity:** event-driven step series; daily forward-filled analytical view.
- **Current state:** **Missing**.
- **Update target:** every Monetary Policy Committee decision or rate change.
- **Acquisition:** official CBE releases are the preferred candidate. The product must document which rate is used by Sharpe/Treynor/Jensen calculations.

#### D16 — Egyptian Treasury yield curve

- **Data:** instrument type, auction/secondary observation date, maturity/tenor, yield, price where available, issue/maturity dates, source, and publication timestamp.
- **Granularity:** each auction or daily observation by tenor.
- **Current state:** **Missing**.
- **Update target:** each auction; daily only if a reliable secondary-market curve is acquired.
- **Acquisition:** official Ministry of Finance/CBE auction results are a realistic starting point; a complete daily curve may require a commercial vendor.

#### D17 — FX devaluation-risk macro inputs

- **Data:** net international reserves, import-cover measure if used, inflation differential, policy/risk-free rates, M2/liquidity, official FX, and explicit model-feature versions. External debt/current-account inputs should be included only if the final reviewed model actually uses them.
- **Granularity:** mixed monthly/event-driven series with publication timestamps and revisions.
- **Current state:** **Partial**. FX, inflation, and money supply exist; reserves and policy rates do not.
- **Update target:** per official release; the composite is recomputed when any input changes.

#### D18 — Egyptian money supply and liquidity

- **Data:** M0, M1, M2 levels, units, reference month, publication timestamp, source, and revision vintage.
- **Granularity:** monthly.
- **Current state:** **Available with metadata gaps**. M2 has 366 observations from 1996-02 through 2026-07.
- **Update target:** monthly release.

#### D19 — Verifiable parallel-market FX quotes

- **Data:** bid/ask or executable/reference price, venue/source, timestamp, verification method, legal/compliance classification, and confidence/coverage.
- **Granularity:** daily or intraday.
- **Current state:** **Licensed/compliance-gated**.
- **Likely decision:** exclude from the initial library unless counsel approves the source and the quote is reproducible and redistributable. Social-media or anecdotal quotes are not acceptable indicator data.

#### D20 — Egyptian ADR/GDR pair data and conversion metadata

- **Data:** local share and foreign receipt prices, receipt currency, depositary ratio, fees if material, local/foreign calendars, corporate actions, and stale-market flags.
- **Granularity:** aligned daily prices plus effective-dated pair metadata.
- **Current state:** **Obtainable** for actively traded pairs, but pair coverage and legal data access must be verified.
- **Update target:** daily after both relevant markets close.

#### D21 — Verified Egyptian retail bullion quotes

- **Data:** local bid/ask by metal, karat/fineness, unit/weight, bar or coin type, dealer/source, taxes/premiums, timestamp, and source-quality score.
- **Granularity:** intraday or at least daily snapshots.
- **Current state:** **Licensed/verification-gated**. International gold and silver translated into EGP are available; a genuine local retail premium is not.
- **Likely decision:** retain only if a stable, contractually usable local quote source is obtained.

### D. Funds, trades, portfolios, and internal model data

#### D22 — Fund NAV, dealing price, market price, distributions, and benchmark

- **Data:** fund identity, NAV per unit, dealing/subscription/redemption price, exchange market price where listed, valuation date, publication timestamp, currency, cash distributions/splits, declared benchmark, and source.
- **Granularity:** each fund valuation day; benchmark mapping is effective-dated.
- **Current state:** **Partial**. Ticknal has 169 fund price series from the current fund updater, but the generic OHLC row does not label the value as NAV versus dealing price, and no declared-benchmark history is stored.
- **Update target:** each fund valuation/publication day.
- **Rule:** `Fund Discount or Premium` is valid only where both an independently traded market price and a same-date NAV exist. It does not apply to an ordinary open-ended fund with only one published unit value.

#### D23 — Completed strategy/backtest trade ledger

- **Data:** strategy/version, parameter version, ticker, side, entry/exit signal and fill times/prices, quantity, fees/slippage, realized P&L, return, capital/equity before and after, and the in-trade high/low path or reproducible bar references.
- **Granularity:** one row per completed simulated or executed trade, tenant-safe where user-specific.
- **Current state:** **Internal and missing as a canonical shared contract**. User `positions` are not a substitute for reproducible strategy backtest trades.
- **Update target:** emitted by every backtest and execution close event.

#### D24 — Point-in-time portfolio ledger and valuation history

- **Data:** tenant, portfolio/account, holdings, quantity, cost basis, cash, deposits/withdrawals, fees, currencies, valuation prices, daily total value/return, benchmark, and effective timestamps.
- **Granularity:** transaction events plus daily portfolio snapshots.
- **Current state:** **Partial/Internal**. Current positions exist, but there is no complete daily holdings, cash-flow, and valuation history for portfolio risk analytics.
- **Update target:** transaction-driven plus end-of-day valuation.

#### D25 — Existing strategy and resolver output streams

- **Data:** stable, versioned outputs from Typhon/PSI, PSI 40, Cerberus, HYDRA, champion resolver, and strategy consensus; ticker, bar date, model/version, parameters, output values, and confidence/coverage.
- **Granularity:** ticker-bar and model run.
- **Current state:** **Internal adapter required**.
- **Boundary:** the three current strategy implementations remain untouched. The indicator layer may later consume a stable read-only output contract; it must not copy, rewrite, or merge their logic into indicator files.

#### D26 — Canonical indicator-output frames and composite provenance

- **Data:** selected indicator IDs, formula versions, parameters, timestamps, normalized states/scores, missing-input state, weights, and coverage.
- **Granularity:** ticker-bar or market snapshot.
- **Current state:** **Internal/Derivable** once the dependency graph and multi-domain executors exist.
- **Why it matters:** `Indicator Consensus Score` is an output over other indicators, not another external market dataset.

## Exact reconciliation of all 112 indicators

The following is a mutually exclusive **primary-blocker** assignment. Indicators can have secondary dependencies; those are listed in the next section. The counts sum to exactly 112.

| Primary blocker | Count | Indicator IDs |
|---|---:|---|
| Multi-series price/benchmark executor over largely existing data (`D01`, `D06`) | 24 | QNT-007–010; REL-001–006, REL-009, REL-011–017, REL-019; RSK-013, RSK-016; EGY-016, EGY-021–022 |
| Point-in-time EGX universe, membership, and taxonomy (`D02`–`D04`) | 30 | BRD-001–018, BRD-020–021, BRD-023–025; REL-007–008, REL-010; EGY-004, EGY-012–013, EGY-015 |
| Shares, free float, and market cap (`D05`, `D07`) | 4 | FLW-030; BRD-019, BRD-022; EGY-014 |
| Quotes, order book, and signed trades (`D12`, `D13`) | 3 | FLW-033–035 |
| EGX/Ramadan calendar (`D08`) | 1 | CYC-022 |
| Official investor-flow datasets (`D09`, `D10`) | 7 | EGY-005–011 |
| CPI/inflation history (`D14`) | 6 | REL-020; EGY-017, EGY-024, EGY-027–028, EGY-036 |
| Policy/risk-free rates (`D15`) | 3 | RSK-014–015; EGY-025 |
| FX devaluation macro bundle (`D17`, plus `D14`, `D15`, `D18`) | 1 | EGY-018 |
| Parallel-market FX (`D19`) | 1 | EGY-019 |
| ADR/GDR pairs (`D20`) | 1 | EGY-020 |
| Local bullion quotes (`D21`) | 1 | EGY-023 |
| Treasury yield curve (`D16`) | 1 | EGY-026 |
| Money supply (`D18`) | 2 | EGY-029–030 |
| Fund NAV/price/benchmark semantics (`D22`) | 3 | REL-018; EGY-031–032 |
| Verified trade statistics (`D11`) | 1 | EGY-033 |
| Completed strategy/backtest trades (`D23`) | 9 | RSK-020–027, RSK-030 |
| Portfolio ledger and valuation (`D24`) | 6 | RSK-031–036 |
| Existing strategy/composite output contracts (`D25`, `D26`) | 8 | TKL-001–005, TKL-007–009 |
| **Total** | **112** | |

## Secondary dependency notes

- **All breadth and ranking indicators:** also need `D01`, `D07`, and `D08` so returns are adjusted and sessions are aligned. `BRD-018`, `BRD-023`, and `EGY-004` specifically need `D03`.
- **Sector and industry indicators:** need `D04`. Cap-weighted concentration variants additionally need `D05`.
- **EGY-008:** specifically needs `D10`; it cannot be calculated from nationality flow `D09`.
- **EGY-011:** needs both `D09` and an EGX index series through `D01`.
- **EGY-012 and EGY-015:** include flow components and therefore need `D09` if that component remains in the reviewed formula. They must degrade transparently or remain unavailable when official flow data is missing.
- **EGY-017:** needs official FX from `D01`, Egyptian and US CPI from `D14`, and a versioned fair-value formula.
- **EGY-018:** needs the complete `D17` bundle, not only USD/EGP.
- **EGY-024:** needs gold, USD/EGP, and index prices through `D01`, plus inflation through `D14`.
- **EGY-028:** needs EGX prices through `D01` and CPI through `D14`.
- **EGY-030:** needs M2 through `D18` and EGX prices through `D01`.
- **RSK-014 and RSK-015:** need benchmark prices through `D01` and a declared risk-free series through `D15` or `D16`.
- **RSK-031–035:** covariance/correlation matrices are derived from aligned holding returns through `D01`; they are not a separate vendor dataset. The missing source of truth is the portfolio ledger `D24`.
- **RSK-036:** needs both portfolio value history `D24` and CPI `D14`.
- **TKL-008:** additionally needs verified liquidity/trade statistics from `D11` if average-trade-size or transaction-quality components remain in the formula.
- **TKL-001–005 and TKL-007:** are not requests to modify the existing strategies. They require read-only, versioned outputs through `D25`.

## Initial feasibility and exclusion triage

### Use or adapt first

- `D01` aligned multi-series prices: raw coverage is already strong.
- `D02`–`D04` universe/membership/taxonomy: essential for honest EGX breadth; current data provides a useful starting point, but history must be backfilled.
- `D08` calendar: inexpensive and maintainable.
- `D14` inflation: extend the existing ingestion rather than create a parallel system.
- `D15` policy rate, `D16` auction-based Treasury curve, and `D17` reserves: likely obtainable from official releases, subject to source-format reliability.
- `D18` money supply: already populated.
- `D22` fund data: preserve the current 169-series coverage but add explicit price-type and benchmark semantics.
- `D23`–`D26`: internal product datasets; no market-data purchase is required.

### Validate before committing

- `D05` market cap: current TradingView scanner access is a plausible source for present values, but licensing, field availability, free-float coverage, and historical backfill must be tested.
- `D09` investor nationality flows: preserve the table but add row-level provenance and separate official observations from modeled estimates before any indicator uses it.
- `D10` institutional/retail flows and `D11` trade counts/value: verify availability and redistribution terms in official EGX reports.
- `D20` ADR/GDR pairs: viable only for mapped pairs with dependable prices and depositary ratios.
- `D22` fund data: confirm whether each current source value is NAV, dealing price, or another unit-price concept and whether historical redistribution is permitted.

### Exclude unless a compliant feed is secured

- `D12` best bid/ask history.
- `D13` order-book depth and signed trades.
- `D19` parallel-market FX.
- `D21` verified local retail bullion quotes.

This triage would remove only the indicators whose definitions cannot be supported honestly. It should not replace them with fabricated proxies under the same names.

## Required source contract for every acquired dataset

Every future table or adapter should carry, directly or through linked metadata:

- canonical series and instrument identifiers;
- observation time and applicable market/session date;
- publication or first-available timestamp;
- source and source URL/document identifier;
- official, vendor, modeled, or derived classification;
- unit, currency, scale, and adjustment basis;
- revision/vintage and superseded-observation handling;
- field-level coverage and missingness;
- ingestion time and quality status;
- license/redistribution classification.

Without these fields, historical backtests can accidentally use data before it was published, mix estimated and official values, or silently change when a source revises history.

