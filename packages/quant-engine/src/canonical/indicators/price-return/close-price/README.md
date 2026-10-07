# PRC-001 — Close price

The final traded price of each bar.

Arabic: آخر سعر تداول مسجل في كل فترة.

## Formula

- `close[i] = bar.close`

## Outputs

- `close`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
