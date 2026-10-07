# PRC-005 — HLC3 typical price

Average of high, low, and close.

Arabic: متوسط أعلى سعر وأدنى سعر وسعر الإغلاق في الفترة.

## Formula

- `hlc3[i] = (bar.high + bar.low + bar.close) / 3`

## Outputs

- `hlc3`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
