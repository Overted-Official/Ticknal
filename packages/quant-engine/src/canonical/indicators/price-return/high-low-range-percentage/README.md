# PRC-014 — High-low range percentage

Bar range relative to price.

Arabic: نطاق أعلى وأدنى سعر كنسبة من سعر الإغلاق.

## Formula

- `range_pct[i] = ((high[i] - low[i]) / close[i]) × 100`

Every price used as a divisor must be positive; invalid domains return a typed diagnostic and never Infinity or NaN. The engine preserves alignment and full precision without display rounding. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
