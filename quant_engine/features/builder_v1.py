"""Leakage-safe, scale-free features for the pooled EGX classifier."""

from __future__ import annotations

import numpy as np
import pandas as pd


FEATURE_COLUMNS = (
    "return_1",
    "return_5",
    "return_10",
    "return_20",
    "return_60",
    "overnight_gap",
    "intraday_return",
    "range_normalized",
    "distance_sma_20",
    "distance_sma_50",
    "distance_sma_200",
    "drawdown_20",
    "drawdown_60",
    "rsi_14",
    "atr_normalized_14",
    "realized_volatility_20",
    "volume_ratio_20",
    "traded_value_ratio_60",
    "nonzero_volume_rate_60",
    "market_breadth_20",
    "market_return_1",
    "market_return_20",
    "market_volatility_20",
    "relative_return_20",
    "sector_return_1",
    "sector_return_20",
    "relative_sector_return_20",
)


def _rsi(close: pd.Series, window: int = 14) -> pd.Series:
    change = close.diff()
    gain = change.clip(lower=0)
    loss = -change.clip(upper=0)
    average_gain = gain.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()
    average_loss = loss.ewm(alpha=1 / window, adjust=False, min_periods=window).mean()
    relative_strength = average_gain / average_loss.replace(0, np.nan)
    rsi = 100 - 100 / (1 + relative_strength)
    return rsi.where(average_loss.ne(0), 100.0)


def _single_segment_features(segment: pd.DataFrame) -> pd.DataFrame:
    df = segment.sort_values("date", kind="stable").copy()
    close = df["close"]
    previous_close = close.shift(1)
    df["return_1"] = close.pct_change(fill_method=None)
    for window in (5, 10, 20, 60):
        df[f"return_{window}"] = close.pct_change(window, fill_method=None)
    df["overnight_gap"] = df["open"] / previous_close - 1.0
    df["intraday_return"] = close / df["open"] - 1.0
    df["range_normalized"] = (df["high"] - df["low"]) / previous_close

    for window in (20, 50, 200):
        moving_average = close.rolling(window, min_periods=window).mean()
        df[f"distance_sma_{window}"] = close / moving_average - 1.0
    for window in (20, 60):
        rolling_high = close.rolling(window, min_periods=window).max()
        df[f"drawdown_{window}"] = close / rolling_high - 1.0

    true_range = pd.concat(
        [
            df["high"] - df["low"],
            (df["high"] - previous_close).abs(),
            (df["low"] - previous_close).abs(),
        ],
        axis=1,
    ).max(axis=1)
    df["rsi_14"] = _rsi(close)
    df["atr_normalized_14"] = true_range.rolling(14, min_periods=14).mean() / close
    log_return = np.log(close / previous_close)
    df["realized_volatility_20"] = log_return.rolling(20, min_periods=20).std() * np.sqrt(252)

    median_volume = df["volume"].rolling(20, min_periods=20).median()
    df["volume_ratio_20"] = df["volume"] / median_volume.replace(0, np.nan)
    traded_value = close * df["volume"]
    median_traded_value = traded_value.rolling(60, min_periods=60).median()
    df["median_traded_value_feature_60"] = median_traded_value
    df["traded_value_ratio_60"] = traded_value / median_traded_value.replace(0, np.nan)
    df["nonzero_volume_rate_60"] = df["volume"].gt(0).rolling(60, min_periods=60).mean()
    return df


def build_causal_features(prices: pd.DataFrame, tickers: pd.DataFrame | None = None) -> pd.DataFrame:
    """Build features using current/past bars only, isolated by quality segment."""
    required = {"ticker_symbol", "date", "open", "high", "low", "close", "volume", "segment_id"}
    missing = required.difference(prices.columns)
    if missing:
        raise ValueError(f"Missing feature columns: {', '.join(sorted(missing))}")

    segments = [
        _single_segment_features(segment)
        for _, segment in prices.groupby(["ticker_symbol", "segment_id"], sort=False)
    ]
    features = pd.concat(segments, ignore_index=True).sort_values(
        ["ticker_symbol", "date"], kind="stable"
    ).reset_index(drop=True)

    if "sector" not in features.columns:
        if tickers is not None:
            metadata = tickers[["symbol", "sector"]].rename(columns={"symbol": "ticker_symbol"})
            features = features.merge(metadata, on="ticker_symbol", how="left", validate="many_to_one")
        else:
            features["sector"] = "UNKNOWN"
    features["sector"] = features["sector"].fillna("UNKNOWN").astype("string")

    market_daily = (
        features.groupby("date", sort=True)
        .agg(
            market_breadth_20=("distance_sma_20", lambda values: float((values > 0).mean())),
            market_return_1=("return_1", "mean"),
        )
        .reset_index()
    )
    market_daily["market_return_20"] = (
        (1.0 + market_daily["market_return_1"]).rolling(20, min_periods=20).apply(np.prod, raw=True) - 1.0
    )
    market_daily["market_volatility_20"] = (
        market_daily["market_return_1"].rolling(20, min_periods=20).std() * np.sqrt(252)
    )
    features = features.merge(market_daily, on="date", how="left", validate="many_to_one")
    features["relative_return_20"] = features["return_20"] - features["market_return_20"]

    sector_daily = (
        features.groupby(["sector", "date"], sort=True)["return_1"].mean().rename("sector_return_1").reset_index()
    )
    sector_daily["sector_return_20"] = sector_daily.groupby("sector", sort=False)["sector_return_1"].transform(
        lambda values: (1.0 + values).rolling(20, min_periods=20).apply(np.prod, raw=True) - 1.0
    )
    features = features.merge(sector_daily, on=["sector", "date"], how="left", validate="many_to_one")
    features["relative_sector_return_20"] = features["return_20"] - features["sector_return_20"]
    return features


def model_matrix(
    features: pd.DataFrame,
    *,
    candidate_column: str = "entry_signal",
    label_column: str | None = None,
) -> pd.DataFrame:
    """Return complete candidate rows with only approved model features."""
    required = set(FEATURE_COLUMNS) | {"ticker_symbol", "date", candidate_column}
    if label_column:
        required.add(label_column)
    missing = required.difference(features.columns)
    if missing:
        raise ValueError(f"Missing model-matrix columns: {', '.join(sorted(missing))}")
    columns = ["ticker_symbol", "date", *FEATURE_COLUMNS]
    if label_column:
        columns.append(label_column)
    candidates = features.loc[features[candidate_column].fillna(False), columns].copy()
    return candidates.dropna(subset=list(FEATURE_COLUMNS) + ([label_column] if label_column else [])).reset_index(drop=True)
