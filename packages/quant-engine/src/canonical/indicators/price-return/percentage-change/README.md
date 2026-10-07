# PRC-009 — Percentage change

The percentage gain or loss over a chosen lookback.

Arabic: نسبة ارتفاع أو انخفاض سعر الإغلاق خلال عدد محدد من الفترات.

## Formula

`return_pct[i] = (close[i] / close[i-lookback] - 1) × 100`

The default lookback is `1`; it must be a positive safe integer. The first `lookback` outputs are aligned `null` warm-up values. Every divisor must be positive. The calculation never applies absolute value, clamps a price, or rounds an output.

Output `return_pct` uses percent units in a synchronized pane. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
