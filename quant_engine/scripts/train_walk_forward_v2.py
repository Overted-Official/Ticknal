"""Train, cache, and economically validate cost-aware pooled model v2."""

from __future__ import annotations

import argparse
import json
from dataclasses import asdict
from hashlib import sha256
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from quant_engine.backtest import BacktestConfig, QualificationPolicy
from quant_engine.data import add_point_in_time_eligibility
from quant_engine.models import MultiTaskTrainingConfig, train_multitask_walk_forward
from quant_engine.optimization import rank_champions, replay_accepted_predictions
from quant_engine.research import CandidateDataset, build_candidate_dataset_v2

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
    if isinstance(value, Path):
        return str(value)
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def _symbols(value: str | None) -> list[str] | None:
    if not value:
        return None
    normalized = [item.strip().upper().removesuffix(".CA") for item in value.split(",") if item.strip()]
    return list(dict.fromkeys(normalized)) or None


def _cache_key(snapshot_identity: str, symbols: list[str] | None, commission: float, slippage: float) -> str:
    payload = json.dumps(
        {
            "dataset": "expanded-cost-aware-v2",
            "snapshot_identity": snapshot_identity,
            "symbols": sorted(symbols) if symbols else None,
            "commission_bps_per_side": commission,
            "slippage_bps_per_side": slippage,
        },
        sort_keys=True,
    )
    return sha256(payload.encode("utf-8")).hexdigest()[:20]


def _load_or_build_dataset(
    *,
    cache_dir: Path,
    bundle,
    eligible: pd.DataFrame,
    symbols: list[str] | None,
    commission: float,
    slippage: float,
) -> tuple[CandidateDataset, Path, bool]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    key = _cache_key(bundle.snapshot.identity, symbols, commission, slippage)
    cache_path = cache_dir / f"candidate_dataset_v2_{key}.joblib"
    if cache_path.exists():
        cached = joblib.load(cache_path)
        if (
            isinstance(cached, dict)
            and cached.get("snapshot_identity") == bundle.snapshot.identity
            and cached.get("symbols") == (sorted(symbols) if symbols else None)
            and isinstance(cached.get("dataset"), CandidateDataset)
        ):
            return cached["dataset"], cache_path, True

    dataset = build_candidate_dataset_v2(
        eligible,
        bundle.tickers,
        ticker_symbols=symbols,
        commission_bps_per_side=commission,
        slippage_bps_per_side=slippage,
    )
    joblib.dump(
        {
            "snapshot_identity": bundle.snapshot.identity,
            "symbols": sorted(symbols) if symbols else None,
            "commission_bps_per_side": commission,
            "slippage_bps_per_side": slippage,
            "dataset": dataset,
        },
        cache_path,
        compress=3,
    )
    return dataset, cache_path, False


