# PRC-002 — Open price

The first traded price of each bar.

Arabic: أول سعر تداول مسجل في كل فترة.

## Formula

- `open[i] = bar.open`

## Outputs

- `open`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
