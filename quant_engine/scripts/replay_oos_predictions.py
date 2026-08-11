"""Economically replay saved OOS predictions without retraining models."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from quant_engine.backtest import BacktestConfig, QualificationPolicy
from quant_engine.data import add_point_in_time_eligibility
from quant_engine.optimization import rank_champions, replay_accepted_predictions

from ._common import build_source


def _json_ready(value):
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, pd.Timestamp):
        return value.isoformat()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _symbols(value: str | None) -> list[str] | None:
    if not value:
        return None
    return list(dict.fromkeys(
        item.strip().upper().removesuffix(".CA") for item in value.split(",") if item.strip()
    )) or None


def main() -> None:
    parser = argparse.ArgumentParser(description="Replay saved locked OOS predictions")
    parser.add_argument("--predictions-root", type=Path, required=True)
    parser.add_argument("--source", choices=["csv", "database"], default="csv")
    parser.add_argument("--tickers", help="Optional comma-separated replay universe")
    parser.add_argument("--scale", action="append", choices=["small", "medium", "large"])
    parser.add_argument("--start", default="2021-01-01")
    parser.add_argument("--end")
    parser.add_argument("--minimum-win-rate", type=float, default=0.75)
    parser.add_argument("--minimum-trades", type=int, default=10)
    parser.add_argument("--maximum-drawdown", type=float, default=0.10)
    parser.add_argument("--disable-drawdown-gate", action="store_true")
    parser.add_argument("--commission-bps-per-side", type=float, default=10.0)
    parser.add_argument("--slippage-bps-per-side", type=float, default=15.0)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    predictions_root = args.predictions_root.resolve()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    scales = args.scale or ["small", "medium", "large"]
    predictions = {
        scale: pd.read_csv(predictions_root / scale / "oos_predictions.csv", parse_dates=["date"])
        for scale in scales
    }
    prediction_tickers = sorted(set().union(*(
        set(frame["ticker_symbol"].unique()) for frame in predictions.values() if not frame.empty
    )))
    requested = _symbols(args.tickers)
    replay_tickers = prediction_tickers if requested is None else [ticker for ticker in requested if ticker in prediction_tickers]

    bundle = build_source(args.source).load()
    eligible = add_point_in_time_eligibility(bundle.prices, bundle.tickers)
    backtest_config = BacktestConfig(
        commission_bps_per_side=args.commission_bps_per_side,
        slippage_bps_per_side=args.slippage_bps_per_side,
    )
    drawdown_gate = None if args.disable_drawdown_gate else args.maximum_drawdown
    policy = QualificationPolicy(
        minimum_win_rate=args.minimum_win_rate,
        minimum_trades=args.minimum_trades,
        maximum_drawdown=drawdown_gate,
    )
    start = pd.Timestamp(args.start)
    end = pd.Timestamp(args.end) if args.end else eligible["date"].max()

    reports: list[dict] = []
    for scale, scale_predictions in predictions.items():
        for ticker in replay_tickers:
            ticker_prices = eligible.loc[eligible["ticker_symbol"].eq(ticker)].reset_index(drop=True)
            if len(ticker_prices.loc[ticker_prices["date"].between(start, end)]) < 2:
                continue
            try:
                metrics, backtest = replay_accepted_predictions(
                    ticker_prices,
                    scale_predictions,
                    scale,
                    start_date=start,
                    end_date=end,
                    backtest_config=backtest_config,
                    qualification_policy=policy,
                )
            except ValueError as error:
                reports.append({"ticker_symbol": ticker, "scale": scale, "error": str(error)})
                continue
            reports.append(metrics)
            ticker_dir = output_dir / scale / ticker
            ticker_dir.mkdir(parents=True, exist_ok=True)
            pd.DataFrame([trade.to_dict() for trade in backtest.trades]).to_csv(ticker_dir / "trades.csv", index=False)
            backtest.equity_curve.to_csv(ticker_dir / "equity_curve.csv", index=False)
            (ticker_dir / "metrics.json").write_text(
                json.dumps(metrics, indent=2, default=_json_ready), encoding="utf-8"
            )

    valid = [report for report in reports if "error" not in report]
    selection = {
        ticker: rank_champions(
            [report for report in valid if report["ticker_symbol"] == ticker],
            minimum_win_rate=args.minimum_win_rate,
            minimum_trades=args.minimum_trades,
            maximum_drawdown=drawdown_gate,
        )
        for ticker in replay_tickers
    }
    summary = {
        "predictions_root": str(predictions_root),
        "data_snapshot": bundle.snapshot.to_dict(),
        "period": {"start": str(start.date()), "end": str(end.date())},
        "ticker_count": len(replay_tickers),
        "scales": scales,
        "qualified_tickers": [ticker for ticker, result in selection.items() if result["champion"] is not None],
        "ticker_selection": selection,
    }
    (output_dir / "replay_summary.json").write_text(
        json.dumps(summary, indent=2, default=_json_ready), encoding="utf-8"
    )
    pd.DataFrame(reports).to_csv(output_dir / "economic_replay_summary.csv", index=False)
    print(json.dumps(
        {
            "ticker_count": len(replay_tickers),
            "report_count": len(valid),
            "qualified_tickers": summary["qualified_tickers"],
            "output": str(output_dir),
        },
        indent=2,
    ))


if __name__ == "__main__":
    main()
