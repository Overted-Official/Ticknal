"""Command-line research pipeline for Quantum Exhaustion v2."""

from __future__ import annotations

import argparse
import json
from dataclasses import replace
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
import torch
from dotenv import load_dotenv

from .backtest import (
    PolicyConfig, backtest_universe, calibrate_policy, offline_price_swings, swing_capture_metrics,
)
from .baselines import BoostedTreeBaseline, EmpiricalExhaustionBaseline, LogisticHazardBaseline
from .config import DYNAMIC_FEATURES, PROJECT_ROOT, QEConfig
from .data import (
    apply_adjustment_ledger,
    audit_prices,
    build_causal_dataset,
    load_database_prices,
    load_prices,
)
from .deployment import export_deployment_bundle
from .models import (
    CategoryMaps,
    FeatureScaler,
    HorizonCalibrator,
    SequenceDataset,
    build_model,
    load_model_bundle,
    predict_model,
    save_model_bundle,
    set_deterministic_seed,
    train_model,
)
from .tracking import start_experiment
from .reporting import build_tradeable_universe, consolidate_leaderboards, write_json as write_report_json
from .swings import pivot_event_table
from .validation import (
    discrete_survival_nll, make_walk_forward_folds, metric_dispersion, paired_bootstrap_advantage,
    reversal_metrics, split_fold, ticker_diagnostics,
)


def _write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")


def _load_source(args: argparse.Namespace) -> pd.DataFrame:
    if getattr(args, "input", None):
        return load_prices(Path(args.input))
    return load_database_prices(getattr(args, "database_url", None))


def _read_frame(path: str | Path) -> pd.DataFrame:
    source = Path(path)
    frame = pd.read_parquet(source) if source.suffix.lower() in {".parquet", ".pq"} else pd.read_csv(source)
    frame["date"] = pd.to_datetime(frame["date"])
    return frame


def _device(name: str) -> torch.device:
    if name == "auto":
        return torch.device("cuda" if torch.cuda.is_available() else "cpu")
    return torch.device(name)


def _dates(frame: pd.DataFrame, start: str, end: str) -> set[pd.Timestamp]:
    values = pd.to_datetime(frame["date"])
    return set(values[(values >= start) & (values <= end)].unique())


def _trim_sessions(frame: pd.DataFrame, drop_start: int = 0, drop_end: int = 0) -> pd.DataFrame:
    sessions = pd.DatetimeIndex(pd.to_datetime(frame["date"]).unique()).sort_values()
    if len(sessions) <= drop_start + drop_end:
        return frame.iloc[0:0].copy()
    selected = sessions[drop_start : len(sessions) - drop_end if drop_end else None]
    return frame[pd.to_datetime(frame["date"]).isin(selected)].copy()


def _prediction_truth(dataset: SequenceDataset, predictions: pd.DataFrame) -> pd.DataFrame:
    indices = predictions["row_index"].astype(int).to_numpy()
    return dataset.frame.iloc[indices].reset_index(drop=True)


def _deep_to_common(prediction: pd.DataFrame) -> pd.DataFrame:
    return prediction.rename(columns={
        "reversal_probability_3": "p_reversal_3",
        "reversal_probability_5": "p_reversal_5",
        "reversal_probability_10": "p_reversal_10",
    })


def _attach_prediction(frame: pd.DataFrame, prediction: pd.DataFrame) -> pd.DataFrame:
    scored = frame.reset_index(drop=True).copy()
    for column in prediction.columns:
        if column == "row_index":
            continue
        scored[column] = prediction[column].to_numpy()
    return scored.rename(columns={f"p_reversal_{horizon}": f"reversal_probability_{horizon}" for horizon in (3, 5, 10)})


def _predictive_metrics(frame: pd.DataFrame, prediction: pd.DataFrame) -> dict[str, float]:
    metrics = reversal_metrics(frame, prediction)
    hazard_columns = [f"hazard_probability_{day}" for day in range(1, 11)]
    if all(column in prediction for column in hazard_columns):
        metrics["survival_nll"] = discrete_survival_nll(frame, prediction[hazard_columns].to_numpy())
    return metrics


def _economic_oos(
    calibration_scores: pd.DataFrame, test_scores: pd.DataFrame,
) -> tuple[dict[str, float], PolicyConfig, pd.DataFrame]:
    policy, _ = calibrate_policy(calibration_scores)
    ledger, _, ticker_metrics, summary = backtest_universe(test_scores, policy)
    summary.update(swing_capture_metrics(ledger, offline_price_swings(test_scores)))
    return summary, policy, ticker_metrics


