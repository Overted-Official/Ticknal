# PRC-017 — Distance from high or low

How far price sits below a rolling high or above a rolling low.

Arabic: المسافة النسبية بين سعر الإغلاق وأعلى قمة وأدنى قاع في النافذة المحددة.

## Formula

- `distance_from_high_pct = (close / highest - 1) × 100`
- `distance_from_low_pct = (close / lowest - 1) × 100`

The default lookback is `20` and complete windows are required. An oversized lookback returns aligned nulls with `HISTORY_INSUFFICIENT`.  Historical values do not repaint; a provisional latest bar remains provisional. The engine keeps full precision and does not display-round outputs.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
