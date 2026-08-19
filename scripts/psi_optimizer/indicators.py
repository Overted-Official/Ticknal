"""Numba-accelerated indicator calculations for the PSI Strategy (raw continuous version)."""

from __future__ import annotations
import numba as nb
import numpy as np
import pandas as pd
import pandas_ta as ta
from typing import Dict, Any, Optional


@nb.njit(cache=True)
def calc_weighted_simple_average(src: np.ndarray, length: int, weight: float) -> np.ndarray:
    n = len(src)
    output = np.full(n, np.nan)
    sum_float = np.nan

    for i in range(n):
        if np.isnan(src[i]):
            sum_float = np.nan
            continue

        previous_sum = 0.0 if np.isnan(sum_float) else sum_float
        old_value = src[i - length] if i >= length and not np.isnan(src[i - length]) else 0.0
        sum_float = previous_sum - old_value + src[i]

        moving_average = np.nan
        if i >= length and not np.isnan(src[i - length]):
            moving_average = sum_float / length

        previous_output = output[i - 1] if i > 0 else np.nan
        if np.isnan(previous_output):
            output[i] = moving_average
        else:
            output[i] = (src[i] * weight + previous_output * (length - weight)) / length

    return output


@nb.njit(cache=True)
def dynamic_ema(src: np.ndarray, length: int) -> np.ndarray:
    out = np.full(len(src), np.nan)
    alpha = 2.0 / (length + 1.0)
    previous = np.nan
    for i in range(len(src)):
        if np.isnan(src[i]):
            continue
        if np.isnan(previous):
            previous = src[i]
        else:
            previous = alpha * src[i] + (1.0 - alpha) * previous
        out[i] = previous
    return out


def true_range(df: pd.DataFrame) -> pd.Series:
    previous_close = df["close"].shift(1)
    tr1 = df["high"] - df["low"]
    tr2 = (df["high"] - previous_close).abs()
    tr3 = (df["low"] - previous_close).abs()
    return pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)


