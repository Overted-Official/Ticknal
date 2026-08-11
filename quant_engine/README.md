# QuantEGX engine

The `quant_engine` package is the corrected research path. Legacy optimizer and
signal scripts remain available only as benchmarks; new research should use the
canonical source, validation, labels, walk-forward, and backtest modules.

## Data audit

```powershell
python -m quant_engine.scripts.audit_data --source csv
python -m quant_engine.scripts.audit_data --source database --compare-csv
```

The database is canonical only when the parity report has zero row difference
and zero affected tickers.

## Corrected rules benchmark

```powershell
python -m quant_engine.scripts.evaluate_rules_v1 --ticker COMI --source csv
```

The command uses causal unquantized Master Index crossings, next-session-open
fills, 10 bps commission plus 15 bps slippage per side, daily mark-to-market
drawdown, point-in-time liquidity, and the explicit B&H/win-rate qualification
policy. Add `--output-dir quant_engine/reports` to persist metrics, trades, and
the equity curve.

## Pooled ML walk-forward run

```powershell
python -m quant_engine.scripts.train_walk_forward_v1 `
  --source csv `
  --first-test-year 2021 `
  --output-dir quant_engine/artifacts/walk_forward_v1
```

The command builds one fixed global Master Index opportunity set, attaches
small/medium/large target-before-stop labels, and trains pooled annual XGBoost
folds. Every fold uses five prior years for training, the next year for Platt
calibration and the 75% precision threshold, a 64-session purge plus five-session
embargo, and the following year as untouched test data. Accepted test signals
are replayed at the next open with costs, adverse-first brackets, and causal time
exits. A scale is promoted only when its net OOS ROI beats that ticker's B&H,
its net win rate is at least 75%, it has enough trades, and it passes the active
drawdown gate.

Use `--tickers COMI,SWDY,...` to restrict the model candidates while retaining
full-universe market context, and `--replay-tickers COMI` for a bounded economic
smoke test. A restricted or single-year run is diagnostic only; it is not a
deployable result.

## Tests

```powershell
python -m pytest -q quant_engine/tests
```
