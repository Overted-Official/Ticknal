import { defineProgramCategory } from './define-category';

export const PRICE_RETURN_PROGRAM_ENTRIES = defineProgramCategory("price-return", [
  ["PRC-001", "close-price", "Close price", "The final traded price of each bar.", "close", "Overlay", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-002", "open-price", "Open price", "The first traded price of each bar.", "open", "Overlay", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-003", "high-low", "High and low", "The highest and lowest price reached in each bar.", "high, low, range", "Overlay", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-004", "hl2-median-price", "HL2 median price", "Midpoint between each bar's high and low.", "hl2", "Overlay", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-005", "hlc3-typical-price", "HLC3 typical price", "Average of high, low, and close.", "hlc3", "Overlay", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-006", "ohlc4-average-price", "OHLC4 average price", "Average of open, high, low, and close.", "ohlc4", "Overlay", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-007", "weighted-close", "Weighted close", "Close-weighted average price for the bar.", "hlcc4", "Overlay", "All, P", ["P"], "T2", "New", "integrated"],
  ["PRC-008", "absolute-change", "Absolute change", "How many price units the asset gained or lost.", "change, lookback", "Pane", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-009", "percentage-change", "Percentage change", "The percentage gain or loss over a chosen lookback.", "return_pct, lookback", "Pane", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-010", "log-return", "Log return", "Continuously compounded return used by quantitative indicators.", "log_return, lookback", "Pane", "All, P", ["P"], "T1", "New primitive", "integrated"],
  ["PRC-011", "cumulative-return", "Cumulative return", "Total compounded return from a selected starting point.", "cumulative_return, anchor", "Pane", "All, P", ["P"], "T1", "New", "integrated"],
  ["PRC-012", "gap-percentage", "Gap percentage", "Difference between today's open and the previous close.", "gap_pct, direction", "Pane", "All, P", ["P"], "T1", "New", "integrated"],
  ["PRC-013", "intrabar-return", "Intrabar return", "Change from open to close within each bar.", "body_return_pct", "Pane", "All, P", ["P"], "T2", "New", "integrated"],
  ["PRC-014", "high-low-range-percentage", "High-low range percentage", "Bar range relative to price.", "range_pct", "Pane", "All, P", ["P"], "T1", "New", "integrated"],
  ["PRC-015", "true-range", "True range", "Range adjusted for overnight gaps.", "true_range", "Pane", "All, P", ["P"], "T1", "Internal component", "integrated"],
  ["PRC-016", "rolling-high-low", "Rolling high and low", "Highest or lowest value in a selected window.", "highest, lowest, lookback", "Overlay", "All, P", ["P"], "T1", "Internal component", "integrated"],
  ["PRC-017", "distance-from-high-low", "Distance from high or low", "How far price sits below a rolling high or above a rolling low.", "distance_pct, lookback", "Pane", "All, P", ["P"], "T1", "New", "integrated"],
  ["PRC-018", "drawdown-series", "Drawdown series", "Decline from the running peak at every point in time.", "drawdown_pct, peak", "Pane", "All, P", ["P"], "T1", "New", "integrated"],
  ["PRC-019", "price-percentile-rank", "Price percentile rank", "Where current price sits within its recent range.", "percentile_0_100, lookback", "Pane", "All, P", ["P"], "T1", "New", "integrated"],
  ["PRC-020", "rolling-vwap-source", "Rolling VWAP source", "Price weighted by volume over a fixed window.", "rolling_vwap, lookback", "Overlay", "All with V", ["V"], "T1", "New", "integrated"],
]);