def compute_ticker_indicators(
    df: pd.DataFrame,
    train_start: str,
    train_end: str,
    test_start: str,
    test_end: str,
) -> Optional[Dict[str, Any]]:
    """Calculates all 8 PSI indicators on the full price history, then slices into Train and Test arrays."""
    if len(df) < 120:
        return None

    close = df["close"].astype(float)
    high = df["high"].astype(float)
    low = df["low"].astype(float)

    # 1. Normalized Price Score (14)
    np_high = close.rolling(14, min_periods=14).max()
    np_low = close.rolling(14, min_periods=14).min()
    df["np_score"] = np.where(np_high != np_low, ((close - np_low) / (np_high - np_low)) * 100.0, 50.0)

    # 2. RSI (14)
    df["rsi_score"] = ta.rsi(close, length=14)

    # 3. Banker Score (Stochastic 27, 5, 3)
    stoch_low = low.rolling(27, min_periods=27).min()
    stoch_high = high.rolling(27, min_periods=27).max()
    stoch_k = np.where(stoch_high != stoch_low, ((close - stoch_low) / (stoch_high - stoch_low)) * 100.0, 50.0)
    banker_1 = calc_weighted_simple_average(np.asarray(stoch_k, dtype=np.float64), 5, 1.0)
    banker_2 = calc_weighted_simple_average(banker_1, 3, 1.0)
    df["banker_score"] = np.clip((3.0 * banker_1 - 2.0 * banker_2 - 50.0) * 1.032 + 50.0, 0.0, 100.0)

    # 4. Bollinger Bands Score (14, 2.0)
    bb = ta.bbands(close, length=14, std=2.0)
    if bb is None or bb.empty:
        return None
    bb_lower = bb.iloc[:, 0]
    bb_upper = bb.iloc[:, 2]
    bb_diff = bb_upper - bb_lower
    df["bb_score"] = np.clip(np.where(bb_diff != 0, ((close - bb_lower) / bb_diff) * 100.0, 50.0), 0.0, 100.0)

    # 5. Supertrend (14, 3.0 ATR)
    atr14 = ta.atr(high, low, close, length=14)
    df["atr_14"] = atr14
    supertrend = ta.supertrend(high, low, close, length=14, multiplier=3.0)
    if supertrend is None or supertrend.empty:
        return None
    st_value_col = next(column for column in supertrend.columns if column.startswith("SUPERT_"))
    st_value = supertrend[st_value_col]
    df["st_score"] = np.clip(np.where(atr14 > 0, 50.0 + (((close - st_value) / (atr14 * 3.0)) * 50.0), 50.0), 0.0, 100.0)

    # 6. DMI / ADX (14)
    adx = ta.adx(high, low, close, length=14)
    if adx is not None and not adx.empty:
        di_plus = adx["DMP_14"]
        di_minus = adx["DMN_14"]
        di_sum = di_plus + di_minus
        df["adx_score"] = np.clip(np.where(di_sum != 0, 50.0 + (((di_plus - di_minus) / di_sum) * 50.0), 50.0), 0.0, 100.0)
    else:
        df["adx_score"] = 50.0

    # 7. MA Trend Score (50/200 SMA normalized over 14)
    ma_fast = close.rolling(50, min_periods=50).mean()
    ma_slow = close.rolling(200, min_periods=200).mean()
    ma_diff = ma_fast - ma_slow
    ma_high = ma_diff.rolling(14, min_periods=14).max()
    ma_low = ma_diff.rolling(14, min_periods=14).min()
    ma_range = ma_high - ma_low
    df["ma_score"] = np.where(ma_range != 0, ((ma_diff - ma_low) / ma_range) * 100.0, 50.0)

    # 8. ATR Slope Angle (14)
    price_change = close - close.shift(14)
    raw_slope = np.where(atr14 > 0, price_change / (atr14 * 14.0), 0.0)
    angle = np.degrees(np.arctan(raw_slope))
    df["slope_score"] = np.clip(((angle + 90.0) / 180.0) * 100.0, 0.0, 100.0)

    # Raw Weighted Composite Score (Divided by 96.0)
    total_weight = 96.0
    raw_calc = (
        df["np_score"] * 15.0
        + df["rsi_score"] * 10.0
        + df["banker_score"] * 5.0
        + df["bb_score"] * 4.0
        + df["st_score"] * 47.0
        + df["adx_score"] * 10.0
        + df["ma_score"] * 4.0
        + df["slope_score"] * 1.0
    ) / total_weight

    master_raw = raw_calc.to_numpy(dtype=np.float64)
    df["master_index"] = dynamic_ema(master_raw, 3)
    df["master_index_adjusted"] = dynamic_ema(master_raw, 3)

    # Volatility / Daily Move Baseline
    df["tr"] = true_range(df)
    df["median_daily_move"] = ((df["tr"] / close) * 100.0).rolling(252, min_periods=min(len(df), 252)).median()
    # Backfill earlier periods with expanding median if less than 252 bars
    if df["median_daily_move"].isna().any():
        df["median_daily_move"] = df["median_daily_move"].bfill()

    # Slice In-Sample Training Array (Inception to train_end)
    if train_start:
        train_df = df.loc[df["date"].between(pd.Timestamp(train_start), pd.Timestamp(train_end))].copy()
    else:
        train_df = df.loc[df["date"] <= pd.Timestamp(train_end)].copy()

    if len(train_df) < 20:
        return None

    t_start_date = train_df["date"].iloc[0]
    train_years = max((train_df["date"].iloc[-1] - t_start_date).days / 365.25, 0.001)
    train_arrays = {
        "master_index": train_df["master_index"].to_numpy(dtype=np.float64),
        "master_index_adjusted": train_df["master_index_adjusted"].to_numpy(dtype=np.float64),
        "close": train_df["close"].to_numpy(dtype=np.float64),
        "high": train_df["high"].to_numpy(dtype=np.float64),
        "low": train_df["low"].to_numpy(dtype=np.float64),
        "median_daily_move": train_df["median_daily_move"].to_numpy(dtype=np.float64),
        "atr": train_df["atr_14"].to_numpy(dtype=np.float64),
        "years": float(train_years),
        "start_date": str(t_start_date.strftime("%Y-%m-%d")),
        "end_date": str(train_df["date"].iloc[-1].strftime("%Y-%m-%d")),
        "bars_count": len(train_df),
    }

    # Slice Out-of-Sample Test Array (test_start onwards)
    if test_end:
        test_df = df.loc[df["date"].between(pd.Timestamp(test_start), pd.Timestamp(test_end))].copy()
    else:
        test_df = df.loc[df["date"] >= pd.Timestamp(test_start)].copy()

    test_arrays: Optional[Dict[str, Any]] = None
    if len(test_df) >= 2:
        test_years = max((test_df["date"].iloc[-1] - pd.Timestamp(test_start)).days / 365.25, 0.001)
        test_arrays = {
            "master_index": test_df["master_index"].to_numpy(dtype=np.float64),
            "master_index_adjusted": test_df["master_index_adjusted"].to_numpy(dtype=np.float64),
            "close": test_df["close"].to_numpy(dtype=np.float64),
            "high": test_df["high"].to_numpy(dtype=np.float64),
            "low": test_df["low"].to_numpy(dtype=np.float64),
            "median_daily_move": test_df["median_daily_move"].to_numpy(dtype=np.float64),
            "atr": test_df["atr_14"].to_numpy(dtype=np.float64),
            "years": float(test_years),
            "start_date": str(test_df["date"].iloc[0].strftime("%Y-%m-%d")),
            "end_date": str(test_df["date"].iloc[-1].strftime("%Y-%m-%d")),
            "bars_count": len(test_df),
        }

    return {
        "train": train_arrays,
        "test": test_arrays,
    }
