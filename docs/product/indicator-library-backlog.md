# Ticknal Indicator Library Backlog

Last updated: 2026-10-05

## Purpose

This document is the canonical product backlog for Ticknal's indicator library. It is designed for an everyday Egyptian investor who should be able to:

1. Find an indicator by a plain-language question rather than knowing its technical name.
2. Add it to a chart and understand what it measures.
3. Use any published output as a building block in a no-code rule.
4. Backtest the same calculation used on the chart.
5. Receive alerts from the same calculation used in the backtest.

An indicator computes information. It does not decide whether the user should buy or sell. Buy and sell decisions belong to the future rule builder, where users combine indicator outputs with explicit conditions.

## Implementation status

All 411 backlog identities are registered in the canonical engine and integrated into the Charts indicator browser. Every indicator owns a dedicated `<category>/<indicator-id>/logic.ts` module; category files contain metadata and registration only. The current single-series market-bar contract can execute 299 indicators directly. The remaining 112 are explicitly data-gated until Ticknal supplies their authentic breadth, benchmark, portfolio, macro, order-book, trade-history, calendar, or protected-strategy inputs; they return typed availability diagnostics instead of fabricated values.

## Product taxonomy

The library should be presented through the following user-facing groups:

1. Price and return basics — What has price actually done?
2. Trend and moving averages — Is the market moving up, down, or sideways?
3. Momentum and oscillators — Is the move strengthening, weakening, overbought, or oversold?
4. Volatility and ranges — How much is the market moving and how unusual is it?
5. Volume, liquidity, and money flow — Is participation confirming the move?
6. Support, resistance, and market structure — Where are the important price levels and swings?
7. Cycles and signal processing — Is price moving in a measurable cycle or dominant rhythm?
8. Statistical and quantitative — Is the current behavior statistically unusual or in a different regime?
9. Market breadth and participation — Is a whole market move broadly supported?
10. Relative strength and intermarket — What is outperforming, and how are related assets interacting?
11. Risk, performance, and portfolio — Is the return worth the risk?
12. Candlestick and price-action signals — What does the latest bar or bar sequence imply?
13. Egypt market intelligence — What Egypt-specific forces may affect local assets?
14. Ticknal proprietary and composite models — What already exists internally or on charts?

## Delivery stages

| Stage | Meaning |
|---|---|
| T0 | Already exists. It should eventually be normalized into the canonical engine and metadata model. |
| T1 | Foundation. Required before a credible no-code strategy builder can launch. |
| T2 | Commercial launch expansion. Broadens usefulness without unusual data dependencies. |
| T3 | Advanced. Valuable for experienced users after the foundation is stable. |
| R | Research or data-gated. Requires validation, licensing, uncommon inputs, or careful product framing. |

## Status labels

| Status | Meaning |
|---|---|
| Existing chart | Selectable on the current Ticknal chart. |
| Internal only | Calculation exists inside a strategy but is not a reusable chart or builder indicator. |
| New | Not found as a reusable indicator in the current codebase. |
| Data-gated | Depends on data Ticknal does not consistently expose today. |
| Research | Formula, data quality, or investor interpretation needs additional validation. |

## Data and view codes

| Code | Meaning |
|---|---|
| P | Price bars: open, high, low, close |
| V | Volume |
| T | Verified trades count or transaction statistics |
| B | Full-universe breadth data |
| BM | Benchmark, second asset, or comparison series |
| OB | Order book, bid/ask, or intraday microstructure |
| FND | Fundamental or financial-statement data |
| M | Macro, rates, FX, inflation, or flow data |
| Overlay | Drawn on the main price chart |
| Pane | Drawn in its own synchronized indicator pane |
| Market | Market-wide table, heatmap, or breadth panel |
| Card | Single value, state, score, or portfolio metric |

Data codes may be combined. For example, PVT means price bars, volume, and verified trades count are all required.

## Canonical rule-builder contract

Every completed indicator should publish typed outputs instead of hard-coded buy and sell calls. The builder should be able to use:

- Numeric comparisons: greater than, less than, between, equal within tolerance.
- Series comparisons: value versus another indicator, price, constant, or benchmark.
- Events: crosses above, crosses below, enters zone, exits zone, state changes.
- Direction: rising, falling, flat, slope, acceleration, consecutive rises or falls.
- History: highest, lowest, average, percentile, or standard deviation over a lookback.
- Boolean composition: AND, OR, NOT, and grouped nested conditions.
- Time controls: at close, intraday interval close, for N bars, within the last N bars.

Each implementation must declare its warm-up requirement, missing-data behavior, supported timeframes, supported assets, output range, default parameters, whether it can repaint, and whether a signal is confirmed or provisional.

---

## 1. Price and return basics

All 20 Price and Return definitions are formula-verified and integrated into the Charts indicator browser, overlays, synchronized panes, parameter editing, and versioned URL persistence.

These are reusable primitives. They look simple, but they prevent every later indicator from reimplementing price transformations differently.

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| PRC-001 | Close price | The final traded price of each bar. | close | Overlay | All, P | T1 New primitive |
| PRC-002 | Open price | The first traded price of each bar. | open | Overlay | All, P | T1 New primitive |
| PRC-003 | High and low | The highest and lowest price reached in each bar. | high, low, range | Overlay | All, P | T1 New primitive |
| PRC-004 | HL2 median price | Midpoint between each bar's high and low. | hl2 | Overlay | All, P | T1 New primitive |
| PRC-005 | HLC3 typical price | Average of high, low, and close. | hlc3 | Overlay | All, P | T1 New primitive |
| PRC-006 | OHLC4 average price | Average of open, high, low, and close. | ohlc4 | Overlay | All, P | T1 New primitive |
| PRC-007 | Weighted close | Close-weighted average price for the bar. | hlcc4 | Overlay | All, P | T2 New |
| PRC-008 | Absolute change | How many price units the asset gained or lost. | change, lookback | Pane | All, P | T1 New primitive |
| PRC-009 | Percentage change | The percentage gain or loss over a chosen lookback. | return_pct, lookback | Pane | All, P | T1 New primitive |
| PRC-010 | Log return | Continuously compounded return used by quantitative indicators. | log_return, lookback | Pane | All, P | T1 New primitive |
| PRC-011 | Cumulative return | Total compounded return from a selected starting point. | cumulative_return, anchor | Pane | All, P | T1 New |
| PRC-012 | Gap percentage | Difference between today's open and the previous close. | gap_pct, direction | Pane | All, P | T1 New |
| PRC-013 | Intrabar return | Change from open to close within each bar. | body_return_pct | Pane | All, P | T2 New |
| PRC-014 | High-low range percentage | Bar range relative to price. | range_pct | Pane | All, P | T1 New |
| PRC-015 | True range | Range adjusted for overnight gaps. | true_range | Pane | All, P | T1 Internal component |
| PRC-016 | Rolling high and low | Highest or lowest value in a selected window. | highest, lowest, lookback | Overlay | All, P | T1 Internal component |
| PRC-017 | Distance from high or low | How far price sits below a rolling high or above a rolling low. | distance_pct, lookback | Pane | All, P | T1 New |
| PRC-018 | Drawdown series | Decline from the running peak at every point in time. | drawdown_pct, peak | Pane | All, P | T1 New |
| PRC-019 | Price percentile rank | Where current price sits within its recent range. | percentile_0_100, lookback | Pane | All, P | T1 New |
| PRC-020 | Rolling VWAP source | Price weighted by volume over a fixed window. | rolling_vwap, lookback | Overlay | All with V | T1 New |

