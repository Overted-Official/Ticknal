# PRC-011 — Cumulative return

Total compounded return from a selected starting point.

Arabic: إجمالي العائد المتراكم منذ نقطة بداية محددة.

## Formula

`cumulative_return[i] = (close[i] / close[anchor] - 1) × 100`

The default anchor is the first observation. An explicit anchor must exactly equal an observation time; the calculation never chooses a nearest date. Values before the anchor are aligned `null`, the anchor is `0`, and the anchor price must be positive. Output uses percent units in a synchronized pane and is never display-rounded by the engine.

Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
