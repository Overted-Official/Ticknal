"""Tradeable-universe and consolidated research reporting."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd


def build_tradeable_universe(frame: pd.DataFrame, lookback_sessions: int = 252) -> tuple[pd.DataFrame, dict[str, object]]:
    sessions = pd.DatetimeIndex(pd.to_datetime(frame["date"]).unique()).sort_values()
    recent_sessions = sessions[-lookback_sessions:]
    recent = frame[pd.to_datetime(frame["date"]).isin(recent_sessions)].copy()
    recent["turnover"] = recent["close"] * recent["volume"]
    rows: list[dict[str, object]] = []
    for ticker, group in recent.groupby("ticker", sort=True):
        full = frame[frame["ticker"] == ticker]
        turnover = group["turnover"].replace([np.inf, -np.inf], np.nan).dropna()
        coverage = group["date"].nunique() / max(len(recent_sessions), 1)
        median_turnover = float(turnover.median()) if len(turnover) else 0.0
        p20_turnover = float(turnover.quantile(0.20)) if len(turnover) else 0.0
        if median_turnover >= 5_000_000 and p20_turnover >= 500_000 and coverage >= 0.85:
            tier = "tier_1_live"
        elif median_turnover >= 1_000_000 and p20_turnover >= 100_000 and coverage >= 0.75:
            tier = "tier_2_constrained"
        else:
            tier = "research_only"
        rows.append({
            "ticker": ticker,
            "sector": str(group["sector"].iloc[-1]),
            "tier": tier,
            "history_sessions": int(len(full)),
            "recent_session_coverage": float(coverage),
            "median_daily_turnover_egp": median_turnover,
            "p20_daily_turnover_egp": p20_turnover,
            "median_daily_volume": float(group["volume"].median()),
            "latest_adjusted_close": float(group.sort_values("date")["close"].iloc[-1]),
            "annualized_volatility": float(group["return_1"].std(ddof=0) * np.sqrt(252)),
            "illustrative_1pct_turnover_capacity_egp": median_turnover * 0.01,
            "latest_date": str(pd.to_datetime(group["date"]).max().date()),
        })
    universe = pd.DataFrame(rows).sort_values(
        ["tier", "median_daily_turnover_egp"], ascending=[True, False]
    )
    summary = {
        "asOfDate": str(sessions[-1].date()),
        "lookbackSessions": lookback_sessions,
        "tickerCount": len(universe),
        "tierCounts": universe["tier"].value_counts().to_dict(),
        "headlineTradeableCount": int(universe["tier"].isin(["tier_1_live", "tier_2_constrained"]).sum()),
        "thresholds": {
            "tier1": {"medianTurnoverEGP": 5_000_000, "p20TurnoverEGP": 500_000, "coverage": 0.85},
            "tier2": {"medianTurnoverEGP": 1_000_000, "p20TurnoverEGP": 100_000, "coverage": 0.75},
        },
        "note": "Liquidity tiers are operating assumptions for research, not execution guarantees.",
    }
    return universe, summary


def consolidate_leaderboards(paths: list[Path]) -> tuple[pd.DataFrame, pd.DataFrame]:
    frames: list[pd.DataFrame] = []
    for path in paths:
        frame = pd.read_csv(path)
        for column in (
            "b_and_h_max_drawdown", "average_mae", "average_mfe",
            "probability_mae_5", "probability_rmse_5",
        ):
            if column not in frame:
                frame[column] = np.nan
        frame.insert(0, "source_run", path.parent.parent.name if path.parent.name.isdigit() else path.parent.name)
        frames.append(frame)
    consolidated = pd.concat(frames, ignore_index=True)
    summary = consolidated.groupby(["source_run", "test_year", "model"], as_index=False).agg(
        tickers=("ticker", "nunique"),
        mean_strategy_roi=("total_return", "mean"),
        median_strategy_roi=("total_return", "median"),
        mean_b_and_h_roi=("b_and_h_return", "mean"),
        mean_excess_roi=("excess_return", "mean"),
        b_and_h_beat_rate=("excess_return", lambda values: float((values > 0).mean())),
        median_strategy_drawdown=("max_drawdown", "median"),
        median_b_and_h_drawdown=("b_and_h_max_drawdown", "median"),
        mean_exposure=("exposure", "mean"),
        mean_trades=("trade_count", "mean"),
        mean_return_mae_5=("return_mae_5", "mean"),
        mean_return_rmse_5=("return_rmse_5", "mean"),
        mean_brier_5=("brier_5", "mean"),
        mean_probability_mae_5=("probability_mae_5", "mean"),
        mean_probability_rmse_5=("probability_rmse_5", "mean"),
        mean_trade_mae=("average_mae", "mean"),
        mean_trade_mfe=("average_mfe", "mean"),
    )
    return consolidated, summary


def write_json(path: Path, payload: object) -> None:
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
