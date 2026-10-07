# PRC-012 — Gap percentage

Difference between today's open and the previous close.

Arabic: الفارق النسبي بين سعر افتتاح الفترة وسعر إغلاق الفترة السابقة.

## Formula

- `gap_pct[i] = (open[i] / close[i-1] - 1) × 100`
- `direction = up, down, or flat from the exact sign`

Every price used as a divisor must be positive; invalid domains return a typed diagnostic and never Infinity or NaN. The engine preserves alignment and full precision without display rounding. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
