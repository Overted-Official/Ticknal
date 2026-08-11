"""Pooled, leakage-safe candidate dataset for the first ML signal model."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd

from quant_engine.data import add_point_in_time_eligibility
from quant_engine.features import FEATURE_COLUMNS, build_causal_features
from quant_engine.labels import DEFAULT_BARRIERS, apply_triple_barrier_labels
from quant_engine.strategy.params import get_global_candidate_params
from quant_engine.strategy.rules_v1 import RULE_FEATURE_COLUMNS, build_master_index_rule_frame


@dataclass(frozen=True)
class CandidateDataset:
    """Candidate observations plus the market sessions used for temporal gaps."""

    rows: pd.DataFrame
    feature_columns: tuple[str, ...]
    session_dates: pd.DatetimeIndex
    ticker_count: int


def _normalize_symbols(symbols: Iterable[str] | None) -> set[str] | None:
    if symbols is None:
        return None
    normalized = {str(symbol).strip().upper().removesuffix(".CA") for symbol in symbols}
    return {symbol for symbol in normalized if symbol}


def build_candidate_dataset(
    prices: pd.DataFrame,
    tickers: pd.DataFrame | None = None,
    *,
    ticker_symbols: Iterable[str] | None = None,
) -> CandidateDataset:
    """Build eligible Master Index candidates and their forward outcomes.

    Market and sector context is calculated from the full supplied universe,
    even when ``ticker_symbols`` limits the candidates. This keeps breadth and
    relative-strength features comparable between research runs.
    """
    eligible = prices if "is_eligible" in prices.columns else add_point_in_time_eligibility(prices, tickers)
    features = build_causal_features(eligible, tickers)
    selected = _normalize_symbols(ticker_symbols)
    candidate_prices = eligible
    if selected is not None:
        candidate_prices = eligible.loc[eligible["ticker_symbol"].isin(selected)]
    if candidate_prices.empty:
        raise ValueError("No price rows match the requested candidate universe")

    params = get_global_candidate_params()
    rule_parts: list[pd.DataFrame] = []
    label_columns = [
        column
        for definition in DEFAULT_BARRIERS
        for column in (
            f"label_{definition.name}",
            f"outcome_{definition.name}",
            f"holding_bars_{definition.name}",
            f"realized_return_{definition.name}",
        )
    ]
    identity_columns = ["ticker_symbol", "date", "segment_id", "entry_signal"]

    for _, ticker_prices in candidate_prices.groupby("ticker_symbol", sort=False):
        rule_frame = build_master_index_rule_frame(ticker_prices, params)
        if rule_frame.empty:
            continue
        labelled = apply_triple_barrier_labels(rule_frame)
        candidates = labelled.loc[labelled["entry_signal"].fillna(False)]
        if candidates.empty:
            continue
        rule_parts.append(candidates.loc[:, identity_columns + list(RULE_FEATURE_COLUMNS) + label_columns])

    if not rule_parts:
        raise ValueError("The requested universe produced no eligible rule candidates")

    rules = pd.concat(rule_parts, ignore_index=True)
    feature_subset = features.loc[:, ["ticker_symbol", "date", *FEATURE_COLUMNS]]
    rows = rules.merge(
        feature_subset,
        on=["ticker_symbol", "date"],
        how="left",
        validate="one_to_one",
    )
    model_features = tuple(FEATURE_COLUMNS) + tuple(RULE_FEATURE_COLUMNS)
    rows = rows.dropna(subset=list(model_features)).sort_values(
        ["date", "ticker_symbol"], kind="stable"
    ).reset_index(drop=True)
    sessions = pd.DatetimeIndex(pd.to_datetime(eligible["date"]).dropna().unique()).sort_values()
    return CandidateDataset(
        rows=rows,
        feature_columns=model_features,
        session_dates=sessions,
        ticker_count=int(rows["ticker_symbol"].nunique()),
    )
