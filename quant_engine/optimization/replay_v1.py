"""Replay locked OOS model decisions through the event-driven simulator."""

from __future__ import annotations

import pandas as pd

from quant_engine.backtest import (
    BacktestConfig,
    BacktestResult,
    QualificationPolicy,
    evaluate_backtest,
    run_single_asset_backtest,
)
from quant_engine.labels import DEFAULT_BARRIERS
from quant_engine.strategy.params import get_global_candidate_params
from quant_engine.strategy.rules_v1 import build_master_index_rule_frame


def build_barrier_signal_frame(
    prices: pd.DataFrame,
    predictions: pd.DataFrame,
    scale: str,
) -> pd.DataFrame:
    """Convert accepted OOS candidates into causal bracket/time-exit signals."""
    definitions = {definition.name: definition for definition in DEFAULT_BARRIERS}
    if scale not in definitions:
        raise ValueError(f"Unknown swing scale: {scale}")
    symbols = prices["ticker_symbol"].dropna().unique()
    if len(symbols) != 1:
        raise ValueError("Barrier replay requires exactly one ticker's prices")
    ticker = str(symbols[0])
    definition = definitions[scale]

    frame = build_master_index_rule_frame(prices, get_global_candidate_params())
    accepted_dates = pd.DatetimeIndex([])
    if not predictions.empty:
        required = {"ticker_symbol", "date", "scale", "accepted"}
        missing = required.difference(predictions.columns)
        if missing:
            raise ValueError(f"Missing prediction columns: {', '.join(sorted(missing))}")
        accepted = predictions.loc[
            predictions["ticker_symbol"].eq(ticker)
            & predictions["scale"].eq(scale)
            & predictions["accepted"].fillna(False)
        ]
        accepted_dates = pd.DatetimeIndex(pd.to_datetime(accepted["date"]).dt.normalize().unique())

    eligible = frame["is_eligible"].fillna(False) if "is_eligible" in frame.columns else True
    frame["entry_signal"] = frame["date"].isin(accepted_dates) & eligible
    normalized_atr = frame["atr_14"] / frame["close"]
    frame["stop_distance_pct"] = normalized_atr * definition.stop_atr
    frame["target_distance_pct"] = normalized_atr * definition.target_atr
    frame["allow_target_exit"] = True
    frame["trailing_atr_multiple"] = pd.NA
    frame["maximum_holding_bars"] = definition.maximum_holding_bars
    frame["exit_signal"] = False
    frame["exit_only_if_profitable"] = False
    frame["exit_reason"] = f"{scale}_barrier_exit"
    return frame


def replay_accepted_predictions(
    prices: pd.DataFrame,
    predictions: pd.DataFrame,
    scale: str,
    *,
    start_date: str | pd.Timestamp = "2021-01-01",
    end_date: str | pd.Timestamp | None = None,
    backtest_config: BacktestConfig | None = None,
    qualification_policy: QualificationPolicy | None = None,
) -> tuple[dict, BacktestResult]:
    """Return the qualification metrics and full backtest result."""
    signal_frame = build_barrier_signal_frame(prices, predictions, scale)
    result = run_single_asset_backtest(
        signal_frame,
        start_date=start_date,
        end_date=end_date,
        config=backtest_config,
    )
    metrics = evaluate_backtest(result, qualification_policy)
    metrics["scale"] = scale
    return metrics, result
