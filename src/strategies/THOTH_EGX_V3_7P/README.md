# THOTH EGX V3.7P platform integration

This folder is the isolated website integration for the frozen `THOTH_EGX_V3.7P`
production package.

## Frozen artifacts

The feature extractor, UP/DOWN ONNX models, scalers, delta calibration, validation
thresholds, model theory, and production champion configuration files under this
folder were copied without modification from:

`_playground/QE-V1-Upgrade/_production_models/THOTH_EGX_V3.7P`

The copied runtime-critical files have matching SHA-256 hashes against their source
files. Do not edit files under `artifacts/` or `thothPsi8FeatureExtractor.ts`.

## Website adapter

- `thothV37PEngine.ts` runs the frozen 20-feature models with the package's UP=21
  and DOWN=126 chronological sequence lengths, scalers, and historical-delta
  calibration.
- `thothV37PStrategy.ts` applies the Primary Growth Champion's causal execution:
  decisions at the current close, fills at the next open, 0.15% commission, 0.10%
  slippage, conviction >=70 entries, three-bar minimum holding, ten-bar cooldown,
  and the frozen dynamic velocity exit conditions.
- The public strategy ID remains `thoth_egx_macro` so saved website URLs, alerts,
  and preferences remain compatible. Its displayed label is `THOTH EGX V3.7P`.

The chart report is an isolated single-ticker capital sleeve so its ROI and alpha
describe the selected ticker's signals. Cross-sectional production controls (EGX
P20 eligibility, ten portfolio slots, 30% sector cap, 10% portfolio cash buffer,
and same-day delta-percentile ranking) require a multi-ticker portfolio state and
are therefore not fabricated inside the single-ticker chart.
