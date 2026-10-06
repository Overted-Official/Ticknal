# Official Macro Data Pipeline and Indicators Design

**Date:** 2026-10-06  
**Status:** Proposed for implementation  
**Scope:** Official macro ingestion, contextual data loading, and nine macro-backed indicators  

## Outcome

Ticknal will automatically ingest official Egyptian and U.S. macroeconomic observations, preserve their publication chronology and revisions, and expose them to the canonical indicator engine without modifying Typhon, Cerberus, HYDRA, or any other strategy implementation.

The first release will make these nine indicators operational:

1. `REL-020` Inflation-adjusted return
2. `EGY-017` Real USD/EGP Fair Value
3. `EGY-018` FX Devaluation Risk
4. `EGY-024` Gold versus EGP Hedge Effectiveness
5. `EGY-025` CBE Policy Rate
6. `EGY-026` Yield Curve Slope
7. `EGY-027` Inflation Momentum
8. `EGY-028` Real Equity Return
9. `EGY-036` EGP Purchasing Power Index

`RSK-036` Inflation Drag is outside this implementation because accurate portfolio inflation drag requires a point-in-time portfolio valuation ledger. The CPI pipeline introduced here will satisfy its macro dependency later.

## Approaches Considered

### 1. Expand `macro_inflation_rates` for every new series

This is the smallest schema change, but it would turn one row into a wide collection of unrelated monthly, event-driven, and daily fields. It does not model multiple Treasury tenors or revisions cleanly.

### 2. Add a canonical long-form macro observation store

This is the selected approach. Each observation has a stable series code, observation date, value, unit, publication timestamp, source, and revision identity. It supports CPI, rates, reserves, and yields without adding another table for every data source. The existing inflation table remains as a compatibility projection for current dashboard consumers.

### 3. Use a commercial macroeconomic vendor

This would reduce parser maintenance but introduces cost and licensing constraints before official free sources have been exhausted. It is not selected for the first release.

## Data Model

Add a `macro_observations` table with:

- `series_code`: canonical identifier from the supported-series registry
- `observation_date`: economic reference date
- `value`: numeric observation
- `unit`: percent, index, EGP, USD millions, or another declared unit
- `published_at`: first known public availability timestamp
- `source_name` and `source_url`
- `source_revision`: deterministic revision or content identity
- `is_latest`: latest known vintage for the series and observation date
- `metadata`: source-specific fields such as tenor or rate name
- `retrieved_at`, `created_at`, and `updated_at`

The unique key is `(series_code, observation_date, source_revision)`. When a changed official value arrives, the previous vintage remains stored with `is_latest = false`; the new vintage becomes current. Reprocessing an unchanged response is idempotent.

Initial canonical series codes:

- `EG_CPI_HEADLINE_INDEX`
- `EG_CPI_HEADLINE_YOY`
- `EG_CPI_HEADLINE_MOM`
- `EG_CPI_CORE_YOY`
- `US_CPI_INDEX`
- `US_CPI_YOY`
- `CBE_OVERNIGHT_DEPOSIT_RATE`
- `CBE_OVERNIGHT_LENDING_RATE`
- `CBE_MAIN_OPERATION_RATE`
- `CBE_DISCOUNT_RATE`
- `EG_NET_INTERNATIONAL_RESERVES_USD_MN`
- `EG_TBILL_3M_YIELD`
- `EG_TBILL_6M_YIELD`
- `EG_TBILL_9M_YIELD`
- `EG_TBILL_12M_YIELD`

Existing `macro_money_supply` remains the source for M2 in this release. The current `macro_inflation_rates` table remains readable and receives a compatibility projection from the normalized CPI observations.

## Source Adapters

Each source lives in a focused module and returns normalized observation candidates without writing to the database:

- CBE/CAPMAS inflation adapter: Egyptian headline and core inflation observations
- BLS CPI adapter: U.S. CPI index levels and derived annual rates
- CBE policy-rate adapter: effective-dated deposit, lending, main-operation, and discount rates
- CBE reserves adapter: monthly net international reserves
- CBE Treasury adapter: 3-, 6-, 9-, and 12-month secondary-market weighted-average yields

The adapters use official HTTP sources. Parsers are pure functions tested against checked-in, minimal fixtures. Source retrieval and parsing are separate so malformed upstream responses fail visibly instead of being converted into fabricated values.

## Synchronization

Create one macro synchronization coordinator that:

1. Fetches adapters independently so one failed source does not block the rest.
2. Validates series code, finite value, unit, observation date, and publication timestamp.
3. Persists observations transactionally and idempotently.
4. Preserves a new vintage when an official revision changes a value.
5. Projects current CPI rates into `macro_inflation_rates` for compatibility.
6. Logs per-source fetched, inserted, revised, unchanged, and rejected counts.
7. Returns partial-success status with explicit source errors.

`/api/cron/update-macro` remains the authenticated entry point. Its Vercel schedule changes from monthly to daily. This is a daily release check, not an assumption that all macro series update daily. Treasury yields can change each Egyptian business day; CPI, M2, and reserves are monthly; policy rates are event-driven.