## 2. Trend and moving averages

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| TRD-001 | Simple Moving Average (SMA) | Average price over a fixed number of bars. | sma, period, source | Overlay | All, P | T1 Internal only |
| TRD-002 | Exponential Moving Average (EMA) | Moving average that reacts faster to recent prices. | ema, period, source | Overlay | All, P | T1 Internal only |
| TRD-003 | Weighted Moving Average (WMA) | Moving average with linearly larger weight on recent prices. | wma, period | Overlay | All, P | T1 New |
| TRD-004 | Wilder Moving Average (RMA or SMMA) | Slow recursive average used by RSI and ATR. | rma, period | Overlay | All, P | T1 Internal component |
| TRD-005 | Double EMA (DEMA) | Reduced-lag combination of two EMAs. | dema, period | Overlay | All, P | T2 New |
| TRD-006 | Triple EMA (TEMA) | Reduced-lag combination of three EMAs. | tema, period | Overlay | All, P | T2 New |
| TRD-007 | Hull Moving Average (HMA) | Smooth trend line designed to reduce lag. | hma, period | Overlay | All, P | T2 New |
| TRD-008 | Kaufman Adaptive Moving Average (KAMA) | Speeds up in trends and slows down in noisy markets. | kama, efficiency_period, fast, slow | Overlay | All, P | T2 New |
| TRD-009 | Fractal Adaptive Moving Average (FRAMA) | Adapts to the market's fractal dimension and trend quality. | frama, period, alpha limits | Overlay | All, P | T0 Existing chart |
| TRD-010 | Variable Index Dynamic Average (VIDYA) | EMA whose speed changes with momentum or volatility. | vidya, period, momentum_period | Overlay | All, P | T3 New |
| TRD-011 | McGinley Dynamic | Adaptive average intended to follow speed changes with less lag. | mcginley, period | Overlay | All, P | T3 New |
| TRD-012 | Arnaud Legoux Moving Average (ALMA) | Gaussian-weighted average balancing smoothness and responsiveness. | alma, period, offset, sigma | Overlay | All, P | T2 New |
| TRD-013 | Least Squares Moving Average (LSMA) | End value of a rolling linear regression. | lsma, period, offset | Overlay | All, P | T2 New |
| TRD-014 | Triangular Moving Average (TMA) | Twice-smoothed SMA with strong noise reduction. | tma, period | Overlay | All, P | T2 New |
| TRD-015 | Zero-Lag EMA (ZLEMA) | EMA adjusted to compensate for estimated lag. | zlema, period | Overlay | All, P | T2 New |
| TRD-016 | Moving Average Ribbon | Several averages showing trend alignment and compression. | ribbon lines, periods, average type | Overlay | All, P | T1 New composite |
| TRD-017 | Guppy Multiple Moving Average (GMMA) | Short and long EMA groups showing trader versus investor behavior. | short ribbon, long ribbon | Overlay | All, P | T2 New |
| TRD-018 | Moving-average slope | Direction and steepness of any chosen moving average. | slope, normalized_slope, period | Pane | All, P | T1 New primitive |
| TRD-019 | Moving-average distance | Percentage distance between price and a moving average. | distance_pct, average, period | Pane | All, P | T1 New primitive |
| TRD-020 | Moving-average spread | Distance between a fast and slow moving average. | spread, spread_pct, fast, slow | Pane | All, P | T1 New primitive |
| TRD-021 | Moving-average crossover | Event when a fast average crosses a slow average. | cross_up, cross_down, fast, slow | Overlay | All, P | T1 Builder template |
| TRD-022 | Moving-average compression | Detects tightly packed averages before possible expansion. | compression_pct, periods, threshold | Pane | All, P | T2 New |
| TRD-023 | Moving-average trend score | Counts how many averages are bullishly or bearishly aligned. | score, alignment_state, periods | Pane | All, P | T2 New composite |
| TRD-024 | MACD | Difference between fast and slow EMAs with a signal line. | macd, signal, histogram, 12, 26, 9 | Pane | All, P | T1 Internal only |
| TRD-025 | Percentage Price Oscillator (PPO) | MACD expressed as a percentage for comparison across assets. | ppo, signal, histogram | Pane | All, P | T1 New |
| TRD-026 | Percentage Volume Oscillator (PVO) | Fast versus slow volume trend expressed as a percentage. | pvo, signal, histogram | Pane | All with V | T2 New |
| TRD-027 | TRIX | Momentum of a triple-smoothed EMA that filters short-term noise. | trix, signal, period | Pane | All, P | T2 Internal only |
| TRD-028 | Aroon | Measures how recently new highs and lows occurred. | aroon_up, aroon_down, oscillator, period | Pane | All, P | T1 New |
| TRD-029 | Vortex Indicator | Compares positive and negative trend movement. | vi_plus, vi_minus, period | Pane | All, P | T2 New |
| TRD-030 | Directional Movement Index (DMI) | Separates positive and negative directional pressure. | plus_di, minus_di, period | Pane | All, P | T1 Internal component |
| TRD-031 | Average Directional Index (ADX) | Measures trend strength without saying whether it is up or down. | adx, plus_di, minus_di, period | Pane | All, P | T1 Internal only |
| TRD-032 | ADX Rating (ADXR) | Smoothed ADX used to confirm persistent trend strength. | adxr, period | Pane | All, P | T2 New |
| TRD-033 | Supertrend | ATR-based trend line that flips between bullish and bearish states. | line, direction, period, multiplier | Overlay | All, P | T1 Internal component |
| TRD-034 | Parabolic SAR | Trailing stop dots that accelerate as a trend develops. | sar, direction, step, maximum | Overlay | All, P | T1 New |
| TRD-035 | Ichimoku Cloud | Multi-line trend, momentum, and support/resistance system. | tenkan, kijun, spans A/B, chikou, 9, 26, 52 | Overlay | All, P | T1 New |
| TRD-036 | Donchian Trend State | Trend state based on breaks of rolling highs and lows. | upper, lower, middle, breakout_state | Overlay | All, P | T1 New |
| TRD-037 | Chandelier Trend State | ATR-based trailing line anchored to rolling extremes. | long_stop, short_stop, period, multiplier | Overlay | All, P | T2 New |
| TRD-038 | Trend Intensity Index (TII) | Measures how consistently price stays above or below its mean. | tii_0_100, period | Pane | All, P | T2 New |
| TRD-039 | Vertical Horizontal Filter (VHF) | Distinguishes trending from ranging behavior. | vhf, period | Pane | All, P | T2 New |
| TRD-040 | Mass Index | Detects range expansion patterns that can precede trend reversals. | mass_index, ema_period, sum_period | Pane | All, P | T3 New |

## 3. Momentum and oscillators

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| MOM-001 | Relative Strength Index (RSI) | Measures recent gains versus losses on a 0–100 scale. | rsi, period, zones | Pane | All, P | T1 Internal only |
| MOM-002 | Stochastic Oscillator | Compares close to the recent high-low range. | percent_k, percent_d, period, smoothing | Pane | All, P | T1 Internal only |
| MOM-003 | Stochastic RSI | Applies stochastic normalization to RSI for faster signals. | stoch_rsi_k, stoch_rsi_d, periods | Pane | All, P | T1 New |
| MOM-004 | Commodity Channel Index (CCI) | Measures distance from a statistical mean. | cci, period, constant | Pane | All, P | T1 Internal only |
| MOM-005 | Williams Percent R | Shows where close sits in the recent range on a -100 to 0 scale. | williams_r, period | Pane | All, P | T1 Internal only |
| MOM-006 | Rate of Change (ROC) | Percentage price change over a selected number of bars. | roc_pct, period | Pane | All, P | T1 Internal only |
| MOM-007 | Momentum | Raw price difference from N bars ago. | momentum, period | Pane | All, P | T1 New |
| MOM-008 | Chande Momentum Oscillator (CMO) | Balanced sum of gains and losses on a -100 to 100 scale. | cmo, period | Pane | All, P | T2 New |
| MOM-009 | Ultimate Oscillator | Blends short, medium, and long momentum to reduce false divergences. | uo, periods 7, 14, 28, weights | Pane | All, P | T2 New |
| MOM-010 | True Strength Index (TSI) | Double-smoothed price momentum with a signal line. | tsi, signal, long, short, signal period | Pane | All, P | T2 New |
| MOM-011 | Relative Vigor Index (RVI) | Compares close-open strength to high-low range. | rvi, signal, period | Pane | All, P | T2 New |
| MOM-012 | Connors RSI | Combines short RSI, streak length, and percentile rank. | crsi, rsi period, streak period, rank period | Pane | All, P | T2 New |
| MOM-013 | Laguerre RSI | Low-lag filtered RSI designed to react smoothly. | laguerre_rsi, gamma | Pane | All, P | T3 New |
| MOM-014 | Fisher Transform | Converts range position into a near-normal oscillator that highlights turning points. | fisher, trigger, period | Pane | All, P | T2 New |
| MOM-015 | Inverse Fisher Transform | Compresses an oscillator into a bounded, fast-switching signal. | inverse_fisher, source, smoothing | Pane | All, P | T3 New |
| MOM-016 | Awesome Oscillator | Fast versus slow median-price momentum. | ao, fast, slow | Pane | All, P | T1 New |
| MOM-017 | Accelerator Oscillator | Change in Awesome Oscillator momentum. | ac | Pane | All, P | T2 New |
| MOM-018 | Klinger Volume Oscillator | Combines price trend and volume force. | kvo, signal, fast, slow | Pane | All with V | T2 New |
| MOM-019 | Know Sure Thing (KST) | Weighted blend of multiple smoothed rates of change. | kst, signal, four ROC periods | Pane | All, P | T2 New |
| MOM-020 | Coppock Curve | Long-term momentum curve traditionally used for major bottoms. | coppock, ROC periods, WMA period | Pane | All, P | T2 New |
| MOM-021 | Detrended Price Oscillator (DPO) | Removes trend to make shorter cycles easier to see. | dpo, period | Pane | All, P | T2 New |
| MOM-022 | Elder Ray Index | Bull and bear power around an EMA. | bull_power, bear_power, ema period | Pane | All, P | T2 New |
| MOM-023 | Balance of Power (BOP) | Measures buyer versus seller control within each candle. | bop, smoothing | Pane | All, P | T1 New |
| MOM-024 | Psychological Line (PSY) | Percentage of rising closes in a lookback window. | psy_0_100, period | Pane | All, P | T2 New |
| MOM-025 | Qstick | Moving average of candle bodies to estimate buying or selling pressure. | qstick, period, average type | Pane | All, P | T2 New |
| MOM-026 | Pretty Good Oscillator (PGO) | Distance from an SMA measured in ATR units. | pgo, period | Pane | All, P | T2 New |
| MOM-027 | Schaff Trend Cycle (STC) | Applies stochastic cycling to MACD for quicker trend changes. | stc, fast, slow, cycle, smoothing | Pane | All, P | T2 New |
| MOM-028 | SMI Ergodic Indicator | Smoothed momentum oscillator with a signal line. | smi, signal, long, short, signal | Pane | All, P | T2 New |
| MOM-029 | Stochastic Momentum Index (SMI) | Measures close relative to the midpoint of the recent range. | smi, signal, periods | Pane | All, P | T2 New |
| MOM-030 | Dynamic Momentum Index | RSI whose period adapts to volatility. | dmi_oscillator, min and max periods | Pane | All, P | T3 New |
| MOM-031 | Relative Momentum Index (RMI) | RSI-style momentum using multi-bar changes. | rmi, length, momentum lookback | Pane | All, P | T2 New |
| MOM-032 | Intraday Momentum Index (IMI) | RSI-style comparison of up and down candle bodies. | imi, period | Pane | All, P | T2 New |
| MOM-033 | DeMarker Indicator | Compares recent highs and lows to estimate exhaustion. | demarker, period | Pane | All, P | T2 New |
| MOM-034 | Center of Gravity Oscillator | Low-lag oscillator for possible turning points. | cog, signal, period | Pane | All, P | T3 New |
| MOM-035 | Moving Average Oscillator | Difference or percentage distance between two averages. | mao, fast, slow, average type | Pane | All, P | T1 New |
| MOM-036 | Price Oscillator | Fast versus slow price average in price units. | oscillator, fast, slow | Pane | All, P | T1 New |
| MOM-037 | Momentum percentile rank | Current momentum relative to its own recent history. | percentile_0_100, momentum period, rank period | Pane | All, P | T2 New primitive |
| MOM-038 | RSI divergence detector | Flags price and RSI moving in opposite directions between confirmed pivots. | bullish, bearish, pivot windows | Overlay | All, P | T2 New, confirmed delay |
| MOM-039 | MACD divergence detector | Flags price and MACD disagreement between confirmed pivots. | bullish, bearish, pivot windows | Overlay | All, P | T2 New, confirmed delay |
| MOM-040 | Multi-oscillator consensus | Counts bullish, bearish, overbought, and oversold agreement. | score, state, selected oscillators | Pane | All, P | T2 New composite |

