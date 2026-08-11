"""Causal market-regime and cross-sectional features for model iteration 2."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .builder_v1 import FEATURE_COLUMNS, build_causal_features


REGIME_FEATURE_COLUMNS = (
    "market_breadth_change_5",
    "market_breadth_change_20",
    "market_return_dispersion_1",
    "market_drawdown_60",
    "sector_breadth_20",
    "sector_volatility_20",
    "cross_section_return_20_rank",
    "cross_section_return_60_rank",
    "cross_section_volatility_20_rank",
    "cross_section_liquidity_rank",
)
FEATURE_COLUMNS_V2 = FEATURE_COLUMNS + REGIME_FEATURE_COLUMNS


def _breadth(values: pd.Series) -> float:
    complete = values.dropna()
    return float((complete > 0).mean()) if not complete.empty else np.nan


def _dispersion(values: pd.Series) -> float:
    complete = values.dropna()
    return float(complete.std(ddof=0)) if not complete.empty else np.nan


def build_causal_features_v2(prices: pd.DataFrame, tickers: pd.DataFrame | None = None) -> pd.DataFrame:
    """Extend v1 with close-known regime and percentile-rank context."""
    features = build_causal_features(prices, tickers)
    market = features.groupby("date", sort=True).agg(
        market_breadth_v2=("distance_sma_20", _breadth),
        market_return_v2=("return_1", "mean"),
        market_return_dispersion_1=("return_1", _dispersion),
    ).reset_index()
    market["market_breadth_change_5"] = market["market_breadth_v2"].diff(5)
    market["market_breadth_change_20"] = market["market_breadth_v2"].diff(20)
    market_nav = (1.0 + market["market_return_v2"].fillna(0.0)).cumprod()
    market["market_drawdown_60"] = market_nav / market_nav.rolling(60, min_periods=60).max() - 1.0
    features = features.merge(
        market.loc[:, [
            "date",
            "market_breadth_change_5",
            "market_breadth_change_20",
            "market_return_dispersion_1",
            "market_drawdown_60",
        ]],
        on="date",
        how="left",
        validate="many_to_one",
    )

    sector = features.groupby(["sector", "date"], sort=True).agg(
        sector_breadth_20=("distance_sma_20", _breadth),
        sector_return_for_volatility=("return_1", "mean"),
    ).reset_index()
    sector["sector_volatility_20"] = sector.groupby("sector", sort=False)[
        "sector_return_for_volatility"
    ].transform(lambda values: values.rolling(20, min_periods=20).std() * np.sqrt(252))
    features = features.merge(
        sector.loc[:, ["sector", "date", "sector_breadth_20", "sector_volatility_20"]],
        on=["sector", "date"],
        how="left",
        validate="many_to_one",
    )

    features["cross_section_return_20_rank"] = features.groupby("date", sort=False)["return_20"].rank(pct=True)
    features["cross_section_return_60_rank"] = features.groupby("date", sort=False)["return_60"].rank(pct=True)
    features["cross_section_volatility_20_rank"] = features.groupby("date", sort=False)[
        "realized_volatility_20"
    ].rank(pct=True)
    features["cross_section_liquidity_rank"] = features.groupby("date", sort=False)[
        "median_traded_value_feature_60"
    ].rank(pct=True)
    return features
