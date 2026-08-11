"""Train and economically validate the first pooled walk-forward signal model."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from quant_engine.backtest import BacktestConfig, QualificationPolicy
from quant_engine.data import add_point_in_time_eligibility
from quant_engine.models import WalkForwardTrainingConfig, train_walk_forward_classifier
from quant_engine.optimization import rank_champions, replay_accepted_predictions
from quant_engine.research import build_candidate_dataset

from ._common import build_source


def _json_ready(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if isinstance(value, (pd.Timestamp,)):
        return value.isoformat()
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _symbols(value: str | None) -> list[str] | None:
    if not value:
        return None
    symbols = [item.strip().upper().removesuffix(".CA") for item in value.split(",") if item.strip()]
    return list(dict.fromkeys(symbols)) or None


def _predictive_summary(predictions: pd.DataFrame) -> dict:
    if predictions.empty:
        return {"sample_count": 0, "accepted_count": 0, "accepted_precision": None, "accepted_recall": None}
    truth = predictions["label"].to_numpy(dtype=int)
    accepted = predictions["accepted"].to_numpy(dtype=bool)
    true_positives = int(truth[accepted].sum()) if accepted.any() else 0
    positives = int(truth.sum())
    return {
        "sample_count": len(predictions),
        "positive_rate": float(truth.mean()),
        "accepted_count": int(accepted.sum()),
        "accepted_precision": float(true_positives / accepted.sum()) if accepted.any() else None,
        "accepted_recall": float(true_positives / positives) if positives else None,
        "mean_probability": float(predictions["probability"].mean()),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train calibrated pooled EGX walk-forward models")
    parser.add_argument("--source", choices=["csv", "database"], default="csv")
    parser.add_argument("--tickers", help="Optional comma-separated model universe; context still uses all tickers")
    parser.add_argument("--replay-tickers", help="Optional comma-separated tickers for economic replay")
    parser.add_argument("--scale", action="append", choices=["small", "medium", "large"])
    parser.add_argument("--first-test-year", type=int, default=2021)
    parser.add_argument("--last-test-year", type=int)
    parser.add_argument("--n-estimators", type=int, default=250)
    parser.add_argument("--jobs", type=int, default=-1)
    parser.add_argument("--minimum-precision", type=float, default=0.75)
    parser.add_argument("--minimum-calibration-accepts", type=int, default=20)
    parser.add_argument("--minimum-train-samples", type=int, default=250)
    parser.add_argument("--minimum-calibration-samples", type=int, default=50)
    parser.add_argument("--minimum-trades", type=int, default=10)
    parser.add_argument("--maximum-drawdown", type=float, default=0.10)
    parser.add_argument("--disable-drawdown-gate", action="store_true")
    parser.add_argument("--commission-bps-per-side", type=float, default=10.0)
    parser.add_argument("--slippage-bps-per-side", type=float, default=15.0)
    parser.add_argument("--save-dataset", action="store_true")
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    scales = args.scale or ["small", "medium", "large"]
    model_symbols = _symbols(args.tickers)
    replay_symbols = _symbols(args.replay_tickers)
    source = build_source(args.source)
    bundle = source.load()
    eligible = add_point_in_time_eligibility(bundle.prices, bundle.tickers)
    dataset = build_candidate_dataset(eligible, bundle.tickers, ticker_symbols=model_symbols)

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    if args.save_dataset:
        dataset.rows.to_csv(output_dir / "candidate_rows.csv.gz", index=False, compression="gzip")

    training_config = WalkForwardTrainingConfig(
        first_test_year=args.first_test_year,
        last_test_year=args.last_test_year,
        minimum_precision=args.minimum_precision,
        minimum_accepted_calibration=args.minimum_calibration_accepts,
        minimum_train_samples=args.minimum_train_samples,
        minimum_calibration_samples=args.minimum_calibration_samples,
        n_estimators=args.n_estimators,
        n_jobs=args.jobs,
    )
    backtest_config = BacktestConfig(
        commission_bps_per_side=args.commission_bps_per_side,
        slippage_bps_per_side=args.slippage_bps_per_side,
    )
    drawdown_gate = None if args.disable_drawdown_gate else args.maximum_drawdown
    qualification_policy = QualificationPolicy(
        minimum_win_rate=args.minimum_precision,
        minimum_trades=args.minimum_trades,
        maximum_drawdown=drawdown_gate,
    )

    available_tickers = sorted(dataset.rows["ticker_symbol"].unique())
    if replay_symbols is None:
        replay_symbols = available_tickers
    else:
        replay_symbols = [symbol for symbol in replay_symbols if symbol in available_tickers]

    scale_summaries: dict[str, dict] = {}
    economic_reports: list[dict] = []
    replay_end = (
        pd.Timestamp(args.last_test_year + 1, 1, 1) - pd.Timedelta(days=1)
        if args.last_test_year is not None
        else eligible["date"].max()
    )
    for scale in scales:
        scale_dir = output_dir / scale
        scale_dir.mkdir(parents=True, exist_ok=True)
        model_result = train_walk_forward_classifier(dataset, scale, config=training_config)
        model_result.predictions.to_csv(scale_dir / "oos_predictions.csv", index=False)
        model_result.feature_importance.to_csv(scale_dir / "feature_importance_by_fold.csv", index=False)
        (scale_dir / "fold_metrics.json").write_text(
            json.dumps(model_result.fold_metrics, indent=2, default=_json_ready), encoding="utf-8"
        )
        joblib.dump(model_result.artifacts, scale_dir / "fold_models.joblib")
        scale_summaries[scale] = {
            "predictive": _predictive_summary(model_result.predictions),
            "trained_fold_count": len(model_result.artifacts),
            "skipped_fold_count": sum(item["status"] == "skipped" for item in model_result.fold_metrics),
        }

        for ticker in replay_symbols:
            ticker_prices = eligible.loc[eligible["ticker_symbol"].eq(ticker)].reset_index(drop=True)
            if len(ticker_prices.loc[ticker_prices["date"].ge(pd.Timestamp(args.first_test_year, 1, 1))]) < 2:
                continue
            try:
                metrics, backtest = replay_accepted_predictions(
                    ticker_prices,
                    model_result.predictions,
                    scale,
                    start_date=pd.Timestamp(args.first_test_year, 1, 1),
                    end_date=replay_end,
                    backtest_config=backtest_config,
                    qualification_policy=qualification_policy,
                )
            except ValueError as error:
                economic_reports.append({"ticker_symbol": ticker, "scale": scale, "error": str(error)})
                continue
            economic_reports.append(metrics)
            replay_dir = scale_dir / "replay" / ticker
            replay_dir.mkdir(parents=True, exist_ok=True)
            pd.DataFrame([trade.to_dict() for trade in backtest.trades]).to_csv(
                replay_dir / "trades.csv", index=False
            )
            backtest.equity_curve.to_csv(replay_dir / "equity_curve.csv", index=False)
            (replay_dir / "metrics.json").write_text(
                json.dumps(metrics, indent=2, default=_json_ready), encoding="utf-8"
            )

    valid_reports = [report for report in economic_reports if "error" not in report]
    ticker_selection = {
        ticker: rank_champions(
            [report for report in valid_reports if report["ticker_symbol"] == ticker],
            minimum_win_rate=args.minimum_precision,
            minimum_trades=args.minimum_trades,
            maximum_drawdown=drawdown_gate,
        )
        for ticker in replay_symbols
    }
    summary = {
        "engine": "pooled-xgboost-walk-forward-v1",
        "data_snapshot": bundle.snapshot.to_dict(),
        "data_quality": bundle.quality.to_dict(),
        "candidate_rows": len(dataset.rows),
        "candidate_tickers": dataset.ticker_count,
        "feature_count": len(dataset.feature_columns),
        "model_universe": model_symbols or "all_eligible_candidates",
        "replay_tickers": replay_symbols,
        "scales": scale_summaries,
        "training_config": asdict(training_config),
        "execution_config": asdict(backtest_config),
        "qualification_policy": asdict(qualification_policy),
        "ticker_selection": ticker_selection,
    }
    (output_dir / "run_summary.json").write_text(
        json.dumps(summary, indent=2, default=_json_ready), encoding="utf-8"
    )
    pd.DataFrame(economic_reports).to_csv(output_dir / "economic_replay_summary.csv", index=False)
    print(json.dumps(summary, indent=2, default=_json_ready))


if __name__ == "__main__":
    main()