## 4. Volatility, ranges, and bands

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| VOL-001 | Average True Range (ATR) | Average gap-adjusted trading range in price units. | atr, period | Pane | All, P | T1 Internal only |
| VOL-002 | ATR percentage | ATR divided by price so different assets can be compared. | atr_pct, period | Pane | All, P | T1 New |
| VOL-003 | Normalized ATR | ATR normalized against its own recent range or history. | normalized_atr, periods | Pane | All, P | T2 New |
| VOL-004 | Bollinger Bands | Moving average with standard-deviation bands. | middle, upper, lower, period, deviation | Overlay | All, P | T1 Internal only |
| VOL-005 | Bollinger Percent B | Position of price inside or outside Bollinger Bands. | percent_b | Pane | All, P | T1 Internal component |
| VOL-006 | Bollinger Bandwidth | Width of Bollinger Bands as a volatility measure. | bandwidth_pct | Pane | All, P | T1 New |
| VOL-007 | Bollinger Squeeze | Detects unusually narrow Bollinger Bands. | squeeze_state, percentile, lookback | Pane | All, P | T1 New |
| VOL-008 | Keltner Channels | EMA envelope based on ATR. | middle, upper, lower, period, multiplier | Overlay | All, P | T1 New |
| VOL-009 | TTM Squeeze style state | Compares Bollinger Bands with Keltner Channels for compression. | squeeze_on, squeeze_off, momentum | Pane | All, P | T2 New |
| VOL-010 | Donchian Channels | Rolling highest high and lowest low. | upper, lower, middle, period | Overlay | All, P | T1 New |
| VOL-011 | Price Channel | General rolling high-low channel with configurable source. | upper, lower, middle, period | Overlay | All, P | T1 New |
| VOL-012 | Standard Deviation | Dispersion of price or returns around their average. | stdev, period, source | Pane | All, P | T1 New primitive |
| VOL-013 | Historical Volatility | Annualized standard deviation of returns. | volatility_pct, period, annualization | Pane | All, P | T1 New |
| VOL-014 | Parkinson Volatility | Range-based volatility using high and low prices. | volatility_pct, period | Pane | All, P | T2 New |
| VOL-015 | Garman-Klass Volatility | Uses open, high, low, and close for efficient volatility estimation. | volatility_pct, period | Pane | All, P | T2 New |
| VOL-016 | Rogers-Satchell Volatility | OHLC volatility estimator that tolerates price drift. | volatility_pct, period | Pane | All, P | T3 New |
| VOL-017 | Yang-Zhang Volatility | Combines overnight gaps and intraday movement. | volatility_pct, period | Pane | All, P | T3 New |
| VOL-018 | Chaikin Volatility | Rate of change of an EMA of the high-low range. | chaikin_volatility, ema period, ROC period | Pane | All, P | T2 New |
| VOL-019 | Relative Volatility Index (RVI) | RSI-like measure built from directional volatility. | rvi_0_100, period | Pane | All, P | T2 New |
| VOL-020 | Ulcer Index | Depth and duration of downside drawdowns. | ulcer_index, period | Pane | All, P | T2 New |
| VOL-021 | Choppiness Index | Measures whether price is ranging or trending. | choppiness_0_100, period | Pane | All, P | T1 New |
| VOL-022 | Volatility percentile | Current volatility relative to its own history. | percentile_0_100, short period, rank period | Pane | All, P | T1 New |
| VOL-023 | Volatility regime | Labels low, normal, high, or extreme volatility. | state, thresholds, period | Pane | All, P | T2 New composite |
| VOL-024 | Range Expansion Index (REI) | Measures directional range expansion and exhaustion. | rei, period | Pane | All, P | T3 New |
| VOL-025 | Average Daily Range (ADR) | Average high-low movement over daily bars. | adr, adr_pct, period | Pane | All, P | T1 New |
| VOL-026 | Expected move from volatility | Translates historical volatility into an expected price range. | upper, lower, confidence, horizon | Overlay | All, P | T2 New |
| VOL-027 | ATR trailing stop | A stop line that follows price by an ATR multiple. | stop_line, direction, period, multiplier | Overlay | All, P | T1 Internal component |
| VOL-028 | Chandelier Exit | Trailing exits based on rolling extremes and ATR. | long_exit, short_exit, period, multiplier | Overlay | All, P | T2 New |
| VOL-029 | Volatility Stop | Trend-following stop that flips after price crosses an ATR stop. | stop, state, period, multiplier | Overlay | All, P | T2 New |
| VOL-030 | Highest-lowest range ratio | Current bar or window range versus its longer-term norm. | expansion_ratio, short, long | Pane | All, P | T2 New |
| VOL-031 | Gap volatility | Frequency and size distribution of opening gaps. | average_gap, positive_gap, negative_gap, period | Pane | All, P | T2 New |
| VOL-032 | Realized semivolatility | Separates volatility on positive and negative returns. | upside_vol, downside_vol, period | Pane | All, P | T3 New |

