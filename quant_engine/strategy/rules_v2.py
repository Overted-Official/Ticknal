"""Expanded causal opportunity generator for the second pooled model."""

from __future__ import annotations

import pandas as pd

from .params import get_global_candidate_params
from .rules_v1 import RULE_FEATURE_COLUMNS, build_master_index_rule_frame


RULE_FEATURE_COLUMNS_V2 = RULE_FEATURE_COLUMNS + (
    "rule_source_master_cross",
    "rule_source_rsi_reversal",
    "rule_source_bb_reentry",
    "rule_source_supertrend_flip",
    "rule_source_trend_pullback",
    "rule_source_count",
)


def build_expanded_candidate_frame(prices: pd.DataFrame) -> pd.DataFrame:
    """Generate diverse close-known reversal and pullback candidates.

    This expands recall without using any forward swing outcome. The model sees
    one-hot source diagnostics and remains responsible for rejecting weak setups.
    """
    frame = build_master_index_rule_frame(prices, get_global_candidate_params())
    if frame.empty:
        return frame
    groups = frame.groupby(["ticker_symbol", "segment_id"], sort=False)
    previous_rsi = groups["rsi_score"].shift(1)
    previous_bb = groups["bb_score"].shift(1)
    previous_st = groups["st_dir"].shift(1)
    previous_close = groups["close"].shift(1)
    sma_20 = groups["close"].transform(lambda values: values.rolling(20, min_periods=20).mean())
    sma_50 = groups["close"].transform(lambda values: values.rolling(50, min_periods=50).mean())
    previous_sma_20 = sma_20.groupby(
        [frame["ticker_symbol"], frame["segment_id"]], sort=False
    ).shift(1)

    master_cross = frame["entry_cross_level"].notna()
    rsi_reversal = frame["rsi_score"].gt(35.0) & previous_rsi.le(35.0)
    bb_reentry = frame["bb_score"].gt(10.0) & previous_bb.le(10.0) & frame["rsi_score"].lt(55.0)
    supertrend_flip = frame["st_dir"].eq(1) & previous_st.eq(-1)
    trend_pullback = (
        frame["close"].gt(sma_20)
        & previous_close.le(previous_sma_20)
        & frame["close"].gt(sma_50)
    )

    sources = {
        "rule_source_master_cross": master_cross,
        "rule_source_rsi_reversal": rsi_reversal,
        "rule_source_bb_reentry": bb_reentry,
        "rule_source_supertrend_flip": supertrend_flip,
        "rule_source_trend_pullback": trend_pullback,
    }
    for column, values in sources.items():
        frame[column] = values.fillna(False).astype("float64")
    frame["rule_source_count"] = frame.loc[:, list(sources)].sum(axis=1)
    frame["rule_cross_level"] = frame["rule_cross_level"].fillna(0.0).astype("float64")
    eligible = frame["is_eligible"].fillna(False) if "is_eligible" in frame.columns else True
    frame["entry_signal"] = frame["rule_source_count"].gt(0) & eligible
    return frame
