# PRC-018 — Drawdown series

Decline from the running peak at every point in time.

Arabic: نسبة تراجع سعر الإغلاق عن أعلى إغلاق مسجل حتى تلك النقطة.

## Formula

- `peak[i] = max(close[0..i])`
- `drawdown_pct[i] = (close[i] / peak[i] - 1) × 100`

Close prices must be positive. The first drawdown is zero. Outputs are the running peak in price units and drawdown in percent; the engine retains full precision. Historical values do not repaint and a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
