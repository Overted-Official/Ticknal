"""Cost-aware expanded candidate dataset for the second ML iteration."""

from __future__ import annotations

from typing import Iterable

import pandas as pd

from quant_engine.data import add_point_in_time_eligibility
from quant_engine.features import FEATURE_COLUMNS_V2, build_causal_features_v2
from quant_engine.labels import DEFAULT_BARRIERS, apply_triple_barrier_labels
from quant_engine.strategy import RULE_FEATURE_COLUMNS_V2, build_expanded_candidate_frame

from .dataset_v1 import CandidateDataset


def _normalize_symbols(symbols: Iterable[str] | None) -> set[str] | None:
    if symbols is None:
        return None
    normalized = {str(symbol).strip().upper().removesuffix(".CA") for symbol in symbols}
    return {symbol for symbol in normalized if symbol}


def build_candidate_dataset_v2(
    prices: pd.DataFrame,
    tickers: pd.DataFrame | None = None,
    *,
    ticker_symbols: Iterable[str] | None = None,
    commission_bps_per_side: float = 10.0,
    slippage_bps_per_side: float = 15.0,
) -> CandidateDataset:
    """Build expanded candidates with net-win and net-return learning targets."""
    eligible = prices if "is_eligible" in prices.columns else add_point_in_time_eligibility(prices, tickers)
    features = build_causal_features_v2(eligible, tickers)
    selected = _normalize_symbols(ticker_symbols)
    candidate_prices = eligible
    if selected is not None:
        candidate_prices = eligible.loc[eligible["ticker_symbol"].isin(selected)]
    if candidate_prices.empty:
        raise ValueError("No price rows match the requested candidate universe")

    label_columns = [
        column
        for definition in DEFAULT_BARRIERS
        for column in (
            f"label_{definition.name}",
            f"outcome_{definition.name}",
            f"holding_bars_{definition.name}",
            f"realized_return_{definition.name}",
            f"net_return_{definition.name}",
            f"net_win_{definition.name}",
        )
    ]
    identity_columns = ["ticker_symbol", "date", "segment_id", "entry_signal"]
    rule_parts: list[pd.DataFrame] = []
    for _, ticker_prices in candidate_prices.groupby("ticker_symbol", sort=False):
        rule_frame = build_expanded_candidate_frame(ticker_prices)
        if rule_frame.empty:
            continue
        labelled = apply_triple_barrier_labels(
            rule_frame,
            commission_bps_per_side=commission_bps_per_side,
            slippage_bps_per_side=slippage_bps_per_side,
        )
        candidates = labelled.loc[labelled["entry_signal"].fillna(False)]
        if candidates.empty:
            continue
        rule_parts.append(
            candidates.loc[:, identity_columns + list(RULE_FEATURE_COLUMNS_V2) + label_columns]
        )
    if not rule_parts:
        raise ValueError("The requested universe produced no eligible expanded candidates")

    rules = pd.concat(rule_parts, ignore_index=True)
    feature_subset = features.loc[:, ["ticker_symbol", "date", *FEATURE_COLUMNS_V2]]
    rows = rules.merge(
        feature_subset,
        on=["ticker_symbol", "date"],
        how="left",
        validate="one_to_one",
    )
    model_features = tuple(FEATURE_COLUMNS_V2) + tuple(RULE_FEATURE_COLUMNS_V2)
    rows = rows.dropna(subset=list(model_features)).sort_values(
        ["date", "ticker_symbol"], kind="stable"
    ).reset_index(drop=True)
    if rows.empty:
        raise ValueError("Expanded candidates exist, but none have a complete causal v2 feature row")
    sessions = pd.DatetimeIndex(pd.to_datetime(eligible["date"]).dropna().unique()).sort_values()
    return CandidateDataset(
        rows=rows,
        feature_columns=model_features,
        session_dates=sessions,
        ticker_count=int(rows["ticker_symbol"].nunique()),
    )