def command_audit_data(args: argparse.Namespace) -> None:
    config = QEConfig(minimum_history=args.minimum_history)
    raw = _load_source(args)
    ledger_path = Path(args.adjustment_ledger) if args.adjustment_ledger else None
    adjusted, unresolved = apply_adjustment_ledger(raw, ledger_path)
    audit = audit_prices(adjusted, config, unresolved)
    output = Path(args.output or config.support_dir / "data_audit.json")
    _write_json(output, audit.to_dict())
    print(f"Wrote data audit: {output}")


def command_build_dataset(args: argparse.Namespace) -> None:
    config = QEConfig(minimum_history=args.minimum_history)
    raw = _load_source(args)
    adjusted, unresolved = apply_adjustment_ledger(raw, Path(args.adjustment_ledger) if args.adjustment_ledger else None)
    audit = audit_prices(adjusted, config, unresolved)
    clean = adjusted[adjusted["ticker"].isin(audit.eligible_symbols)].copy()
    dataset = build_causal_dataset(clean, config)
    output = Path(args.output or config.support_dir / "causal_dataset.parquet")
    output.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_parquet(output, index=False)
    events_output = output.with_name(f"{output.stem}.price_swing_events.parquet")
    events = pivot_event_table(dataset)
    events.to_parquet(events_output, index=False)
    _write_json(output.with_suffix(".manifest.json"), {
        "rows": len(dataset), "tickers": int(dataset["ticker"].nunique()),
        "start": dataset["date"].min(), "end": dataset["date"].max(),
        "priceSwingEvents": len(events), "priceSwingEventsPath": str(events_output),
        "config": config.to_dict(), "audit": audit.to_dict(),
    })
    print(f"Wrote causal dataset: {output}")
    print(f"Wrote confirmed price-swing events: {events_output}")


def _train_one(
    model_type: str,
    seed: int,
    train: pd.DataFrame,
    context: pd.DataFrame,
    calibration_dates: set[pd.Timestamp],
    output_dir: Path,
    config: QEConfig,
    device: torch.device,
    metadata: dict[str, Any],
    comet_enabled: bool | None = None,
) -> tuple[Path, pd.DataFrame, pd.DataFrame]:
    set_deterministic_seed(seed)
    scaler = FeatureScaler.fit(train)
    categories = CategoryMaps.fit(train)
    train_dataset = SequenceDataset(
        train, scaler, categories, config.default_sequence_length, require_labels=True
    )
    calibration_dataset = SequenceDataset(
        context, scaler, categories, config.default_sequence_length, calibration_dates, require_labels=True
    )
    if not len(train_dataset) or not len(calibration_dataset):
        raise ValueError("Not enough ticker-safe sequences for the requested train/calibration split")
    model = build_model(model_type, len(DYNAMIC_FEATURES), categories, config)
    tracker = start_experiment(
        f"{model_type}-seed-{seed}-{metadata.get('testYear', 'final')}",
        {
            **metadata, "modelType": model_type, "seed": seed,
            "trainSequences": len(train_dataset), "calibrationSequences": len(calibration_dataset),
            "parameterCount": sum(parameter.numel() for parameter in model.parameters()),
            "config": config.to_dict(),
        },
        tags=["qe-v2", model_type, f"seed-{seed}"],
        enabled=comet_enabled,
    )
    try:
        result = train_model(
            model, train_dataset, calibration_dataset, config, seed, device,
            metric_callback=lambda record: tracker.log_metrics(record, step=int(record["epoch"]), prefix="training"),
        )
    except BaseException:
        tracker.end("failed")
        raise
    calibration_prediction = predict_model(result.model, calibration_dataset, device)
    calibration_truth = _prediction_truth(calibration_dataset, calibration_prediction)
    calibrator = HorizonCalibrator().fit(calibration_prediction, calibration_truth)
    calibration_prediction = calibrator.transform(calibration_prediction)
    bundle = output_dir / f"{model_type}_seed_{seed}"
    save_model_bundle(bundle, result.model, model_type, scaler, categories, config, calibrator, {
        **metadata, "seed": seed, "bestValidationLoss": result.best_validation_loss,
        "epochsCompleted": result.epochs_completed, "history": result.history,
        "lossScales": result.loss_scales.to_dict(),
        "parameterCount": sum(parameter.numel() for parameter in result.model.parameters()),
    })
    calibration_metrics = _predictive_metrics(calibration_truth, _deep_to_common(calibration_prediction))
    _write_json(bundle / "calibration_metrics.json", calibration_metrics)
    tracker.log_metrics(calibration_metrics, prefix="calibration")
    tracker.log_asset(bundle / "model.json", "bundle")
    tracker.log_asset(bundle / "calibration_metrics.json", "reports")
    tracker.end()
    return bundle, calibration_prediction, calibration_truth


