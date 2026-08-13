# Quantum Exhaustion v2

QE-v2 is an isolated, causal research pipeline. It does not import the legacy QE CNN or autoencoder artifacts.

Run the pipeline from the repository root:

```powershell
npm run qe:v2 -- audit-data --input <adjusted-prices.parquet> --adjustment-ledger <ledger.json>
npm run qe:v2 -- build-dataset --input <adjusted-prices.parquet> --output _technical_support/quantum_exhaustion_v2/causal_dataset.parquet
npm run qe:v2 -- train --dataset _technical_support/quantum_exhaustion_v2/causal_dataset.parquet --model tcn
npm run qe:v2 -- walk-forward --dataset _technical_support/quantum_exhaustion_v2/causal_dataset.parquet
npm run qe:v2 -- score --dataset <dataset.parquet> --bundle <tcn_seed_17> --bundle <tcn_seed_41> --bundle <tcn_seed_73>
npm run qe:v2 -- backtest --scores <scores.parquet>
npm run qe:v2 -- export-deploy --scores <scores.parquet> --dataset <dataset.parquet> --validation <promotion-summary.json> --policy <locked_policy.json> --bundle <model-dir>
```

`export-deploy` retains `status: research` unless every promotion gate is true. The Next.js API rejects research-only, stale, schema-incompatible, or hash-invalid artifacts. Threshold sliders affect legacy QE only.

Large price jumps are excluded until reviewed against `adjustment_ledger.schema.json`. A verified ledger entry back-adjusts pre-event OHLC and volume; an unverified entry keeps the ticker ineligible.

## v2.1 price-swing target

Price, not PSI, defines the training truth. Each ticker uses a trailing 64-session
median absolute adjusted-price move and a calibrated multiplier to confirm
alternating price tops and bottoms. PSI-40 is sampled at those price pivots. The
bottom-to-top and top-to-bottom PSI deltas populate separate causal CDFs, with
ticker estimates shrunk toward sector and all-EGX history.

`build-dataset` also writes `<dataset>.price_swing_events.parquet`, containing the
auditable completed swing table. The model target is now a tradeable price top or
bottom within 3/5/10 sessions; it is no longer a five-point PSI retracement.

Validation reports probability errors against the realized binary pivot outcome:

- `probability_mae_H = mean(abs(predicted_probability - realized_event))`
- `probability_rmse_H = sqrt(mean((predicted_probability - realized_event)^2))`
- `brier_H = probability_rmse_H^2`

Bottom-entry and top-exit MAE/RMSE are emitted separately. Return MAE/RMSE remain
separate and continue to measure forward adjusted-return magnitude error.

## Optional Comet tracking

Set credentials outside source control (the repository ignores `.env.local`):

```text
COMET_API_KEY=<rotated-key>
COMET_WORKSPACE=<workspace>
COMET_PROJECT_NAME=quantum-exhaustion-v2
```

`train` and `walk-forward` enable Comet automatically when `COMET_API_KEY` is present. Use `--no-comet` for local-only runs or `--comet` to require a configured key. Local model bundles, hashes, ledgers, and manifests remain the source of truth.
