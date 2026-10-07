# PRC-008 — Absolute change

How many price units the asset gained or lost.

Arabic: مقدار ارتفاع أو انخفاض سعر الإغلاق بوحدات السعر خلال عدد محدد من الفترات.

## Formula

`change[i] = close[i] - close[i-lookback]`

The default lookback is `1`; it must be a positive safe integer. The first `lookback` outputs are aligned `null` warm-up values.  The calculation never applies absolute value, clamps a price, or rounds an output.

Output `change` uses price units in a synchronized pane. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