## 5. Volume, liquidity, and money flow

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| FLW-001 | Raw volume | Number of shares or units traded in each bar. | volume | Pane | Assets with V | T1 New primitive |
| FLW-002 | Volume moving average | Normal participation level over a selected period. | volume_ma, period | Pane | Assets with V | T1 New |
| FLW-003 | Relative Volume (RVOL) | Current volume divided by its recent average. | rvol_ratio, period | Pane | Assets with V | T1 New |
| FLW-004 | Volume percentile | Current volume relative to its own historical distribution. | percentile_0_100, period | Pane | Assets with V | T2 New |
| FLW-005 | Volume Rate of Change | How quickly volume is expanding or contracting. | volume_roc_pct, period | Pane | Assets with V | T1 New |
| FLW-006 | On-Balance Volume (OBV) | Cumulative volume added on up closes and removed on down closes. | obv, smoothing | Pane | Assets with V | T1 Internal only |
| FLW-007 | Accumulation/Distribution Line | Cumulative volume weighted by where close sits in the bar. | ad_line | Pane | Assets with V | T1 New |
| FLW-008 | Chaikin Money Flow (CMF) | Buying or selling pressure over a rolling period. | cmf, period | Pane | Assets with V | T1 New |
| FLW-009 | Chaikin Oscillator | Fast versus slow EMA of the Accumulation/Distribution Line. | oscillator, fast, slow | Pane | Assets with V | T2 New |
| FLW-010 | Money Flow Index (MFI) | Volume-weighted RSI-style oscillator. | mfi_0_100, period | Pane | Assets with V | T1 Internal only |
| FLW-011 | Volume Price Trend (VPT) | Cumulative volume adjusted by percentage price changes. | vpt | Pane | Assets with V | T1 New |
| FLW-012 | Positive Volume Index (PVI) | Tracks price behavior on higher-volume days. | pvi, signal | Pane | Assets with V | T2 New |
| FLW-013 | Negative Volume Index (NVI) | Tracks price behavior on lower-volume days. | nvi, signal | Pane | Assets with V | T2 New |
| FLW-014 | Ease of Movement (EOM) | Price movement relative to volume and trading range. | eom, smoothed_eom, period | Pane | Assets with V | T2 New |
| FLW-015 | Force Index | Price change multiplied by volume. | force_index, period | Pane | Assets with V | T1 Internal only |
| FLW-016 | Elder Force Index | Smoothed Force Index for trend confirmation. | force, ema period | Pane | Assets with V | T2 New |
| FLW-017 | Price Volume Trend divergence | Confirmed disagreement between price and VPT or OBV. | bullish, bearish, pivot windows | Overlay | Assets with V | T2 New, confirmed delay |
| FLW-018 | VWAP | Session price weighted by traded volume. | vwap, anchor or session | Overlay | Intraday assets with V | T1 New |
| FLW-019 | Anchored VWAP | VWAP starting from a user-selected event or date. | avwap, anchor | Overlay | Assets with V | T1 New |
| FLW-020 | Rolling VWAP | Fixed-window volume-weighted average price. | rolling_vwap, period | Overlay | Assets with V | T1 New |
| FLW-021 | VWAP bands | Standard-deviation or percentage envelopes around VWAP. | upper, lower, deviations | Overlay | Assets with V | T2 New |
| FLW-022 | Volume Weighted Moving Average (VWMA) | Moving average that gives more weight to high-volume bars. | vwma, period | Overlay | Assets with V | T1 New |
| FLW-023 | Volume Profile | Volume distributed across price levels in a chosen range. | price bins, POC, value area | Overlay | Assets with V | T2 New |
| FLW-024 | Visible Range Volume Profile | Volume profile calculated for the currently visible chart window. | POC, VAH, VAL, bins | Overlay | Assets with V | T2 New |
| FLW-025 | Fixed Range Volume Profile | Volume profile between two selected dates. | POC, VAH, VAL, bins | Overlay | Assets with V | T2 New |
| FLW-026 | Time Price Opportunity profile | Time spent at each price level rather than volume. | POC, value area, letters or bins | Overlay | All, P | T3 New |
| FLW-027 | Average Trade Size | Turnover divided by verified number of trades. | ats, average_ats, ratio | Pane | EGX equities, PVT | T0 Existing chart |
| FLW-028 | Smart Money Flow | Combines ATS, volume, spread, and close location into accumulation/distribution states. | ATS, absorption, state, markers | Pane | EGX equities, PVT | T0 Existing chart |
| FLW-029 | Turnover | Traded value calculated from price and volume. | turnover, rolling_turnover | Pane | Assets with V | T1 New primitive |
| FLW-030 | Turnover velocity | Turnover relative to free float or shares outstanding. | turnover_ratio, period | Pane | Equities, V and FND | R Data-gated |
| FLW-031 | Amihud Illiquidity | Absolute return divided by traded value. | illiquidity, period | Pane | Assets with V | T3 New |
| FLW-032 | Volume-synchronized probability of informed trading proxy | Estimates unusual directional volume imbalance. | vpin_proxy, bucket size | Pane | Intraday, OB or granular V | R Research |
| FLW-033 | Bid-ask spread | Immediate transaction cost and liquidity measure. | spread, spread_bps | Pane | Intraday, OB | R Data-gated |
| FLW-034 | Order Book Imbalance | Compares displayed bid and ask liquidity. | imbalance, depth levels | Pane | Intraday, OB | R Data-gated |
| FLW-035 | Cumulative Volume Delta | Difference between buyer-initiated and seller-initiated volume. | delta, cumulative_delta | Pane | Intraday trades, OB | R Data-gated |
| FLW-036 | Trade intensity | Number of trades per minute or bar relative to normal. | trades_rate, relative_rate | Pane | EGX equities, T | T2 New |
| FLW-037 | Block trade detector | Flags unusually large trades relative to the asset's distribution. | block_event, size_percentile | Overlay | Trade-level data | R Data-gated |
| FLW-038 | Absorption ratio | High volume with limited price range, separated by close direction. | absorption, state, periods | Pane | Assets with V | T1 Existing component |

## 6. Support, resistance, and market structure

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| STR-001 | Confirmed pivot highs and lows | Local turning points confirmed after bars appear on both sides. | pivot_high, pivot_low, left, right | Overlay | All, P | T1 New primitive, delayed |
| STR-002 | Swing Mapper | Maps directional swings using an adaptive range threshold. | swing_high, swing_low, direction | Overlay | All, P | T0 Existing chart |
| STR-003 | Zig Zag | Filters price moves smaller than a chosen percentage or ATR threshold. | pivots, legs, change_pct | Overlay | All, P | T1 New, repaint-aware |
| STR-004 | Ticknal Support and Resistance | Adaptive step channels, clustered zones, and trendline channels. | levels, zones, trend lines | Overlay | All, P | T0 Existing chart |
| STR-005 | Classic Pivot Points | Previous-period support and resistance from high, low, and close. | pivot, S1–S5, R1–R5 | Overlay | All, P | T1 New |
| STR-006 | Fibonacci Pivot Points | Pivot levels using Fibonacci ratios. | pivot, Fibonacci supports and resistances | Overlay | All, P | T2 New |
| STR-007 | Camarilla Pivot Points | Close-focused intraday support and resistance levels. | H1–H6, L1–L6 | Overlay | All, P | T2 New |
| STR-008 | Woodie Pivot Points | Pivot system giving extra weight to the current open. | pivot, supports, resistances | Overlay | All, P | T2 New |
| STR-009 | DeMark Pivot Points | Conditional pivot calculation based on open-close relationship. | pivot, support, resistance | Overlay | All, P | T2 New |
| STR-010 | Fibonacci Retracement | Retracement levels between two selected or confirmed swing points. | levels 23.6–78.6, anchors | Overlay | All, P | T1 New |
| STR-011 | Fibonacci Extension | Potential targets beyond a completed swing. | levels 127.2, 161.8, 261.8 | Overlay | All, P | T2 New |
| STR-012 | Auto Fibonacci | Automatically anchors Fibonacci levels to confirmed swings. | levels, selected anchors | Overlay | All, P | T2 New, confirmed delay |
| STR-013 | Rolling support and resistance | Highest and lowest prices over a rolling window. | support, resistance, midpoint | Overlay | All, P | T1 New |
| STR-014 | Touch-count price zones | Clusters levels that price repeatedly tested. | zone center, width, touches, strength | Overlay | All, P | T2 Existing component |
| STR-015 | ATR support and resistance zones | Expands levels into zones using volatility. | upper and lower zone bounds, multiplier | Overlay | All, P | T2 New |
| STR-016 | Trendlines from pivots | Connects confirmed higher lows or lower highs. | upper and lower trendlines, slope | Overlay | All, P | T2 Existing component |
| STR-017 | Linear Regression Channel | Trend line with statistical deviation bands. | regression, upper, lower, slope, R squared | Overlay | All, P | T1 New |
| STR-018 | Raff Regression Channel | Regression trend with bands set by maximum deviation. | center, upper, lower | Overlay | All, P | T3 New |
| STR-019 | Andrews Pitchfork | Median-line structure from three confirmed pivots. | median and parallel lines | Overlay | All, P | T3 New, anchor dependent |
| STR-020 | Break of Structure (BOS) | Price breaks a previous confirmed swing high or low. | bullish_bos, bearish_bos, level | Overlay | All, P | T1 New |
| STR-021 | Change of Character (CHoCH) | First structural break against the existing swing direction. | bullish_choch, bearish_choch | Overlay | All, P | T2 New |
| STR-022 | Higher-high and higher-low state | Labels bullish, bearish, or mixed swing sequences. | HH, HL, LH, LL, trend_state | Overlay | All, P | T1 New |
| STR-023 | Consolidation range | Detects tight price ranges lasting a minimum number of bars. | upper, lower, duration, width | Overlay | All, P | T1 New |
| STR-024 | Range breakout | Event when price closes outside a confirmed consolidation. | breakout_up, breakout_down, level | Overlay | All, P | T1 New |
| STR-025 | Opening range | High and low of the first selected minutes or bars. | OR high, OR low, breakout | Overlay | Intraday, P | T2 New |
| STR-026 | Previous period levels | Previous day, week, month, or year OHLC levels. | prior OHLC levels | Overlay | All, P | T1 New |
| STR-027 | All-time and 52-week levels | Distance to major long-term highs and lows. | high, low, distance_pct | Overlay | All, P | T1 New |
| STR-028 | Fair Value Gap | Three-candle price imbalance zone. | bullish and bearish zones, fill state | Overlay | All, P | T3 New |
| STR-029 | Price gap zones | Untraded areas between one bar's range and the next. | gap bounds, fill_pct, state | Overlay | All, P | T2 New |
| STR-030 | Supply and demand zones | Impulsive departures from compact bases, scored by freshness and reaction. | zones, direction, strength | Overlay | All, P | T3 Research |
| STR-031 | Order block heuristic | Last opposing candle before a structural impulse. | zone, direction, invalidation | Overlay | All, P | R Research, subjective definition |
| STR-032 | Market structure score | Combines swing direction, breaks, distance from levels, and range state. | score, bullish, bearish, neutral | Pane | All, P | T2 New composite |

