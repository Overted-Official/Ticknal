# PRC-015 — True range

Range adjusted for overnight gaps.

Arabic: نطاق الحركة بعد احتساب الفجوة عن سعر الإغلاق السابق.

## Formula

- `true_range[0] = high[0] - low[0]`
- `true_range[i] = max(high-low, |high-prevClose|, |low-prevClose|)`

The first bar uses its high-low range; later bars include gaps from the previous close. The engine preserves alignment and full precision without display rounding. Historical values do not repaint; a provisional latest bar remains provisional.

Reference: https://www.tradingview.com/pine-script-docs/concepts/chart-information/
