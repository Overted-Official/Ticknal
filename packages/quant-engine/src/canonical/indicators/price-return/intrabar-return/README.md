# PRC-013 — Intrabar return

Change from open to close within each bar.

Arabic: نسبة حركة السعر من الافتتاح إلى الإغلاق داخل الفترة نفسها.

## Formula

- `body_return_pct[i] = (close[i] / open[i] - 1) × 100`

Every price used as a divisor must be positive; invalid domains return a typed diagnostic and never Infinity or NaN. The engine preserves alignment and full precision without display rounding. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
