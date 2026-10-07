# PRC-016 — Rolling high and low

Highest or lowest value in a selected window.

Arabic: أعلى قمة وأدنى قاع خلال عدد محدد من الفترات.

## Formula

- `highest = max(high over complete lookback window)`
- `lowest = min(low over complete lookback window)`

The default lookback is `20` and complete windows are required. An oversized lookback returns aligned nulls with `HISTORY_INSUFFICIENT`.  Historical values do not repaint; a provisional latest bar remains provisional. The engine keeps full precision and does not display-round outputs.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