def command_train(args: argparse.Namespace) -> None:
    frame = _read_frame(args.dataset)
    config = replace(
        QEConfig(), epochs=args.epochs, default_sequence_length=args.sequence_length,
        hidden_channels=args.hidden_channels, batch_size=args.batch_size,
        max_train_sequences=args.max_train_sequences,
        max_calibration_sequences=args.max_calibration_sequences,
    )
    train_raw = frame[pd.to_datetime(frame["date"]) <= args.train_end].copy()
    calibration_raw = frame[(pd.to_datetime(frame["date"]) >= args.calibration_start) &
                            (pd.to_datetime(frame["date"]) <= args.calibration_end)].copy()
    train = _trim_sessions(train_raw, drop_end=config.purge_sessions)
    calibration = _trim_sessions(
        calibration_raw, drop_start=config.embargo_sessions, drop_end=config.purge_sessions
    )
    context = frame[pd.to_datetime(frame["date"]) <= args.calibration_end].copy()
    calibration_dates = set(pd.to_datetime(calibration["date"]).unique())
    output = Path(args.output or config.support_dir / "models")
    seeds = tuple(int(value) for value in args.seeds.split(","))
    device = _device(args.device)
    bundles = []
    for seed in seeds:
        bundle, prediction, truth = _train_one(
            args.model, seed, train, context, calibration_dates, output, config, device,
            {"trainEnd": args.train_end, "calibrationStart": args.calibration_start,
             "calibrationEnd": args.calibration_end, "sealedTestUntouched": True}, args.comet,
        )
        bundles.append(str(bundle))
    _write_json(output / f"{args.model}_ensemble.json", {"modelType": args.model, "bundles": bundles, "seeds": seeds})
    print(f"Trained {len(bundles)} {args.model.upper()} seeds in {output}")


def _score_bundles(
    frame: pd.DataFrame,
    bundle_dirs: list[Path],
    device: torch.device,
    eligible_dates: set[pd.Timestamp] | None = None,
) -> pd.DataFrame:
    member_scores: list[pd.DataFrame] = []
    truths: list[pd.DataFrame] = []
    for bundle_dir in bundle_dirs:
        model, scaler, categories, config, calibrator, _ = load_model_bundle(bundle_dir, device)
        dataset = SequenceDataset(
            frame, scaler, categories, config.default_sequence_length, eligible_dates=eligible_dates
        )
        prediction = predict_model(model, dataset, device)
        if calibrator is not None:
            prediction = calibrator.transform(prediction)
        truth = _prediction_truth(dataset, prediction)
        keys = truth[["ticker", "date"]].reset_index(drop=True)
        member = pd.concat([keys, prediction.drop(columns="row_index").reset_index(drop=True)], axis=1)
        member_scores.append(member)
        truths.append(truth)
    if not member_scores:
        raise ValueError("At least one --bundle is required")
    numeric = [column for column in member_scores[0].columns if column not in {"ticker", "date"}]
    stacked = pd.concat(member_scores, keys=[str(index) for index in range(len(member_scores))], names=["member"])
    mean = stacked.groupby(["ticker", "date"], as_index=False)[numeric].mean()
    uncertainty = stacked.groupby(["ticker", "date"])["reversal_probability_5"].std(ddof=0).rename("prediction_uncertainty").reset_index()
    score = mean.merge(uncertainty, on=["ticker", "date"], how="left")
    source = frame.sort_values(["ticker", "date"]).drop_duplicates(["ticker", "date"])
    return source.merge(score, on=["ticker", "date"], how="inner")


def command_score(args: argparse.Namespace) -> None:
    frame = _read_frame(args.dataset)
    scores = _score_bundles(frame, [Path(path) for path in args.bundle], _device(args.device))
    output = Path(args.output or QEConfig().support_dir / "scores.parquet")
    output.parent.mkdir(parents=True, exist_ok=True)
    scores.to_parquet(output, index=False)
    print(f"Wrote {len(scores):,} causal sequence scores: {output}")