def _predictive_summary(predictions: pd.DataFrame) -> dict:
    if predictions.empty:
        return {"sample_count": 0, "accepted_count": 0, "accepted_precision": None, "accepted_recall": None}
    truth = predictions["label"].to_numpy(dtype=int)
    accepted = predictions["accepted"].to_numpy(dtype=bool)
    true_positives = int(truth[accepted].sum()) if accepted.any() else 0
    positives = int(truth.sum())
    errors = predictions["predicted_net_return"] - predictions["actual_net_return"]
    return {
        "sample_count": len(predictions),
        "positive_rate": float(truth.mean()),
        "accepted_count": int(accepted.sum()),
        "accepted_precision": float(true_positives / accepted.sum()) if accepted.any() else None,
        "accepted_recall": float(true_positives / positives) if positives else None,
        "accepted_actual_net_return_mean": float(predictions.loc[accepted, "actual_net_return"].mean())
        if accepted.any()
        else None,
        "return_mae": float(errors.abs().mean()),
        "return_rmse": float(np.sqrt(np.mean(np.square(errors)))),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Train cost-aware pooled EGX walk-forward model v2")
    parser.add_argument("--source", choices=["csv", "database"], default="csv")
    parser.add_argument("--tickers", help="Optional comma-separated model universe; context still uses all tickers")
    parser.add_argument("--replay-tickers", help="Optional comma-separated economic replay universe")
    parser.add_argument("--scale", action="append", choices=["small", "medium", "large"])
    parser.add_argument("--first-test-year", type=int, default=2021)
    parser.add_argument("--last-test-year", type=int)
    parser.add_argument("--n-estimators", type=int, default=200)
    parser.add_argument("--jobs", type=int, default=-1)
    parser.add_argument("--minimum-precision", type=float, default=0.75)
    parser.add_argument("--minimum-selection-accepts", type=int, default=20)
    parser.add_argument("--minimum-daily-rank", type=float, default=0.75)
    parser.add_argument("--minimum-predicted-net-return", type=float, default=0.0)
    parser.add_argument("--minimum-train-samples", type=int, default=500)
    parser.add_argument("--minimum-calibration-samples", type=int, default=100)
    parser.add_argument("--minimum-trades", type=int, default=10)
    parser.add_argument("--maximum-drawdown", type=float, default=0.10)
    parser.add_argument("--disable-drawdown-gate", action="store_true")
    parser.add_argument("--commission-bps-per-side", type=float, default=10.0)
    parser.add_argument("--slippage-bps-per-side", type=float, default=15.0)
    parser.add_argument("--cache-dir", type=Path)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    cache_dir = (args.cache_dir or (output_dir / "cache")).resolve()
    model_symbols = _symbols(args.tickers)
    replay_symbols = _symbols(args.replay_tickers)
    scales = args.scale or ["small", "medium", "large"]

    bundle = build_source(args.source).load()
    eligible = add_point_in_time_eligibility(bundle.prices, bundle.tickers)
    dataset, cache_path, cache_hit = _load_or_build_dataset(
        cache_dir=cache_dir,
        bundle=bundle,
        eligible=eligible,
        symbols=model_symbols,
        commission=args.commission_bps_per_side,
        slippage=args.slippage_bps_per_side,
    )
    training_config = MultiTaskTrainingConfig(
        first_test_year=args.first_test_year,
        last_test_year=args.last_test_year,
        minimum_precision=args.minimum_precision,
        minimum_accepted_selection=args.minimum_selection_accepts,
        minimum_train_samples=args.minimum_train_samples,
        minimum_calibration_samples=args.minimum_calibration_samples,
        minimum_daily_probability_rank=args.minimum_daily_rank,
        minimum_predicted_net_return=args.minimum_predicted_net_return,
        n_estimators=args.n_estimators,
        n_jobs=args.jobs,
    )
    backtest_config = BacktestConfig(
        commission_bps_per_side=args.commission_bps_per_side,
        slippage_bps_per_side=args.slippage_bps_per_side,
    )
    drawdown_gate = None if args.disable_drawdown_gate else args.maximum_drawdown
    policy = QualificationPolicy(
        minimum_win_rate=args.minimum_precision,
        minimum_trades=args.minimum_trades,
        maximum_drawdown=drawdown_gate,
    )
    available_tickers = sorted(dataset.rows["ticker_symbol"].unique())
    replay_symbols = available_tickers if replay_symbols is None else [
        symbol for symbol in replay_symbols if symbol in available_tickers
    ]
    replay_end = (
        pd.Timestamp(args.last_test_year + 1, 1, 1) - pd.Timedelta(days=1)
        if args.last_test_year is not None
        else eligible["date"].max()
    )

    scale_summaries: dict[str, dict] = {}
    economic_reports: list[dict] = []
    for scale in scales:
        scale_dir = output_dir / scale
        scale_dir.mkdir(parents=True, exist_ok=True)
        model_result = train_multitask_walk_forward(dataset, scale, config=training_config)
        model_result.predictions.to_csv(scale_dir / "oos_predictions.csv", index=False)
        model_result.feature_importance.to_csv(scale_dir / "feature_importance_by_fold.csv", index=False)
        (scale_dir / "fold_metrics.json").write_text(
            json.dumps(model_result.fold_metrics, indent=2, default=_json_ready), encoding="utf-8"
        )
        joblib.dump(model_result.artifacts, scale_dir / "fold_models.joblib", compress=3)
        scale_summaries[scale] = {
            "predictive": _predictive_summary(model_result.predictions),
            "trained_fold_count": len(model_result.artifacts),
            "skipped_fold_count": sum(item["status"] == "skipped" for item in model_result.fold_metrics),
        }

        for ticker in replay_symbols:
            ticker_prices = eligible.loc[eligible["ticker_symbol"].eq(ticker)].reset_index(drop=True)
            if len(ticker_prices.loc[ticker_prices["date"].between(
                pd.Timestamp(args.first_test_year, 1, 1), replay_end
            )]) < 2:
                continue
            try:
                metrics, backtest = replay_accepted_predictions(
                    ticker_prices,
                    model_result.predictions,
                    scale,
                    start_date=pd.Timestamp(args.first_test_year, 1, 1),
                    end_date=replay_end,
                    backtest_config=backtest_config,
                    qualification_policy=policy,
                )
            except ValueError as error:
                economic_reports.append({"ticker_symbol": ticker, "scale": scale, "error": str(error)})
                continue
            economic_reports.append(metrics)
            replay_dir = scale_dir / "replay" / ticker
            replay_dir.mkdir(parents=True, exist_ok=True)
            pd.DataFrame([trade.to_dict() for trade in backtest.trades]).to_csv(replay_dir / "trades.csv", index=False)
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
        "engine": "pooled-xgboost-multitask-v2",
        "data_snapshot": bundle.snapshot.to_dict(),
        "data_quality": bundle.quality.to_dict(),
        "dataset_cache": {"path": str(cache_path), "cache_hit": cache_hit},
        "candidate_rows": len(dataset.rows),
        "candidate_tickers": dataset.ticker_count,
        "feature_count": len(dataset.feature_columns),
        "model_universe": model_symbols or "all_eligible_candidates",
        "replay_tickers": replay_symbols,
        "scales": scale_summaries,
        "training_config": asdict(training_config),
        "execution_config": asdict(backtest_config),
        "qualification_policy": asdict(policy),
        "ticker_selection": ticker_selection,
    }
    (output_dir / "run_summary.json").write_text(
        json.dumps(summary, indent=2, default=_json_ready), encoding="utf-8"
    )
    pd.DataFrame(economic_reports).to_csv(output_dir / "economic_replay_summary.csv", index=False)
    print(json.dumps(summary, indent=2, default=_json_ready))


if __name__ == "__main__":
    main()
