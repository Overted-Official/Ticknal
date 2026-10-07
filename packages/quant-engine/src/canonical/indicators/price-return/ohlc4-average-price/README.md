# PRC-006 — OHLC4 average price

Average of open, high, low, and close.

Arabic: متوسط أسعار الافتتاح والأعلى والأدنى والإغلاق في الفترة.

## Formula

- `ohlc4[i] = (bar.open + bar.high + bar.low + bar.close) / 4`

## Outputs

- `ohlc4`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