## 7. Cycles and signal processing

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| CYC-001 | Even Better Sinewave | Ehlers cycle filter for low-lag turning points and cycle projection. | wave, projected line, reversal events | Pane or Overlay | All, P | T0 Existing chart |
| CYC-002 | Ehlers Sinewave | Estimates cycle phase using dominant-cycle processing. | sine, lead_sine, phase | Pane | All, P | T3 New |
| CYC-003 | Hilbert Transform Dominant Cycle Period | Estimates the market's current dominant cycle length. | dominant_period | Pane | All, P | T3 New |
| CYC-004 | Hilbert Transform Trend Mode | Distinguishes cycle mode from trend mode. | trend_mode, cycle_mode | Pane | All, P | T3 New |
| CYC-005 | MESA Adaptive Moving Average (MAMA) | Adaptive average driven by estimated market phase. | mama, fama, cross events | Overlay | All, P | T3 New |
| CYC-006 | Cyber Cycle | Recursive cycle oscillator designed by John Ehlers. | cycle, trigger, period | Pane | All, P | T3 New |
| CYC-007 | Roofing Filter | Removes long trends and high-frequency noise to isolate tradable cycles. | filtered_series, high-pass, low-pass periods | Pane | All, P | T3 New |
| CYC-008 | Super Smoother Filter | Low-lag digital low-pass filter. | smoothed_series, period, poles | Overlay | All, P | T2 New primitive |
| CYC-009 | Two-pole High-Pass Filter | Removes slow trend components from price. | high_pass, period | Pane | All, P | T3 New primitive |
| CYC-010 | Band-Pass Filter | Isolates movement near a selected cycle period. | band_pass, trigger, period, bandwidth | Pane | All, P | T3 New |
| CYC-011 | Decycler | Removes shorter cycles to expose underlying trend. | decycler, period | Overlay | All, P | T3 New |
| CYC-012 | Decycler Oscillator | Difference between price and its decycled trend. | oscillator, period | Pane | All, P | T3 New |
| CYC-013 | Instantaneous Trendline | Low-lag Ehlers trendline estimate. | itrend, trigger | Overlay | All, P | T3 New |
| CYC-014 | Autocorrelation Periodogram | Estimates dominant cycles through rolling autocorrelation power. | power spectrum, dominant_period | Pane | All, P | T3 New |
| CYC-015 | Fourier dominant cycle | Estimates strongest periodic components with a rolling Fourier transform. | dominant periods, amplitudes, phases | Pane | All, P | R Research |
| CYC-016 | Goertzel Cycle Detector | Efficiently measures power at selected cycle frequencies. | power by period, dominant period | Pane | All, P | R Research |
| CYC-017 | Wavelet energy | Separates short, medium, and long horizon movement. | scale energies, dominant scale | Pane | All, P | R Research |
| CYC-018 | Hodrick-Prescott trend and cycle | Separates smooth trend from cyclical deviation. | trend, cycle, lambda | Pane | All, P | R Research, endpoint sensitivity |
| CYC-019 | Baxter-King cycle filter | Band-pass economic cycle filter. | cycle_component, periods | Pane | Long macro series, M | R Research |
| CYC-020 | Christiano-Fitzgerald filter | Flexible band-pass filter for trend-cycle separation. | trend, cycle, periods | Pane | Long macro series, M | R Research |
| CYC-021 | Seasonal return profile | Average return by weekday, month, or trading-session segment. | seasonal_mean, win_rate, sample_count | Market | All, P | T2 New |
| CYC-022 | Ramadan and holiday seasonality | Egyptian-market return and volume behavior around local calendar events. | average return, volume ratio, sample count | Market | EGX, calendar and P | R Research |
| CYC-023 | Cycle phase state | Converts a cycle oscillator into rising, peak, falling, and trough states. | phase_state, phase_angle | Pane | All, P | T2 New primitive |
| CYC-024 | Filter bank consensus | Agreement across several cycle periods or digital filters. | score, dominant horizon, state | Pane | All, P | R Research composite |

## 8. Statistical, quantitative, and regime indicators

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| QNT-001 | Z-score | Number of standard deviations a value is from its rolling mean. | z_score, period, source | Pane | All, P | T1 New primitive |
| QNT-002 | Rolling mean and variance | Local average and dispersion used by many quantitative rules. | mean, variance, period | Pane | All, P | T1 New primitive |
| QNT-003 | Rolling median and MAD | Robust center and dispersion less affected by outliers. | median, MAD, robust_z, period | Pane | All, P | T2 Internal component |
| QNT-004 | Percentile rank | Position of a value inside its own rolling history. | percentile_0_100, period | Pane | All, P | T1 New primitive |
| QNT-005 | Rolling skewness | Whether return distribution has a longer upside or downside tail. | skewness, period | Pane | All, P | T3 New |
| QNT-006 | Rolling kurtosis | Whether extreme returns are unusually frequent. | kurtosis, excess_kurtosis, period | Pane | All, P | T3 New |
| QNT-007 | Rolling correlation | Strength and direction of co-movement with another asset. | correlation, period, second series | Pane | All, P and BM | T1 New |
| QNT-008 | Rolling covariance | Joint variability between two return series. | covariance, period | Pane | All, P and BM | T2 New |
| QNT-009 | Rolling beta | Sensitivity of an asset to a benchmark. | beta, alpha, period, benchmark | Pane | All, P and BM | T1 New |
| QNT-010 | Rolling alpha | Return unexplained by benchmark beta over a rolling window. | alpha_pct, period, benchmark | Pane | All, P and BM | T2 New |
| QNT-011 | Linear regression slope | Rate and direction of a fitted trend. | slope, intercept, period | Pane | All, P | T1 New |
| QNT-012 | Regression R-squared | How closely price follows a linear trend. | r_squared, period | Pane | All, P | T1 New |
| QNT-013 | Regression residual Z-score | Unusual distance from a fitted trend. | residual, z_score, period | Pane | All, P | T2 New |
| QNT-014 | Kalman Adaptive Velocity | Recursive estimate of fair value, latent velocity, and innovation shocks. | mean, velocity, bands, shock_z | Overlay | All, P | T0 Existing chart |
| QNT-015 | Kalman trend state | Converts Kalman velocity and uncertainty into trend regimes. | direction, confidence, velocity | Pane | All, P | T2 Existing component |
| QNT-016 | Hurst Exponent | Estimates whether behavior is trending, random, or mean-reverting. | hurst, state, period | Pane | All, P | T3 New |
| QNT-017 | Variance Ratio | Tests whether returns resemble a random walk across horizons. | variance_ratio, horizon | Pane | All, P | T3 New |
| QNT-018 | Augmented Dickey-Fuller state | Rolling stationarity test for possible mean reversion. | test statistic, p-value, stationary | Pane | All, P | R Research |
| QNT-019 | Half-life of mean reversion | Estimated time for a deviation to decay by half. | half_life, AR coefficient | Pane | All, P | T3 New |
| QNT-020 | Permutation Entropy | Measures order versus randomness in price sequences. | entropy, regime, adaptive channel | Pane | All, P | T0 Existing chart |
| QNT-021 | Shannon Entropy | Information content of discretized returns. | entropy, normalized_entropy, period | Pane | All, P | T3 New |
| QNT-022 | Sample Entropy | Measures repetitiveness and complexity in a time series. | sample_entropy, dimension, tolerance | Pane | All, P | R Research |
| QNT-023 | Approximate Entropy | Measures regularity of sequential observations. | approximate_entropy, parameters | Pane | All, P | R Research |
| QNT-024 | Fractal Dimension Index | Estimates whether price is smooth and trending or rough and noisy. | dimension_1_2, period | Pane | All, P | T3 New |
| QNT-025 | Detrended Fluctuation Analysis | Long-memory and scaling estimate robust to local trends. | scaling_exponent, period | Pane | All, P | R Research |
| QNT-026 | Rescaled Range Analysis | Classic long-memory statistic related to the Hurst exponent. | R over S, hurst estimate | Pane | All, P | R Research |
| QNT-027 | Change-point detector | Flags statistically meaningful shifts in mean or variance. | change_event, score, state | Pane | All, P | T3 New |
| QNT-028 | CUSUM Filter | Accumulates deviations to detect structural moves. | positive_cusum, negative_cusum, event | Pane | All, P | T3 New |
| QNT-029 | Bayesian Online Change Point | Probability that a new market regime has begun. | change_probability, run_length | Pane | All, P | R Research |
| QNT-030 | Hidden Markov regime | Probabilistic bull, bear, calm, or volatile state. | state probabilities, active state | Pane | All, P | R Research |
| QNT-031 | Gaussian Mixture regime | Clusters return and volatility observations into regimes. | cluster, probabilities | Pane | All, P | R Research |
| QNT-032 | Mahalanobis anomaly score | Multivariate distance from normal market conditions. | anomaly_score, percentile | Pane | All, multiple indicators | R Research |
| QNT-033 | Rolling Sharpe signal | Recent excess return per unit of volatility. | rolling_sharpe, period, risk-free rate | Pane | All, P and M | T2 New |
| QNT-034 | Rolling Sortino signal | Recent excess return per unit of downside volatility. | rolling_sortino, period, target return | Pane | All, P | T2 New |
| QNT-035 | Trend quality score | Combines slope, R-squared, persistence, and volatility. | score_0_100, state | Pane | All, P | T2 New composite |
| QNT-036 | Mean-reversion score | Combines stationarity, half-life, Z-score, and entropy. | score_0_100, direction | Pane | All, P | T3 New composite |
| QNT-037 | HYDRA Binary Index | Proprietary adaptive regime state and continuous curve. | binary state, continuous value, markers | Pane | EGX equities, P | T0 Existing chart |
| QNT-038 | Ensemble regime consensus | Agreement across trend, volatility, entropy, and change-point states. | regime, confidence, component votes | Pane | All, P | R Research composite |

## 9. Market breadth and participation