def command_walk_forward(args: argparse.Namespace) -> None:
    frame = _read_frame(args.dataset)
    config = replace(
        QEConfig(), epochs=args.epochs, default_sequence_length=args.sequence_length,
        hidden_channels=args.hidden_channels, batch_size=args.batch_size,
        max_train_sequences=args.max_train_sequences,
        max_calibration_sequences=args.max_calibration_sequences,
    )
    folds = make_walk_forward_folds(frame["date"], args.first_test_year, args.last_test_year,
                                    config.purge_sessions, config.embargo_sessions)
    output = Path(args.output or config.support_dir / "walk_forward")
    output.mkdir(parents=True, exist_ok=True)
    report: list[dict[str, Any]] = []
    leaderboard_rows: list[pd.DataFrame] = []
    device = _device(args.device)
    for fold in folds:
        train, calibration, test = split_fold(frame, fold)
        fold_report: dict[str, Any] = {"fold": fold.to_dict(), "models": {}}
        for name, estimator in (
            ("empirical", EmpiricalExhaustionBaseline()),
            ("logistic_hazard", LogisticHazardBaseline()),
            (args.boosted_engine, BoostedTreeBaseline(args.boosted_engine)),
        ):
            estimator.fit(train)
            calibration_prediction = estimator.predict(calibration).reset_index(drop=True)
            test_prediction = estimator.predict(test).reset_index(drop=True)
            test_scored = _attach_prediction(test, test_prediction)
            economic, policy, ticker_economic = _economic_oos(
                _attach_prediction(calibration, calibration_prediction), test_scored,
            )
            diagnostics = ticker_diagnostics(test, test_prediction)
            ticker_leaderboard = ticker_economic.merge(diagnostics, on="ticker", how="outer")
            ticker_leaderboard.insert(0, "model", name)
            ticker_leaderboard.insert(0, "test_year", fold.test_year)
            leaderboard_rows.append(ticker_leaderboard)
            fold_output = output / str(fold.test_year)
            fold_output.mkdir(parents=True, exist_ok=True)
            ticker_leaderboard.to_csv(fold_output / f"leaderboard_{name}.csv", index=False)
            model_report = {
                "predictive": _predictive_metrics(test, test_prediction),
                "dispersion": {
                    group: metric_dispersion(test, test_prediction, group)
                    for group in ("sector", "ticker", "market_regime")
                },
                "economic": economic,
                "policy": policy.to_dict(),
            }
            fold_report["models"][name] = model_report
            tracker = start_experiment(
                f"{name}-fold-{fold.test_year}",
                {"modelType": name, "fold": fold.to_dict(), "policy": policy.to_dict()},
                tags=["qe-v2", "baseline", name, f"test-{fold.test_year}"],
                enabled=args.comet,
            )
            tracker.log_metrics(model_report, prefix="oos")
            tracker.log_asset(fold_output / f"leaderboard_{name}.csv", "leaderboards")
            tracker.end()
        context = frame[pd.to_datetime(frame["date"]) <= fold.calibration_end].copy()
        calibration_dates = set(pd.to_datetime(calibration["date"]).unique())
        deep_models = [] if args.deep_models.strip().lower() == "none" else args.deep_models.split(",")
        for model_type in deep_models:
            seed_predictions: list[pd.DataFrame] = []
            calibration_members: list[pd.DataFrame] = []
            calibration_truth: pd.DataFrame | None = None
            for seed in (int(value) for value in args.seeds.split(",")):
                bundle, calibration_prediction, member_truth = _train_one(
                    model_type, seed, train, context, calibration_dates,
                    output / str(fold.test_year), config, device,
                    {"fold": fold.to_dict(), "testYear": fold.test_year}, args.comet,
                )
                calibration_members.append(calibration_prediction)
                calibration_truth = member_truth
                scoring_context = frame[pd.to_datetime(frame["date"]) <= fold.test_end].copy()
                scored = _score_bundles(
                    scoring_context, [bundle], device,
                    set(pd.to_datetime(test["date"]).unique()),
                )
                scored = scored[scored["date"].isin(pd.to_datetime(test["date"]).unique())]
                seed_predictions.append(scored)
            numeric = [
                column for column in seed_predictions[0].columns
                if column.startswith(("reversal_probability_", "hazard_probability_", "expected_"))
                or column in {"barrier_probability", "rank_score", "prediction_uncertainty"}
            ]
            ensemble = pd.concat(seed_predictions).groupby(["ticker", "date"], as_index=False)[numeric].mean()
            truth = test.merge(ensemble, on=["ticker", "date"], how="inner")
            pred = truth.rename(columns={f"reversal_probability_{h}": f"p_reversal_{h}" for h in (3, 5, 10)})
            assert calibration_truth is not None
            calibration_numeric = [column for column in calibration_members[0].columns if column != "row_index"]
            calibration_mean = pd.concat(calibration_members).groupby(level=0)[calibration_numeric].mean()
            calibration_score = _attach_prediction(calibration_truth, calibration_mean.reset_index(drop=True))
            economic, policy, ticker_economic = _economic_oos(calibration_score, truth)
            diagnostics = ticker_diagnostics(truth, pred)
            ticker_leaderboard = ticker_economic.merge(diagnostics, on="ticker", how="outer")
            ticker_leaderboard.insert(0, "model", model_type)
            ticker_leaderboard.insert(0, "test_year", fold.test_year)
            leaderboard_rows.append(ticker_leaderboard)
            ticker_leaderboard.to_csv(output / str(fold.test_year) / f"leaderboard_{model_type}.csv", index=False)
            model_report = {
                "predictive": _predictive_metrics(truth, pred),
                "dispersion": {
                    group: metric_dispersion(truth, pred, group)
                    for group in ("sector", "ticker", "market_regime")
                },
                "economic": economic,
                "policy": policy.to_dict(),
            }
            fold_report["models"][model_type] = model_report
        report.append(fold_report)
        _write_json(output / f"fold_{fold.test_year}.json", fold_report)
    model_names = sorted({name for fold_report in report for name in fold_report["models"]})
    aggregate: dict[str, dict[str, float]] = {}
    for name in model_names:
        model_folds = [fold_report["models"][name] for fold_report in report if name in fold_report["models"]]
        aggregate[name] = {
            "mean_brier_5": float(np.mean([entry["predictive"].get("brier_5", np.nan) for entry in model_folds])),
            "mean_probability_mae_5": float(np.mean([
                entry["predictive"].get("probability_mae_5", np.nan) for entry in model_folds
            ])),
            "mean_probability_rmse_5": float(np.mean([
                entry["predictive"].get("probability_rmse_5", np.nan) for entry in model_folds
            ])),
            "mean_winsorized_excess": float(np.mean([entry["economic"].get("winsorized_equal_weight_excess", np.nan) for entry in model_folds])),
            "mean_b_and_h_beat_rate": float(np.mean([entry["economic"].get("b_and_h_beat_rate", np.nan) for entry in model_folds])),
        }
    boosted_name = args.boosted_engine
    tcn_brier = np.asarray([
        fold_report["models"]["tcn"]["predictive"].get("brier_5", np.nan)
        for fold_report in report if "tcn" in fold_report["models"]
    ])
    empirical_brier = np.asarray([
        fold_report["models"]["empirical"]["predictive"].get("brier_5", np.nan)
        for fold_report in report if "tcn" in fold_report["models"]
    ])
    boosted_brier = np.asarray([
        fold_report["models"][boosted_name]["predictive"].get("brier_5", np.nan)
        for fold_report in report if "tcn" in fold_report["models"]
    ])
    versus_causal = paired_bootstrap_advantage(tcn_brier, empirical_brier)
    versus_boosted = paired_bootstrap_advantage(tcn_brier, boosted_brier)
    validation_summary = {
        "folds": report,
        "aggregate": aggregate,
        "paired_evidence": {"versus_causal": versus_causal, "versus_boosted_tree": versus_boosted},
        "beats_causal": bool(versus_causal["mean_advantage"] > 0 and versus_causal["probability_positive"] >= 0.90),
        "beats_boosted_tree": bool(versus_boosted["mean_advantage"] > 0 and versus_boosted["probability_positive"] >= 0.90),
        "winning_years": int(sum(
            fold_report["models"]["tcn"]["economic"]["winsorized_equal_weight_excess"] > 0
            for fold_report in report if "tcn" in fold_report["models"]
        )),
        "sealed_test_passed": False,
        "shadow_sessions": 0,
    }
    if leaderboard_rows:
        leaderboard = pd.concat(leaderboard_rows, ignore_index=True)
        leaderboard.to_csv(output / "leaderboard.csv", index=False)
        numeric_columns = leaderboard.select_dtypes(include=[np.number]).columns.difference(["test_year"])
        by_ticker = leaderboard.groupby(["model", "ticker"], as_index=False)[list(numeric_columns)].mean()
        by_ticker.to_csv(output / "leaderboard_by_ticker.csv", index=False)
    _write_json(output / "summary.json", validation_summary)
    print(f"Completed {len(report)} purged annual folds: {output}")