A separate explicit backfill function imports available history in bounded pages. Routine cron execution only checks recent periods and does not redownload all history.

## Chronology and Data Integrity

Indicator backtests must not see a macro observation before `published_at`. Monthly reference dates alone are insufficient and create look-ahead bias.

The contextual loader aligns each price bar with the latest observation whose reference date and publication timestamp are both at or before the bar timestamp. Revisions apply only from the revision publication timestamp onward.

No indicator calculation may use the existing hardcoded inflation fallbacks. Missing, stale, malformed, or unavailable official data produces an unavailable diagnostic. Dashboard compatibility code may display an explicit unavailable state, but it must not present a fabricated macro value as official.

## Contextual Indicator Inputs

Extend contextual execution with a generic `loadMacroSeries` loader backed by `macro_observations`. Indicator planning maps definitions to these roles:

- `egyptCpiIndex`
- `egyptHeadlineInflationYoY`
- `egyptHeadlineInflationMoM`
- `usCpiIndex`
- `cbePolicyRate`
- `netInternationalReserves`
- `treasury3mYield`
- `treasury12mYield`
- existing `m2`, `usdEgp`, and `gold` series where required

Every loaded series includes source provenance and the latest revision identity so canonical execution fingerprints change when official data is revised.

## Indicator Formulas

Each indicator keeps its own existing `logic.ts` module.

### Inflation-adjusted return and Real Equity Return

Use the exact Fisher relation over the selected period:

`real return = (1 + nominal return) / (CPI end / CPI start) - 1`

Annualized real return uses elapsed calendar time. Real drawdown is calculated from the CPI-deflated wealth index.

### Real USD/EGP Fair Value

Use relative purchasing-power parity from the first common valid Egyptian CPI, U.S. CPI, and official USD/EGP observation:

`fair FX = base FX × (Egypt CPI / base Egypt CPI) / (US CPI / base US CPI)`

Misvaluation is spot relative to fair value. Confidence reflects valid common-series coverage, not subjective certainty.

### FX Devaluation Risk

Use a documented version-one composite scaled to 0–100 from:

- official USD/EGP depreciation momentum
- Egyptian inflation pressure
- M2 growth
- reserve deterioration
- negative real policy rate

Every component is normalized with declared thresholds and equal weights among available required components. The indicator is unavailable unless all five components exist. The output includes the score, Low/Moderate/High state, and elevated-driver count. The formula version changes whenever components or thresholds change.

### Gold versus EGP Hedge Effectiveness

Build local gold from international gold and USD/EGP, then calculate rolling calendar-month gold returns, inflation-adjusted gold return, correlation with inflation changes, and the hedge ratio over the configured window.

### CBE Policy Rate

Show the overnight deposit rate, its change from the previous decision, and the ex-post real rate calculated as policy rate minus headline inflation.

### Yield Curve Slope

Use the 12-month minus 3-month EGP T-bill weighted-average yield. Positive is normal, zero is flat, and negative is inverted. The names explicitly identify this as a T-bill curve rather than implying a complete sovereign bond curve.

### Inflation Momentum

Use CPI index levels to calculate monthly inflation, annual inflation, and acceleration in the annual rate. Source-provided rates are validation inputs; the canonical output is derived from index levels where full levels are available.

### EGP Purchasing Power Index

Set the first valid CPI observation to purchasing power 100:

`purchasing power = 100 × base CPI / current CPI`

Loss percentage is `100 - purchasing power`.

## Operational Registration

After data loaders and formula tests pass, add the nine backlog IDs to their category operational sets. The canonical registry should then report 359 operational and 52 data-gated indicators.

Definitions will declare their required contextual roles instead of using unconditional unavailable diagnostics. Missing source roles continue to produce visible `DATA_CAPABILITY_MISSING` diagnostics in the chart UI.

## Testing

Tests will cover:

- each pure source parser using minimal official-response fixtures
- validation, idempotent writes, revision preservation, and partial-source failure
- publication-time alignment and revision chronology
- contextual requirement planning and macro-role loading
- numerical reference cases for every indicator logic file
- the operational boundary changing from 350/61 to 359/52
- the architectural rule requiring one logic file per indicator
- authenticated cron routing and a macro-sync response without unhandled exceptions

Final verification must include the quant-engine test suite, relevant application tests, `npx tsc --noEmit`, `npm run build`, and a runtime request to the affected cron/API path. No strategy implementation or strategy test is modified.

## Files and Boundaries

Expected new areas:

- `src/lib/macro/` for the supported-series registry, source adapters, parsers, persistence, and coordinator
- one new database migration plus the Drizzle schema entry
- contextual server-loader extensions under `src/lib/indicators/server/`
- the nine existing dedicated indicator `logic.ts` modules and their declarative definitions
- focused parser, loader, persistence, and numerical tests

Existing strategy directories under `src/strategies/` and `packages/quant-engine/src/strategies/` are out of scope and must remain byte-for-byte untouched.