These require a synchronized universe snapshot, survivorship-aware membership, and explicit handling of unchanged or suspended securities.

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| BRD-001 | Advance-Decline Line | Cumulative number of advancing stocks minus declining stocks. | AD line, daily net advances | Market | EGX universe, B | T1 New |
| BRD-002 | Advance-Decline Ratio | Advancers divided by decliners. | AD ratio | Market | EGX universe, B | T1 New |
| BRD-003 | Advance-Decline Percent | Net advances as a percentage of active stocks. | AD percent | Market | EGX universe, B | T1 New |
| BRD-004 | Up-Down Volume | Advancing volume versus declining volume. | up volume, down volume, net volume | Market | EGX universe, BV | T1 New |
| BRD-005 | Up-Down Volume Ratio | Advancing volume divided by declining volume. | volume ratio | Market | EGX universe, BV | T1 New |
| BRD-006 | Arms Index (TRIN) | Advance-decline ratio adjusted by up-down volume. | TRIN | Market | EGX universe, BV | T2 New |
| BRD-007 | McClellan Oscillator | Smoothed net advances showing breadth momentum. | oscillator, fast, slow | Pane | EGX universe, B | T2 New |
| BRD-008 | McClellan Summation Index | Cumulative breadth trend from the McClellan Oscillator. | summation_index | Pane | EGX universe, B | T2 New |
| BRD-009 | New Highs-New Lows | Difference between stocks making new highs and new lows. | net highs, highs, lows, lookback | Market | EGX universe, B | T1 New |
| BRD-010 | High-Low Logic Index | Identifies unusual simultaneous new highs and lows. | logic_index | Market | EGX universe, B | T3 New |
| BRD-011 | Percent Above Moving Average | Share of stocks above a chosen SMA or EMA. | percent_above, period | Market | EGX universe, B | T1 New |
| BRD-012 | Bullish Percent Index | Share of stocks with bullish point-and-figure states. | bullish_percent | Market | EGX universe, B | T3 New |
| BRD-013 | Breadth Thrust | Sudden shift from weak to broad participation. | thrust_value, trigger event | Pane | EGX universe, B | T2 New |
| BRD-014 | Zweig Breadth Thrust | Ten-day smoothed advance ratio with classic thrust thresholds. | ZBT, trigger | Pane | EGX universe, B | T2 New |
| BRD-015 | Absolute Breadth Index | Absolute difference between advancing and declining issues. | ABI | Market | EGX universe, B | T2 New |
| BRD-016 | Breadth Momentum | Rate of change of advance-decline participation. | breadth_roc, period | Pane | EGX universe, B | T2 New |
| BRD-017 | Sector Breadth | Participation measures calculated separately for each EGX sector. | AD percent, percent above MA, highs-lows | Market | EGX sectors, B | T1 New |
| BRD-018 | Index Participation Score | Percentage of index members confirming the index direction. | score_0_100, confirmed_count | Market | EGX index membership, B | T1 New |
| BRD-019 | Equal-Weight versus Cap-Weight Spread | Shows whether large stocks or the broader market lead. | return_spread, trend | Pane | EGX universe, B | T2 New |
| BRD-020 | Median Stock Return | Typical constituent return, less distorted by the largest names. | median_return, horizon | Market | EGX universe, B | T1 New |
| BRD-021 | Cross-sectional dispersion | Spread of constituent returns across the market. | dispersion, percentile | Market | EGX universe, B | T2 New |
| BRD-022 | Market Concentration | Share of index move or market cap controlled by top constituents. | top 5 and top 10 concentration, HHI | Market | EGX universe, B | T2 Existing adjacent data |
| BRD-023 | Breadth Divergence | Index makes a new high or low without matching breadth. | bullish, bearish divergence | Overlay | EGX index and B | T2 New |
| BRD-024 | Volume Breadth Divergence | Index direction disagrees with up-down volume. | bullish, bearish divergence | Pane | EGX universe, BV | T2 New |
| BRD-025 | Participation Regime | Composite state from advances, volume, highs-lows, and MA breadth. | broad bull, narrow bull, broad bear, narrow bear | Market | EGX universe, B | T2 New composite |

## 10. Relative strength and intermarket analysis

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| REL-001 | Price Ratio | One asset divided by another to show relative performance. | ratio, normalized ratio | Pane | All, P and BM | T1 New primitive |
| REL-002 | Relative Strength versus Benchmark | Asset return minus benchmark return. | relative_return, period, benchmark | Pane | All, P and BM | T1 New |
| REL-003 | Relative Strength Line | Cumulative asset-to-benchmark ratio. | RS line, new high event | Pane | All, P and BM | T1 New |
| REL-004 | Relative Strength Momentum | Rate of change of the relative-strength line. | RS momentum, period | Pane | All, P and BM | T2 New |
| REL-005 | Mansfield Relative Strength | Relative performance normalized around its long-term average. | Mansfield RS, period | Pane | Equities and sectors, BM | T2 New |
| REL-006 | Relative Rotation Graph metrics | Relative strength and momentum coordinates versus a benchmark. | JdK RS-ratio, RS-momentum, quadrant | Market | Sectors or assets, BM | T2 New |
| REL-007 | Cross-sectional momentum rank | Ranks all eligible assets by recent return. | rank, percentile, universe | Market | EGX universe, B | T1 New |
| REL-008 | Risk-adjusted momentum rank | Ranks return after accounting for volatility or drawdown. | rank, score, periods | Market | EGX universe, B | T2 New |
| REL-009 | Dual Momentum | Combines absolute positive momentum with benchmark-relative momentum. | absolute state, relative rank | Market | All, BM | T2 New |
| REL-010 | Sector Relative Strength | Sector performance versus EGX30, EGX70, or the full market. | ratio, return spread, rank | Market | EGX sectors, BM | T1 New |
| REL-011 | Rolling Correlation Matrix | Pairwise co-movement between selected assets. | correlations, clusters | Market | Multiple assets, BM | T2 New |
| REL-012 | Rolling Beta Matrix | Sensitivity of assets or sectors to a benchmark. | betas, period | Market | Multiple assets, BM | T2 New |
| REL-013 | Lead-Lag Correlation | Tests whether one series tends to move before another. | best lag, correlation by lag | Pane | Two assets, BM | T3 New |
| REL-014 | Cointegration Spread | Residual spread between a statistically linked pair. | hedge ratio, spread, z-score | Pane | Two assets, BM | T3 New |
| REL-015 | Pair Ratio Z-score | Standardized asset ratio for relative-value monitoring. | ratio, z-score, period | Pane | Two assets, BM | T2 New |
| REL-016 | EGX versus Gold Relative Strength | Local equities compared with EGP gold performance. | ratio, return spread, trend | Pane | EGX and local gold, BM | T2 New |
| REL-017 | EGX versus USD Relative Strength | Local equities compared with USD/EGP depreciation. | real and nominal relative return | Pane | EGX and FX, BM | T2 New |
| REL-018 | Fund versus Benchmark Attribution | Fund performance relative to its declared benchmark. | excess return, beta, tracking error | Card | Funds, BM | T2 New |
| REL-019 | Currency-adjusted return | Converts an asset return into EGP, USD, or real purchasing-power terms. | adjusted_return, selected currency | Pane | All, P and M | T1 New |
| REL-020 | Inflation-adjusted return | Nominal return minus or deflated by Egyptian inflation. | real_return, annualized_real_return | Pane | All, P and M | T1 Existing adjacent logic |