def command_predictive_benchmark(args: argparse.Namespace) -> None:
    """Fast OOS probability benchmark without the slower trading-policy grid."""
    frame = _read_frame(args.dataset)
    config = QEConfig()
    folds = make_walk_forward_folds(
        frame["date"], args.test_year, args.test_year,
        config.purge_sessions, config.embargo_sessions,
    )
    if not folds:
        raise ValueError(f"No valid walk-forward fold for {args.test_year}")
    fold = folds[0]
    train, calibration, test = split_fold(frame, fold)
    estimators: list[tuple[str, Any]] = [
        ("empirical", EmpiricalExhaustionBaseline()),
        ("logistic_hazard", LogisticHazardBaseline()),
    ]
    if args.boosted_engine != "none":
        estimators.append((args.boosted_engine, BoostedTreeBaseline(args.boosted_engine)))
    report: dict[str, Any] = {
        "fold": fold.to_dict(),
        "rows": {"train": len(train), "calibration": len(calibration), "test": len(test)},
        "models": {},
        "base_rates": {},
    }
    for name, estimator in estimators:
        estimator.fit(train)
        calibration_prediction = estimator.predict(calibration).reset_index(drop=True)
        test_prediction = estimator.predict(test).reset_index(drop=True)
        rename_to_public = {
            f"p_reversal_{horizon}": f"reversal_probability_{horizon}" for horizon in (3, 5, 10)
        }
        rename_to_common = {value: key for key, value in rename_to_public.items()}
        calibration_public = calibration_prediction.rename(columns=rename_to_public)
        test_public = test_prediction.rename(columns=rename_to_public)
        calibrator = HorizonCalibrator().fit(calibration_public, calibration.reset_index(drop=True))
        calibrated = calibrator.transform(test_public).rename(columns=rename_to_common)
        report["models"][name] = _predictive_metrics(test.reset_index(drop=True), calibrated)
    for horizon in (3, 5, 10):
        actual = ((test["event_observed"] == 1) & (test["event_time"] <= horizon)).astype(int)
        report["base_rates"][str(horizon)] = float(actual.mean())
        for event_type in ("bottom", "top"):
            mask = test["target_event_type"].astype(str) == event_type
            report["base_rates"][f"{event_type}_{horizon}"] = float(actual[mask].mean()) if mask.any() else None
    output = Path(args.output)
    _write_json(output, report)
    print(json.dumps(report, indent=2, default=str))
    print(f"Wrote predictive benchmark: {output}")


