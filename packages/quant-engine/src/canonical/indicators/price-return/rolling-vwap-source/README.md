# PRC-020 — Rolling VWAP source

Price weighted by volume over a fixed window.

Arabic: متوسط السعر المرجح بحجم التداول خلال نافذة متحركة ثابتة.

## Formula

`rolling_vwap[i] = sum(source × volume over lookback) / sum(volume over lookback)`

The default lookback is `20` and the default source is HLC3. Accepted sources are `close`, `hl2`, `hlc3`, and `ohlc4`. Complete observed-volume windows are required: missing or partial volume makes the indicator unavailable, while authentic zero volume remains zero. A zero total-volume window returns null with `NUMERIC_DIVIDE_BY_ZERO`.

This is a fixed rolling-window volume-weighted mean. It is not session-anchored VWAP and it is not anchored VWAP; the UI must not present it as either. The engine retains full precision and never display-rounds output. Historical values do not repaint; a provisional latest bar remains provisional.

References:

- https://www.tradingview.com/pine-script-docs/concepts/chart-information/
- https://www.tradingview.com/pine-script-reference/v6/