## 11. Risk, performance, and portfolio indicators

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| RSK-001 | Simple return | Gain or loss over a chosen period. | return_pct, horizon | Card | All, P | T1 New primitive |
| RSK-002 | Annualized return | Return translated into a yearly rate. | annualized_return | Card | All, P | T1 New |
| RSK-003 | Compound Annual Growth Rate (CAGR) | Smoothed annual growth from start to end. | CAGR | Card | All, P | T1 Existing strategy metric |
| RSK-004 | Maximum Drawdown | Largest peak-to-trough loss. | max_drawdown_pct, dates, duration | Card | All, P | T1 Existing strategy metric |
| RSK-005 | Current Drawdown | Present decline from the most recent peak. | current_drawdown, duration | Card | All, P | T1 New |
| RSK-006 | Drawdown Duration | Time spent below a previous peak. | current and maximum duration | Card | All, P | T2 New |
| RSK-007 | Volatility | Annualized variability of returns. | volatility_pct, period | Card | All, P | T1 New |
| RSK-008 | Downside Deviation | Variability of returns below a target. | downside_deviation, target | Card | All, P | T1 New |
| RSK-009 | Sharpe Ratio | Excess return per unit of total volatility. | Sharpe, risk-free rate, period | Card | All, P and M | T1 Existing strategy metric |
| RSK-010 | Sortino Ratio | Excess return per unit of downside volatility. | Sortino, target return | Card | All, P | T1 New |
| RSK-011 | Calmar Ratio | Annual return divided by maximum drawdown. | Calmar | Card | All, P | T2 New |
| RSK-012 | Omega Ratio | Probability-weighted gains versus losses around a threshold. | Omega, threshold | Card | All, P | T3 New |
| RSK-013 | Information Ratio | Active return per unit of tracking error. | information_ratio, benchmark | Card | All, P and BM | T2 New |
| RSK-014 | Treynor Ratio | Excess return per unit of market beta. | Treynor, beta, risk-free rate | Card | All, P, BM, M | T3 New |
| RSK-015 | Jensen Alpha | Risk-adjusted excess return versus CAPM expectation. | alpha, beta, risk-free rate | Card | All, P, BM, M | T2 New |
| RSK-016 | Tracking Error | Volatility of returns versus a benchmark. | tracking_error | Card | Funds and portfolios, BM | T1 New |
| RSK-017 | Value at Risk (Historical VaR) | Loss threshold exceeded only at a chosen probability. | VaR, confidence, horizon | Card | All, P | T2 New |
| RSK-018 | Parametric VaR | Normal-distribution estimate of a loss threshold. | VaR, confidence, horizon | Card | All, P | T3 New with caveat |
| RSK-019 | Conditional VaR or Expected Shortfall | Average loss beyond the VaR threshold. | CVaR, confidence | Card | All, P | T2 New |
| RSK-020 | Maximum Adverse Excursion | Worst move against each historical trade. | MAE, average MAE | Card | Strategies, trade history | T1 Existing strategy metric |
| RSK-021 | Maximum Favorable Excursion | Best move in favor of each historical trade. | MFE, average MFE | Card | Strategies, trade history | T1 Existing strategy metric |
| RSK-022 | Profit Factor | Gross strategy gains divided by gross strategy losses. | profit_factor | Card | Strategies, trade history | T1 Existing strategy metric |
| RSK-023 | Win Rate | Percentage of completed trades that were profitable. | win_rate, sample_count | Card | Strategies, trade history | T1 Existing strategy metric |
| RSK-024 | Expectancy | Average expected profit or loss per trade. | expectancy amount and pct | Card | Strategies, trade history | T1 New |
| RSK-025 | Payoff Ratio | Average win divided by average loss. | payoff_ratio | Card | Strategies, trade history | T1 Existing adjacent metric |
| RSK-026 | Kelly Fraction | Theoretical capital fraction based on win rate and payoff. | full and fractional Kelly | Card | Strategies, trade history | T3 New with strong warning |
| RSK-027 | Risk of Ruin | Estimated probability of breaching a capital-loss threshold. | probability, assumptions | Card | Strategies, trade history | T3 New |
| RSK-028 | Ulcer Performance Index | Excess return divided by the Ulcer Index. | UPI | Card | All, P | T3 New |
| RSK-029 | Gain-to-Pain Ratio | Sum of returns divided by absolute losses. | gain_to_pain | Card | All, P | T2 New |
| RSK-030 | Recovery Factor | Net profit divided by maximum drawdown. | recovery_factor | Card | Strategies and portfolios | T2 New |
| RSK-031 | Portfolio Beta | Weighted sensitivity of the portfolio to a benchmark. | beta, component contributions | Card | Portfolio, BM | T2 New |
| RSK-032 | Marginal Risk Contribution | Each holding's contribution to total portfolio volatility. | marginal and percentage contribution | Card | Portfolio, covariance data | T3 New |
| RSK-033 | Concentration and HHI | How concentrated the portfolio is in positions, sectors, or currencies. | HHI, effective holdings | Card | Portfolio | T1 New |
| RSK-034 | Diversification Ratio | Weighted asset volatility divided by portfolio volatility. | diversification_ratio | Card | Portfolio, covariance data | T3 New |
| RSK-035 | Correlation Stress | Portfolio risk under elevated cross-asset correlation. | stressed_volatility, delta risk | Card | Portfolio | R Research |
| RSK-036 | Inflation drag | Nominal value lost to Egyptian inflation over time. | real value, drag amount, drag pct | Card | Portfolio, M | T0 Existing adjacent feature |

## 12. Candlestick and price-action signals

These should be implemented as confirmed boolean events with configurable trend and volume filters. Pattern names alone must never be presented as guaranteed predictions.

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| PAT-001 | Candle Anatomy | Body, upper wick, lower wick, and range proportions. | body_pct, wick ratios, direction | Pane | All, P | T1 New primitive |
| PAT-002 | Doji family | Candle with a very small body relative to its range. | doji, long-legged, dragonfly, gravestone | Overlay | All, P | T1 New |
| PAT-003 | Hammer and Hanging Man | Small body with a long lower wick, interpreted using context. | hammer, hanging_man | Overlay | All, P | T1 New |
| PAT-004 | Inverted Hammer and Shooting Star | Small body with a long upper wick, interpreted using context. | inverted_hammer, shooting_star | Overlay | All, P | T1 New |
| PAT-005 | Bullish and Bearish Engulfing | Current body fully covers the previous opposing body. | bullish, bearish event | Overlay | All, P | T1 New |
| PAT-006 | Harami | Small body contained inside the previous large body. | bullish, bearish event | Overlay | All, P | T2 New |
| PAT-007 | Piercing Line and Dark Cloud Cover | Two-candle reversal patterns with deep body penetration. | bullish, bearish event, penetration | Overlay | All, P | T2 New |
| PAT-008 | Morning and Evening Star | Three-candle potential reversal sequence. | bullish, bearish event | Overlay | All, P | T2 New |
| PAT-009 | Three White Soldiers and Three Black Crows | Three strong consecutive directional candles. | bullish, bearish event | Overlay | All, P | T2 New |
| PAT-010 | Marubozu | Candle dominated by its body with little or no wick. | bullish, bearish, tolerance | Overlay | All, P | T1 New |
| PAT-011 | Inside Bar | Current high-low range sits inside the previous bar. | inside_bar, mother range | Overlay | All, P | T1 New |
| PAT-012 | Outside Bar | Current range exceeds the previous bar on both sides. | outside_bar, direction | Overlay | All, P | T1 New |
| PAT-013 | Pin Bar | Long rejection wick relative to body and opposite wick. | bullish, bearish, ratios | Overlay | All, P | T1 New |
| PAT-014 | Tweezer Top and Bottom | Consecutive bars with approximately equal highs or lows. | top, bottom, tolerance | Overlay | All, P | T2 New |
| PAT-015 | Gap Up and Gap Down | Current range opens or remains beyond the previous range. | full_gap, partial_gap, direction | Overlay | All, P | T1 New |
| PAT-016 | NR4 and NR7 | Narrowest range in four or seven bars. | NR4, NR7 | Overlay | All, P | T1 New |
| PAT-017 | Wide Range Bar | Bar range unusually large versus recent history. | event, range ratio, percentile | Overlay | All, P | T1 New |
| PAT-018 | Climax Volume Candle | Wide candle with extreme relative volume. | bullish, bearish, exhaustion candidate | Overlay | Assets with V | T2 New |
| PAT-019 | Reversal Candle Score | Continuous score from body, wick, gap, volume, and context. | score -100 to 100, components | Pane | Assets with V | T2 New composite |
| PAT-020 | Multi-candle Pattern Filter | Generic sequence rule over candle anatomy rather than named patterns. | sequence match, parameters | Overlay | All, P | T2 New builder primitive |

## 13. Egypt market intelligence indicators

These are important commercial differentiators. Their definitions must specify source, publication lag, revision policy, and whether values are official, estimated, or model-derived.

