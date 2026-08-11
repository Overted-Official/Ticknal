"""Causal v1 rule signals built from the existing Master Index concept."""

from __future__ import annotations

import pandas as pd

from .master_index import compute_master_index


RULE_FEATURE_COLUMNS = (
    "rule_master_index",
    "rule_master_change_1",
    "rule_master_change_5",
    "rule_cross_level",
    "rule_mdm",
    "rule_np_score",
    "rule_rsi_score",
    "rule_banker_score",
    "rule_bb_score",
    "rule_st_score",
    "rule_adx_score",
    "rule_ma_score",
    "rule_slope_score",
    "rule_st_direction",
)


def build_master_index_rule_frame(prices: pd.DataFrame, params: dict) -> pd.DataFrame:
    """Build unquantized crossover signals without crossing quality segments."""
    required = {"ticker_symbol", "date", "open", "high", "low", "close", "volume", "segment_id"}
    missing = required.difference(prices.columns)
    if missing:
        raise ValueError(f"Missing rule-frame columns: {', '.join(sorted(missing))}")

    segments: list[pd.DataFrame] = []
    for _, segment in prices.groupby(["ticker_symbol", "segment_id"], sort=False):
        if len(segment) < 30:
            continue
        computed = compute_master_index(segment, params)
        segments.append(computed)
    if not segments:
        return prices.iloc[0:0].copy()

    frame = pd.concat(segments, ignore_index=True).sort_values(
        ["ticker_symbol", "date"], kind="stable"
    ).reset_index(drop=True)
    segment_groups = frame.groupby(["ticker_symbol", "segment_id"], sort=False)
    previous_index = segment_groups["master_index_raw"].shift(1)
    same_segment = previous_index.notna()
    entry = pd.Series(False, index=frame.index)
    cross_level = pd.Series(pd.NA, index=frame.index, dtype="Float64")
    for level in sorted(float(value) for value in params["entry_levels"]):
        crossed = frame["master_index_raw"].gt(level) & previous_index.le(level) & same_segment
        entry |= crossed
        cross_level = cross_level.mask(crossed, level)
    eligibility = frame["is_eligible"].fillna(False) if "is_eligible" in frame.columns else True
    frame["entry_signal"] = entry & eligibility
    frame["entry_cross_level"] = cross_level

    # Scale-free, causal diagnostics expose the rule's state to the pooled
    # classifier without handing it raw prices, volume, ticker IDs, or dates.
    frame["rule_master_index"] = frame["master_index_raw"] / 100.0
    frame["rule_master_change_1"] = segment_groups["master_index_raw"].diff(1) / 100.0
    frame["rule_master_change_5"] = segment_groups["master_index_raw"].diff(5) / 100.0
    frame["rule_cross_level"] = frame["entry_cross_level"] / 100.0
    frame["rule_mdm"] = frame["mdm"] / 100.0
    for source, target in (
        ("np_score", "rule_np_score"),
        ("rsi_score", "rule_rsi_score"),
        ("banker_score", "rule_banker_score"),
        ("bb_score", "rule_bb_score"),
        ("st_score", "rule_st_score"),
        ("adx_score", "rule_adx_score"),
        ("ma_score", "rule_ma_score"),
        ("slope_score", "rule_slope_score"),
    ):
        frame[target] = frame[source] / 100.0
    frame["rule_st_direction"] = frame["st_dir"].astype("float64")

    smart_level = params.get("smrt_exit_lvl")
    if params.get("use_smrt_exit") and smart_level is not None:
        frame["exit_signal"] = (
            frame["master_index_raw"].lt(float(smart_level))
            & previous_index.ge(float(smart_level))
            & frame["st_dir"].eq(-1)
            & same_segment
        )
    else:
        frame["exit_signal"] = False
    frame["exit_reason"] = "master_index_reversal"
    frame["exit_only_if_profitable"] = True

    if params.get("use_sl") and params.get("sl") is not None:
        frame["stop_distance_pct"] = frame["mdm"] * float(params["sl"]) / 100.0
    else:
        frame["stop_distance_pct"] = pd.NA
    if params.get("use_aym") and params.get("aym") is not None:
        frame["target_distance_pct"] = frame["mdm"] * float(params["aym"]) / 100.0
        frame["allow_target_exit"] = frame["master_index_raw"].lt(float(params["aym_lim"]))
    else:
        frame["target_distance_pct"] = pd.NA
        frame["allow_target_exit"] = False
    frame["trailing_atr_multiple"] = (
        float(params["atr_m"]) if params.get("use_atr") and params.get("atr_m") is not None else pd.NA
    )
    frame["atr"] = frame["atr_14"]
    return frame
