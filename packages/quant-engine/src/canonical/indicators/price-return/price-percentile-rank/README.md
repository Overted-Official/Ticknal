# PRC-019 — Price percentile rank

Where current price sits within its recent range.

Arabic: موضع سعر الإغلاق بين أدنى وأعلى إغلاق ضمن نافذة متحركة.

## Formula

- `percentile_0_100 = (close - rollingMinClose) / (rollingMaxClose - rollingMinClose) × 100`

The default lookback is `20` and complete windows are required. An oversized lookback returns aligned nulls with `HISTORY_INSUFFICIENT`. This is the close's linear position between the rolling minimum close and rolling maximum close. It is not an empirical-count percentile and it does not use bar highs or lows. بالعربية: يقيس موضع الإغلاق خطياً بين أدنى إغلاق وأعلى إغلاق في النافذة، وليس ترتيباً تجريبياً ولا يستخدم أعلى أو أدنى الشمعة. Historical values do not repaint; a provisional latest bar remains provisional. The engine keeps full precision and does not display-round outputs.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