| ID | Indicator | Everyday explanation | Outputs and common parameters | View | Assets and data | Stage and status |
|---|---|---|---|---|---|---|
| EGY-001 | EGX30 Return and Trend | Performance and technical state of Egypt's large-cap benchmark. | return, trend, volatility, drawdown | Market | EGX30, P | T1 Existing adjacent data |
| EGY-002 | EGX70 Return and Trend | Performance and technical state of the smaller-company benchmark. | return, trend, volatility, drawdown | Market | EGX70, P | T1 Existing adjacent data |
| EGY-003 | EGX100 Return and Trend | Broad benchmark performance and state. | return, trend, volatility, drawdown | Market | EGX100, P | T1 Existing adjacent data |
| EGY-004 | EGX Index Breadth | Participation of constituents behind each EGX index move. | AD percent, percent above MA, highs-lows | Market | Index membership, B | T1 New |
| EGY-005 | Egyptian Investor Net Flow | Net buying or selling by Egyptian investors. | daily and cumulative net flow | Market | EGX investor flows, M | T0 Existing adjacent feature |
| EGY-006 | Arab Investor Net Flow | Net buying or selling by Arab investors. | daily and cumulative net flow | Market | EGX investor flows, M | T0 Existing adjacent feature |
| EGY-007 | Foreign Investor Net Flow | Net buying or selling by non-Arab foreign investors. | daily and cumulative net flow | Market | EGX investor flows, M | T0 Existing adjacent feature |
| EGY-008 | Institutional versus Retail Flow | Net participation split by investor type. | institutional and retail net flow | Market | EGX investor flows, M | T2 Data-gated |
| EGY-009 | Investor Flow Z-score | Whether current investor flows are unusually large. | z-score, percentile, period | Pane | EGX flow history, M | T1 New |
| EGY-010 | Flow Trend and Persistence | Whether a participant group has accumulated or sold for several sessions. | rolling sum, streak, trend | Pane | EGX flow history, M | T1 New |
| EGY-011 | Flow-Price Divergence | Index rises during foreign selling or falls during accumulation. | divergence state, strength | Pane | EGX index and flows, M | T2 New |
| EGY-012 | Sector Rotation Score | Relative momentum, breadth, flow, and volatility by EGX sector. | score, rank, quadrant | Market | EGX sectors, B and M | T1 Existing adjacent feature |
| EGY-013 | Industry Group Rotation | Same rotation framework at the industry-group level. | score, rank, quadrant | Market | EGX taxonomy, B | T2 Existing adjacent data |
| EGY-014 | Sector Concentration Risk | Dependence of a sector move on its largest constituents. | concentration, contribution, breadth gap | Market | EGX sectors, B | T1 Existing adjacent feature |
| EGY-015 | EGX Market Heat Score | Composite of breadth, volume, volatility, momentum, and flows. | score_0_100, regime | Market | EGX universe, BVM | T2 New composite |
| EGY-016 | Official USD/EGP Trend | Trend, momentum, and volatility of the official exchange rate. | rate, return, trend, volatility | Market | FX, M | T1 Existing adjacent data |
| EGY-017 | Real USD/EGP Fair Value | Model-derived purchasing-power or macro fair-value estimate. | fair value, misvaluation_pct, confidence | Market | FX and macro, M | T0 Existing adjacent feature |
| EGY-018 | FX Devaluation Risk | Composite probability or risk state from FX, reserves, inflation, rates, and liquidity. | risk score, state, drivers | Market | Macro, M | T0 Existing adjacent feature |
| EGY-019 | Parallel-Market FX Premium | Difference between official and verifiable alternative FX prices. | premium_pct, trend | Market | Licensed or verified FX data, M | R Data and compliance gated |
| EGY-020 | ADR-Implied USD/EGP | FX rate implied by Egyptian local shares and corresponding overseas receipts. | implied FX, premium, stale-data flag | Market | ADR pairs and FX, BM | R Data-gated |
| EGY-021 | Gold in EGP per Gram | International gold translated through USD/EGP into local units. | EGP per gram, return, premium | Market | Gold and FX, BM | T1 Existing adjacent data |
| EGY-022 | Silver in EGP per Gram | International silver translated through USD/EGP into local units. | EGP per gram, return, premium | Market | Silver and FX, BM | T1 Existing adjacent data |
| EGY-023 | Local Gold Premium | Local retail bullion price versus international implied EGP value. | premium_pct, spread | Market | Verified local gold quotes, M | R Data-gated |
| EGY-024 | Gold versus EGP Hedge Effectiveness | How well local gold has offset currency weakness or inflation. | correlation, hedge ratio, real return | Pane | Gold, FX, inflation, BM | T2 New |
| EGY-025 | CBE Policy Rate | Current rate, direction, and real rate after inflation. | nominal rate, real rate, change | Market | CBE and CPI, M | T1 Existing adjacent data |
| EGY-026 | Yield Curve Slope | Difference between long- and short-term Egyptian government yields. | spreads, inversion state | Market | Treasury yields, M | R Data-gated |
| EGY-027 | Inflation Momentum | Change in monthly, annual, and annualized short-run Egyptian inflation. | CPI momentum, acceleration | Market | CAPMAS or CBE CPI, M | T1 Existing adjacent data |
| EGY-028 | Real Equity Return | EGX return after Egyptian inflation. | real return, real drawdown | Pane | EGX and CPI, M | T1 New |
| EGY-029 | M2 Liquidity Growth | Growth and acceleration of Egyptian broad money. | YoY, MoM, acceleration | Market | Money supply, M | T0 Existing adjacent feature |
| EGY-030 | Liquidity versus EGX Divergence | Difference between money growth and equity-market performance. | divergence, rolling beta | Pane | M2 and EGX, M | T2 New |
| EGY-031 | Fund Discount or Premium | Fund market price versus reported NAV where both exist. | premium_discount_pct, z-score | Pane | Listed funds and NAV | T2 Data-gated |
| EGY-032 | Fund Tracking Difference | Fund return minus its benchmark return. | active return, tracking error | Card | Funds and BM | T2 New |
| EGY-033 | EGX Trading Activity Pulse | Composite of turnover, trades count, active tickers, and volume breadth. | pulse_0_100, state | Market | EGX trade statistics, BVT | T2 New composite |
| EGY-034 | Suspension and Staleness Flag | Warns when an asset has missing sessions, stale NAV, or suspended trading. | stale, missing bars, last valid date | Card | All local assets, P | T1 New data-quality primitive |
| EGY-035 | Corporate Action Integrity Flag | Identifies price discontinuities that may require split or dividend adjustment. | suspected event, adjusted state | Card | EGX equities, P and FND | T1 Existing adjacent integrity logic |
| EGY-036 | EGP Purchasing Power Index | Indexed value of one EGP after cumulative inflation. | purchasing_power, loss_pct | Market | CPI, M | T2 New |

## 14. Ticknal proprietary and composite model inventory

This section prevents internal strategy calculations from being confused with reusable indicators. A model may consume many indicators while still exposing only a small set of stable outputs to the chart and builder.

| ID | Model or component | Current role | Candidate reusable outputs | Assets and data | Stage and status |
|---|---|---|---|---|---|
| TKL-001 | Typhon or PSI 8 Master Index | Proprietary strategy combining normalized price, RSI, banker flow, Bollinger position, Supertrend, DMI, MA spread, and slope. | raw index, master index, adjusted index, levels crossed | EGX equities, P | T0 Internal only |
| TKL-002 | PSI 40 Score | Internal 40-condition momentum, trend, volatility, volume, and statistical score. | score_0_100, category subscores, agreement count | Equities, PV | T0 Internal only |
| TKL-003 | Cerberus or PSI V2 | Three-headed stateful swing and regime strategy. | zone, up, down, regime direction, state changes | EGX equities, P | T0 Internal only |
| TKL-004 | HYDRA Strategy | Strategy built around the HYDRA regime model. | position state, regime value, dynamic theta, entry and exit events | EGX equities, P | T0 Existing strategy |
| TKL-005 | Champion Strategy Resolver | Chooses the positive-alpha strategy for each ticker. | winning model, alpha, confidence, comparison metrics | EGX equities, P | T0 Internal service |
| TKL-006 | Smart Money Flow | Chart indicator using verified transaction statistics and price-volume absorption. | ATS, relative ATS, absorption, accumulation and distribution states | EGX equities, PVT | T0 Existing chart |
| TKL-007 | Strategy Consensus | Agreement across Typhon, Cerberus, and HYDRA. | vote count, consensus state, disagreement | EGX equities, P | T2 Existing partial logic |
| TKL-008 | Opportunity Quality Score | Candidate ranking using signal age, alpha, risk, liquidity, and regime. | score, rank, component explanations | EGX equities, PVT | T2 Existing adjacent logic |
| TKL-009 | Indicator Consensus Score | User-selected set of normalized indicators combined without becoming a strategy. | bullish, bearish, neutral agreement and coverage | All, selected inputs | T2 New builder output |
| TKL-010 | Data Confidence Score | Rates whether an indicator result is trustworthy given history length, gaps, volume, and freshness. | confidence_0_100, warnings, missing inputs | All | T1 New platform primitive |

---

## Recommended delivery sequence

The stages above are the source of truth. Within them, the practical dependency order is:

1. Canonical price, return, rolling-window, moving-average, dispersion, and crossover primitives.
2. T1 standalone trend, momentum, volatility, volume, and structure indicators.
3. A generic pane and overlay renderer that consumes indicator metadata.
4. Rule-builder operators against typed indicator outputs.
5. One-ticker backtesting using exactly the same indicator engine.
6. Whole-universe backtesting with survivorship-aware universe definitions.
7. Saved strategies, scheduling, and notification evaluation.
8. T2 breadth, relative-strength, Egypt-specific, and composite indicators.
9. T3 advanced quantitative indicators.
10. Research and data-gated indicators only after their inputs and interpretations are validated.

## Definition of done for every indicator

An indicator is not complete merely because it draws a line. It is complete only when all of the following are true:

- One canonical calculation is shared by charts, backtests, scanners, and alerts.
- Formula, source, defaults, valid parameter ranges, and output meaning are documented.
- Numerical output is tested against an independent trusted reference or hand-calculated fixture.
- Warm-up bars and first valid output are deterministic.
- Missing, zero, stale, suspended, and malformed market data are handled explicitly.
- Daily, weekly, monthly, and supported intraday behavior are verified.
- Applicable asset classes and required data fields are declared.
- Repainting, pivot confirmation delay, look-ahead risk, and anchor dependence are disclosed.
- Outputs are named, typed, and usable by generic rule-builder operators.
- Chart placement, scale, precision, colors, thresholds, and legends are defined.
- English and Arabic plain-language descriptions are available.
- Computation time and memory are acceptable for one ticker and the full EGX universe.
- Version changes are tracked so saved strategies remain reproducible.

## Important product safeguards

- Do not label overbought as an automatic sell or oversold as an automatic buy.
- Do not expose future-confirmed pivots as if they were known on the pivot bar.
- Do not silently use synthetic volume, trades count, order-book, NAV, macro, or FX data.
- Do not mix adjusted and unadjusted prices in one calculation.
- Do not evaluate a daily rule before the daily bar is final unless it is explicitly marked provisional.
- Do not compare indicators across assets until their scale and units are compatible.
- Do not present a statistical model's output as certainty; expose confidence, history length, and limitations.
- Do not allow chart, backtest, and alert implementations to drift into separate formulas.

## Scope boundary

This backlog covers indicator calculations, market measurements, and reusable rule inputs. It does not yet define:

- The visual design of the indicator browser.
- The drag-and-drop strategy-builder interaction.
- The persisted strategy schema.
- Backtesting execution architecture.
- Pricing tiers and entitlements.
- Notification frequency, throttling, or delivery policies.
- Investment recommendations or financial-advice wording.

Those are separate product and architecture decisions that should consume this library rather than redefine its calculations.