def command_evaluate_bundle(args: argparse.Namespace) -> None:
    """Resume OOS policy/leaderboard evaluation from serialized deep checkpoints."""
    frame = _read_frame(args.dataset)
    dates = pd.to_datetime(frame["date"])
    context = frame[dates <= args.test_end].copy()
    calibration_dates = set(dates[(dates >= args.calibration_start) & (dates <= args.calibration_end)].unique())
    test_dates = set(dates[(dates >= args.test_start) & (dates <= args.test_end)].unique())
    bundles = [Path(path) for path in args.bundle]
    calibration_score = _score_bundles(context, bundles, _device(args.device), calibration_dates)
    test_score = _score_bundles(context, bundles, _device(args.device), test_dates)
    economic, policy, ticker_economic = _economic_oos(calibration_score, test_score)
    prediction = _deep_to_common(test_score)
    predictive = _predictive_metrics(test_score, prediction)
    diagnostics = ticker_diagnostics(test_score, prediction)
    leaderboard = ticker_economic.merge(diagnostics, on="ticker", how="outer")
    leaderboard.insert(0, "model", args.model_name)
    leaderboard.insert(0, "test_year", pd.Timestamp(args.test_start).year)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    leaderboard.to_csv(output / f"leaderboard_{args.model_name}.csv", index=False)
    _write_json(output / f"evaluation_{args.model_name}.json", {
        "predictive": predictive, "economic": economic, "policy": policy.to_dict(),
        "bundles": [str(path) for path in bundles], "testStart": args.test_start, "testEnd": args.test_end,
    })
    print(f"Evaluated {args.model_name} from {len(bundles)} bundle(s): {output}")


