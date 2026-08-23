# Thoth-EGX-PSI-8-Macro-V3.7
## Lookback Synthesis Architecture: UP=21 bars (1 month) & DOWN=126 bars (6 months) + 20 Features

## 1. Research Purpose & Synthesis Hypothesis

V3.7 combines the empirical breakthroughs discovered in **V3.5** and **V3.6**:

* **V3.6 Discovery**: The **`21-bar` (1-month) UP model** achieved the lowest training SmoothL1 (`15.3418`), lowest validation SmoothL1 (`15.0440`), and an all-time record Peak Exhaustion F1 score of **`0.740`**. A short lookback eliminates older consolidation noise and allows ultra-precise trajectory tracking for rapid EGX bull runs.
* **V3.5 Discovery**: The **`126-bar` (6-month) DOWN model** achieved the best dip-entry terminal precision (**`6.84 pp`** in 2024 validation and **`6.62 pp`** in 2025+ sealed test) and the best combined out-of-sample error (**`5.65 pp`**). In contrast, the 252-bar window in V3.6 proved too long to pinpoint the exact turning point of downswings.

### V3.7 Architectural Configuration:
* **UP Model (Rally / Peak Exit Specialist)**: **`21` bars (1 trading month)**
* **DOWN Model (Dip / Accumulation Entry Specialist)**: **`126` bars (6 trading months)**
* **Scaled Lag Horizons ($L/8$)**:
  - UP Lag: $\text{round}(21 / 8) =$ **`3 bars`** (3-day velocity & short momentum).
  - DOWN Lag: $\text{round}(126 / 8) =$ **`16 bars`** (16-day medium-term velocity & momentum).
* **20 Features Per Bar**: 18 core indicators + `delta_percentile` + `reversal_hazard_next_bar`.
* **EGX Tradability Overlay**: Causal P20 liquidity filter.

---

## 2. The 20 Features per Bar

| # | DOWN specialist (126 bars) | UP specialist (21 bars) | Meaning |
|---:|---|---|---|
| 1 | `delta_to_red` | `delta_to_red` | Current PSI minus last confirmed RED PSI |
| 2 | `delta_to_green` | `delta_to_green` | Current PSI minus last confirmed GREEN PSI |
| 3 | `momentum` | `momentum` | Current PSI minus previous PSI |
| 4 | `curr_is_bullish` | `curr_is_bullish` | Current candle polarity |
| 5 | `last_red_is_bullish` | `last_red_is_bullish` | Candle polarity at last RED |
| 6 | `last_green_is_bullish` | `last_green_is_bullish` | Candle polarity at last GREEN |
| 7 | `bars_since_red` | `bars_since_red` | Bars since confirmed RED |
| 8 | `bars_since_green` | `bars_since_green` | Bars since confirmed GREEN |
| 9 | `swing_roi_up` | `swing_roi_up` | Price return from last GREEN |
| 10 | `swing_roi_down` | `swing_roi_down` | Price decline from last RED |
| 11 | `roi_median_multiple_up` | `roi_median_multiple_up` | UP ROI relative to causal median daily move |
| 12 | `roi_median_multiple_down` | `roi_median_multiple_down` | DOWN ROI relative to causal median daily move |
| 13 | `delta_to_red_lag16` | `delta_to_red_lag3` | Prior delta-to-RED over specialist horizon |
| 14 | `momentum_lag16` | `momentum_lag3` | Prior momentum over specialist horizon |
| 15 | `delta_velocity_16_per_bar` | `delta_velocity_3_per_bar` | Change in delta-to-RED per bar |
| 16 | `psi_index_value` | `psi_index_value` | Current EMA(3) PSI-8 |
| 17 | `volume_ratio` | `volume_ratio` | Current volume relative to recent average |
| 18 | `cumulative_volume_ratio` | `cumulative_volume_ratio` | Swing cumulative volume relative to expectation |
| 19 | `delta_percentile` | `delta_percentile` | Historical percentile of current directional PSI travel |
| 20 | `reversal_hazard_next_bar` | `reversal_hazard_next_bar` | Historical next-bar reversal-confirmation hazard |
