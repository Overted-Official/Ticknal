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