def command_backtest(args: argparse.Namespace) -> None:
    scores = _read_frame(args.scores)
    output = Path(args.output or QEConfig().support_dir / "backtest")
    output.mkdir(parents=True, exist_ok=True)
    calibration = scores[pd.to_datetime(scores["date"]) <= args.calibration_end]
    evaluation = scores[pd.to_datetime(scores["date"]) > args.calibration_end]
    if calibration.empty or evaluation.empty:
        raise ValueError("Backtest requires non-empty calibration and later evaluation periods")
    policy, policy_grid = calibrate_policy(calibration)
    policy_grid.to_csv(output / "policy_calibration_grid.csv", index=False)
    _write_json(output / "locked_policy.json", {
        "policy": policy.to_dict(), "calibrationEnd": args.calibration_end,
        "selectionRows": len(calibration), "objective": policy_grid.iloc[0].to_dict(),
    })
    stress: dict[str, Any] = {}
    for bps in (0, 10, 25, 50):
        ledger, trades, ticker_metrics, summary = backtest_universe(evaluation, policy, friction_bps=bps)
        ledger.to_parquet(output / f"ledger_{bps}bps.parquet", index=False)
        trades.to_parquet(output / f"trades_{bps}bps.parquet", index=False)
        ticker_metrics.to_csv(output / f"ticker_metrics_{bps}bps.csv", index=False)
        swings = offline_price_swings(evaluation)
        summary.update(swing_capture_metrics(ledger, swings))
        stress[str(bps)] = summary
    swings.to_parquet(output / "offline_price_swings.parquet", index=False)
    _write_json(output / "summary.json", {"policy": policy.to_dict(), "stress": stress})
    print(f"Wrote event ledgers and friction stresses: {output}")


def command_export(args: argparse.Namespace) -> None:
    scores = _read_frame(args.scores)
    validation = json.loads(Path(args.validation).read_text(encoding="utf-8"))
    policy_payload = json.loads(Path(args.policy).read_text(encoding="utf-8"))
    policy = PolicyConfig(**policy_payload["policy"])
    ledger, _, _, _ = backtest_universe(scores, policy)
    state = ledger[["ticker", "date", "target_position", "reason"]]
    scores = scores.drop(columns=["target_position", "reason"], errors="ignore").merge(
        state, on=["ticker", "date"], how="left", validate="one_to_one"
    )
    feature_schema = {"schemaVersion": 2, "features": list(DYNAMIC_FEATURES),
                      "sequenceLength": args.sequence_length, "causal": True}
    manifest = export_deployment_bundle(
        Path(args.output or QEConfig().deploy_dir), scores, [Path(path) for path in args.bundle],
        feature_schema, validation, policy, args.model_version, Path(args.dataset),
    )
    print(f"Exported QE-v2 bundle with status={manifest['status']}")


def command_build_universe(args: argparse.Namespace) -> None:
    frame = _read_frame(args.dataset)
    universe, summary = build_tradeable_universe(frame, args.lookback_sessions)
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    universe.to_csv(output / "tradeable_universe.csv", index=False)
    write_report_json(output / "tradeable_universe_summary.json", summary)
    print(f"Wrote {len(universe)}-ticker liquidity universe: {output}")


def command_summarize(args: argparse.Namespace) -> None:
    consolidated, summary = consolidate_leaderboards([Path(path) for path in args.leaderboard])
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    consolidated.to_csv(output / "consolidated_leaderboard.csv", index=False)
    summary.to_csv(output / "model_summary.csv", index=False)
    write_report_json(output / "model_summary.json", summary.to_dict(orient="records"))
    print(f"Wrote consolidated evidence from {len(args.leaderboard)} leaderboards: {output}")


