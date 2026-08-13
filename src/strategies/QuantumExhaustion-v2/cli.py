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
from .validation import (
    discrete_survival_nll, make_walk_forward_folds, metric_dispersion, paired_bootstrap_advantage,
    reversal_metrics, split_fold,
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
) -> tuple[dict[str, float], PolicyConfig]:
    policy, _ = calibrate_policy(calibration_scores)
    ledger, _, _, summary = backtest_universe(test_scores, policy)
    summary.update(swing_capture_metrics(ledger, offline_price_swings(test_scores)))
    return summary, policy


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
    _write_json(output.with_suffix(".manifest.json"), {
        "rows": len(dataset), "tickers": int(dataset["ticker"].nunique()),
        "start": dataset["date"].min(), "end": dataset["date"].max(),
        "config": config.to_dict(), "audit": audit.to_dict(),
    })
    print(f"Wrote causal dataset: {output}")


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
    result = train_model(model, train_dataset, calibration_dataset, config, seed, device)
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
    return bundle, calibration_prediction, calibration_truth


def command_train(args: argparse.Namespace) -> None:
    frame = _read_frame(args.dataset)
    config = replace(QEConfig(), epochs=args.epochs, default_sequence_length=args.sequence_length)
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
             "calibrationEnd": args.calibration_end, "sealedTestUntouched": True},
        )
        bundles.append(str(bundle))
        _write_json(bundle / "calibration_metrics.json", _predictive_metrics(truth, _deep_to_common(prediction)))
    _write_json(output / f"{args.model}_ensemble.json", {"modelType": args.model, "bundles": bundles, "seeds": seeds})
    print(f"Trained {len(bundles)} {args.model.upper()} seeds in {output}")


def _score_bundles(frame: pd.DataFrame, bundle_dirs: list[Path], device: torch.device) -> pd.DataFrame:
    member_scores: list[pd.DataFrame] = []
    truths: list[pd.DataFrame] = []
    for bundle_dir in bundle_dirs:
        model, scaler, categories, config, calibrator, _ = load_model_bundle(bundle_dir, device)
        dataset = SequenceDataset(frame, scaler, categories, config.default_sequence_length)
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
    config = replace(QEConfig(), epochs=args.epochs, default_sequence_length=args.sequence_length)
    folds = make_walk_forward_folds(frame["date"], args.first_test_year, 2024,
                                    config.purge_sessions, config.embargo_sessions)
    output = Path(args.output or config.support_dir / "walk_forward")
    output.mkdir(parents=True, exist_ok=True)
    report: list[dict[str, Any]] = []
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
            economic, policy = _economic_oos(
                _attach_prediction(calibration, calibration_prediction),
                _attach_prediction(test, test_prediction),
            )
            fold_report["models"][name] = {
                "predictive": _predictive_metrics(test, test_prediction),
                "dispersion": {
                    group: metric_dispersion(test, test_prediction, group)
                    for group in ("sector", "ticker", "market_regime")
                },
                "economic": economic,
                "policy": policy.to_dict(),
            }
        context = frame[pd.to_datetime(frame["date"]) <= fold.calibration_end].copy()
        calibration_dates = set(pd.to_datetime(calibration["date"]).unique())
        for model_type in args.deep_models.split(","):
            seed_predictions: list[pd.DataFrame] = []
            calibration_members: list[pd.DataFrame] = []
            calibration_truth: pd.DataFrame | None = None
            for seed in (int(value) for value in args.seeds.split(",")):
                bundle, calibration_prediction, member_truth = _train_one(
                    model_type, seed, train, context, calibration_dates,
                    output / str(fold.test_year), config, device, {"fold": fold.to_dict()},
                )
                calibration_members.append(calibration_prediction)
                calibration_truth = member_truth
                scoring_context = frame[pd.to_datetime(frame["date"]) <= fold.test_end].copy()
                scored = _score_bundles(scoring_context, [bundle], device)
                scored = scored[scored["date"].isin(pd.to_datetime(test["date"]).unique())]
                seed_predictions.append(scored)
            numeric = [column for column in seed_predictions[0].columns if column.startswith(("reversal_probability_", "expected_return_"))]
            ensemble = pd.concat(seed_predictions).groupby(["ticker", "date"], as_index=False)[numeric].mean()
            truth = test.merge(ensemble, on=["ticker", "date"], how="inner")
            pred = truth.rename(columns={f"reversal_probability_{h}": f"p_reversal_{h}" for h in (3, 5, 10)})
            assert calibration_truth is not None
            calibration_numeric = [column for column in calibration_members[0].columns if column != "row_index"]
            calibration_mean = pd.concat(calibration_members).groupby(level=0)[calibration_numeric].mean()
            calibration_score = _attach_prediction(calibration_truth, calibration_mean.reset_index(drop=True))
            economic, policy = _economic_oos(calibration_score, truth)
            fold_report["models"][model_type] = {
                "predictive": _predictive_metrics(truth, pred),
                "dispersion": {
                    group: metric_dispersion(truth, pred, group)
                    for group in ("sector", "ticker", "market_regime")
                },
                "economic": economic,
                "policy": policy.to_dict(),
            }
        report.append(fold_report)
        _write_json(output / f"fold_{fold.test_year}.json", fold_report)
    model_names = sorted({name for fold_report in report for name in fold_report["models"]})
    aggregate: dict[str, dict[str, float]] = {}
    for name in model_names:
        model_folds = [fold_report["models"][name] for fold_report in report if name in fold_report["models"]]
        aggregate[name] = {
            "mean_brier_5": float(np.mean([entry["predictive"].get("brier_5", np.nan) for entry in model_folds])),
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
    _write_json(output / "summary.json", validation_summary)
    print(f"Completed {len(report)} purged annual folds: {output}")


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
    train.add_argument("--device", default="auto"); train.add_argument("--output"); train.set_defaults(func=command_train)

    walk = commands.add_parser("walk-forward")
    walk.add_argument("--dataset", required=True); walk.add_argument("--first-test-year", type=int)
    walk.add_argument("--deep-models", default="tcn,tft"); walk.add_argument("--boosted-engine", choices=("catboost", "xgboost"), default="catboost")
    walk.add_argument("--sequence-length", type=int, choices=(32, 64, 128), default=64); walk.add_argument("--epochs", type=int, default=20)
    walk.add_argument("--seeds", default="17,41,73"); walk.add_argument("--device", default="auto"); walk.add_argument("--output")
    walk.set_defaults(func=command_walk_forward)

    score = commands.add_parser("score"); score.add_argument("--dataset", required=True)
    score.add_argument("--bundle", action="append", required=True); score.add_argument("--device", default="auto")
    score.add_argument("--output"); score.set_defaults(func=command_score)

    backtest = commands.add_parser("backtest"); backtest.add_argument("--scores", required=True)
    backtest.add_argument("--calibration-end", default="2024-12-31")
    backtest.add_argument("--output"); backtest.set_defaults(func=command_backtest)

    export = commands.add_parser("export-deploy"); export.add_argument("--scores", required=True)
    export.add_argument("--dataset", required=True); export.add_argument("--validation", required=True)
    export.add_argument("--policy", required=True, help="locked_policy.json produced by backtest")
    export.add_argument("--bundle", action="append", required=True); export.add_argument("--output")
    export.add_argument("--model-version", default="QE-v2.0-research"); export.add_argument("--sequence-length", type=int, default=64)
    export.set_defaults(func=command_export)
    return parser


def main() -> None:
    load_dotenv(PROJECT_ROOT / ".env.local")
    args = build_parser().parse_args()
    args.func(args)
