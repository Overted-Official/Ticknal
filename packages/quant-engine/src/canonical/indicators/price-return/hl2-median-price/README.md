# PRC-004 — HL2 median price

Midpoint between each bar's high and low.

Arabic: منتصف المسافة بين أعلى وأدنى سعر في الفترة.

## Formula

- `hl2[i] = (bar.high + bar.low) / 2`

## Outputs

- `hl2`: price units, main-chart overlay.

There is no warm-up period and no historical repainting. A provisional latest bar produces a provisional value until that bar is final. Calculations retain full JavaScript number precision; consumers own display rounding.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
