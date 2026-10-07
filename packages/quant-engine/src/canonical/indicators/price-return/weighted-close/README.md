# PRC-007 — Weighted close

Close-weighted average price for the bar.

Arabic: متوسط يعطي سعر الإغلاق وزناً مضاعفاً مع أعلى وأدنى سعر.

## Formula

- `hlcc4[i] = (bar.high + bar.low + 2 × bar.close) / 4`

## Outputs

- `hlcc4`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
