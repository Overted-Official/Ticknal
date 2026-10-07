# PRC-010 — Log return

Continuously compounded return used by quantitative indicators.

Arabic: العائد اللوغاريتمي المستمر بين سعرين يفصل بينهما عدد محدد من الفترات.

## Formula

`log_return[i] = ln(close[i] / close[i-lookback])`

The default lookback is `1`; it must be a positive safe integer. The first `lookback` outputs are aligned `null` warm-up values. Both prices in every logarithm must be positive. The calculation never applies absolute value, clamps a price, or rounds an output.

Output `log_return` uses decimal-return units in a synchronized pane. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