def _source_arguments(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--input", help="Adjusted OHLCV CSV or Parquet")
    parser.add_argument("--database-url", help="PostgreSQL connection URL")
    parser.add_argument("--adjustment-ledger", help="Reviewed corporate-action JSON ledger")
    parser.add_argument("--minimum-history", type=int, default=500)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="quantum-exhaustion-v2")
    commands = parser.add_subparsers(dest="command", required=True)
    audit = commands.add_parser("audit-data"); _source_arguments(audit)
    audit.add_argument("--output"); audit.set_defaults(func=command_audit_data)
    dataset = commands.add_parser("build-dataset"); _source_arguments(dataset)
    dataset.add_argument("--output"); dataset.set_defaults(func=command_build_dataset)

    train = commands.add_parser("train")
    train.add_argument("--dataset", required=True); train.add_argument("--model", choices=("tcn", "tft"), default="tcn")
    train.add_argument("--train-end", default="2023-12-31"); train.add_argument("--calibration-start", default="2024-01-01")
    train.add_argument("--calibration-end", default="2024-12-31"); train.add_argument("--sequence-length", type=int, choices=(32, 64, 128), default=64)
    train.add_argument("--epochs", type=int, default=20); train.add_argument("--seeds", default="17,41,73")
    train.add_argument("--hidden-channels", type=int, choices=(16, 32, 64), default=32)
    train.add_argument("--batch-size", type=int, default=1024)
    train.add_argument("--max-train-sequences", type=int)
    train.add_argument("--max-calibration-sequences", type=int)
    train.add_argument("--device", default="auto"); train.add_argument("--output"); train.set_defaults(func=command_train)
    train.add_argument("--comet", action=argparse.BooleanOptionalAction, default=None,
                       help="enable/disable Comet; defaults to enabled when COMET_API_KEY exists")

    walk = commands.add_parser("walk-forward")
    walk.add_argument("--dataset", required=True); walk.add_argument("--first-test-year", type=int)
    walk.add_argument("--last-test-year", type=int, default=2024)
    walk.add_argument("--deep-models", default="tcn,tft", help="comma-separated tcn,tft or 'none'"); walk.add_argument("--boosted-engine", choices=("catboost", "xgboost"), default="catboost")
    walk.add_argument("--sequence-length", type=int, choices=(32, 64, 128), default=64); walk.add_argument("--epochs", type=int, default=20)
    walk.add_argument("--hidden-channels", type=int, choices=(16, 32, 64), default=32)
    walk.add_argument("--batch-size", type=int, default=1024)
    walk.add_argument("--max-train-sequences", type=int)
    walk.add_argument("--max-calibration-sequences", type=int)
    walk.add_argument("--seeds", default="17,41,73"); walk.add_argument("--device", default="auto"); walk.add_argument("--output")
    walk.add_argument("--comet", action=argparse.BooleanOptionalAction, default=None,
                      help="enable/disable Comet; defaults to enabled when COMET_API_KEY exists")
    walk.set_defaults(func=command_walk_forward)

    predictive = commands.add_parser("predictive-benchmark")
    predictive.add_argument("--dataset", required=True)
    predictive.add_argument("--test-year", type=int, required=True)
    predictive.add_argument("--boosted-engine", choices=("catboost", "xgboost", "none"), default="catboost")
    predictive.add_argument("--output", required=True)
    predictive.set_defaults(func=command_predictive_benchmark)

    score = commands.add_parser("score"); score.add_argument("--dataset", required=True)
    score.add_argument("--bundle", action="append", required=True); score.add_argument("--device", default="auto")
    score.add_argument("--output"); score.set_defaults(func=command_score)

    evaluate = commands.add_parser("evaluate-bundle")
    evaluate.add_argument("--dataset", required=True); evaluate.add_argument("--bundle", action="append", required=True)
    evaluate.add_argument("--model-name", default="tcn"); evaluate.add_argument("--calibration-start", required=True)
    evaluate.add_argument("--calibration-end", required=True); evaluate.add_argument("--test-start", required=True)
    evaluate.add_argument("--test-end", required=True); evaluate.add_argument("--device", default="auto")
    evaluate.add_argument("--output", required=True); evaluate.set_defaults(func=command_evaluate_bundle)

    backtest = commands.add_parser("backtest"); backtest.add_argument("--scores", required=True)
    backtest.add_argument("--calibration-end", default="2024-12-31")
    backtest.add_argument("--output"); backtest.set_defaults(func=command_backtest)

    export = commands.add_parser("export-deploy"); export.add_argument("--scores", required=True)
    export.add_argument("--dataset", required=True); export.add_argument("--validation", required=True)
    export.add_argument("--policy", required=True, help="locked_policy.json produced by backtest")
    export.add_argument("--bundle", action="append", required=True); export.add_argument("--output")
    export.add_argument("--model-version", default="QE-v2.0-research"); export.add_argument("--sequence-length", type=int, default=64)
    export.set_defaults(func=command_export)

    universe = commands.add_parser("build-universe")
    universe.add_argument("--dataset", required=True); universe.add_argument("--lookback-sessions", type=int, default=252)
    universe.add_argument("--output", required=True); universe.set_defaults(func=command_build_universe)

    summarize = commands.add_parser("summarize-results")
    summarize.add_argument("--leaderboard", action="append", required=True)
    summarize.add_argument("--output", required=True); summarize.set_defaults(func=command_summarize)
    return parser


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env.local")
    args = build_parser().parse_args()
    args.func(args)
