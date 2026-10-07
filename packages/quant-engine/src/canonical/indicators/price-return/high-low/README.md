# PRC-003 — High and low

The highest and lowest price reached in each bar.

Arabic: أعلى وأدنى سعر تم تسجيلهما في كل فترة، والفارق بينهما.

## Formula

- `high[i] = bar.high`
- `low[i] = bar.low`
- `range[i] = bar.high - bar.low`

## Outputs

- `high`: price units, main-chart overlay.
- `low`: price units, main-chart overlay.
- `range`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
