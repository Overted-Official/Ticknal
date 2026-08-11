"""Cost-aware multi-task annual walk-forward training for model iteration 2."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from math import sqrt
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import precision_score, recall_score
from xgboost import XGBClassifier, XGBRegressor

from quant_engine.research import CandidateDataset
from quant_engine.validation import annual_walk_forward_folds

from .evaluation_v1 import evaluate_classifier, evaluate_return_regression
from .walk_forward_v1 import PrecisionThreshold, _logit, select_precision_threshold


@dataclass(frozen=True)
class ModelPreset:
    name: str
    max_depth: int
    min_child_weight: float
    gamma: float
    subsample: float
    colsample_bytree: float
    reg_lambda: float


DEFAULT_MODEL_PRESETS = (
    ModelPreset("stable", 2, 20.0, 0.20, 0.85, 0.85, 8.0),
    ModelPreset("balanced", 3, 10.0, 0.10, 0.80, 0.80, 5.0),
    ModelPreset("nonlinear", 4, 5.0, 0.20, 0.75, 0.75, 8.0),
)


@dataclass(frozen=True)
class MultiTaskTrainingConfig:
    first_test_year: int = 2021
    last_test_year: int | None = None
    train_years: int = 5
    calibration_years: int = 1
    purge_bars: int = 64
    embargo_bars: int = 5
    calibration_fit_fraction: float = 0.50
    minimum_precision: float = 0.75
    minimum_accepted_selection: int = 20
    minimum_train_samples: int = 500
    minimum_calibration_samples: int = 100
    minimum_daily_probability_rank: float = 0.75
    minimum_predicted_net_return: float = 0.0
    n_estimators: int = 200
    learning_rate: float = 0.03
    n_jobs: int = -1
    random_state: int = 42
    presets: tuple[ModelPreset, ...] = DEFAULT_MODEL_PRESETS

    def __post_init__(self) -> None:
        if not 0 < self.calibration_fit_fraction < 1:
            raise ValueError("calibration_fit_fraction must be in (0, 1)")
        if not 0 < self.minimum_precision <= 1:
            raise ValueError("minimum_precision must be in (0, 1]")
        if not 0 <= self.minimum_daily_probability_rank <= 1:
            raise ValueError("minimum_daily_probability_rank must be in [0, 1]")
        if not self.presets:
            raise ValueError("at least one model preset is required")


@dataclass
class MultiTaskFoldArtifact:
    scale: str
    test_year: int
    preset: ModelPreset
    threshold: float
    feature_columns: tuple[str, ...]
    classifier: XGBClassifier
    return_regressor: XGBRegressor
    calibrator: LogisticRegression
    use_return_filter: bool


@dataclass
class MultiTaskWalkForwardResult:
    scale: str
    predictions: pd.DataFrame
    fold_metrics: list[dict[str, Any]]
    feature_importance: pd.DataFrame
    artifacts: list[MultiTaskFoldArtifact]
    config: MultiTaskTrainingConfig


def _daily_rank(dates: pd.Series, values: np.ndarray) -> np.ndarray:
    series = pd.Series(values, index=dates.index, dtype="float64")
    return series.groupby(pd.to_datetime(dates).dt.normalize(), sort=False).rank(pct=True).to_numpy()


def _decision_metrics(
    truth: np.ndarray,
    probabilities: np.ndarray,
    accepted: np.ndarray,
) -> dict[str, Any]:
    accepted = np.asarray(accepted, dtype=bool)
    truth = np.asarray(truth, dtype=int)
    true_positives = int(truth[accepted].sum()) if accepted.any() else 0
    positives = int(truth.sum())
    return {
        "accepted_count": int(accepted.sum()),
        "precision": float(precision_score(truth, accepted, zero_division=0)),
        "recall": float(recall_score(truth, accepted, zero_division=0)),
        "accepted_true_positives": true_positives,
        "positive_count": positives,
        "probability_metrics_at_0_5": evaluate_classifier(truth, probabilities, threshold=0.5),
    }


def _precision_frontier(truth: np.ndarray, probabilities: np.ndarray, eligible: np.ndarray, minimum: int) -> dict:
    """Diagnostic best precision available without changing the hard gate."""
    best_precision = 0.0
    best_count = 0
    best_threshold = None
    for threshold in np.sort(np.unique(probabilities[eligible]))[::-1]:
        accepted = eligible & (probabilities >= threshold)
        count = int(accepted.sum())
        if count < minimum:
            continue
        precision = float(truth[accepted].mean())
        if precision > best_precision:
            best_precision = precision
            best_count = count
            best_threshold = float(threshold)
    return {
        "eligible_count": int(eligible.sum()),
        "best_precision_at_minimum_count": best_precision,
        "best_precision_accepted_count": best_count,
        "best_precision_threshold": best_threshold,
    }


def _split_calibration(calibration: pd.DataFrame, fraction: float) -> tuple[pd.DataFrame, pd.DataFrame]:
    sessions = pd.DatetimeIndex(pd.to_datetime(calibration["date"]).dt.normalize().unique()).sort_values()
    split = max(1, min(len(sessions) - 1, int(len(sessions) * fraction)))
    fit_dates = sessions[:split]
    selection_dates = sessions[split:]
    return (
        calibration.loc[pd.to_datetime(calibration["date"]).dt.normalize().isin(fit_dates)],
        calibration.loc[pd.to_datetime(calibration["date"]).dt.normalize().isin(selection_dates)],
    )


def _models(
    preset: ModelPreset,
    config: MultiTaskTrainingConfig,
    *,
    scale_positive_weight: float,
) -> tuple[XGBClassifier, XGBRegressor]:
    common = {
        "tree_method": "hist",
        "n_estimators": config.n_estimators,
        "learning_rate": config.learning_rate,
        "max_depth": preset.max_depth,
        "min_child_weight": preset.min_child_weight,
        "gamma": preset.gamma,
        "subsample": preset.subsample,
        "colsample_bytree": preset.colsample_bytree,
        "reg_lambda": preset.reg_lambda,
        "n_jobs": config.n_jobs,
        "random_state": config.random_state,
    }
    classifier = XGBClassifier(
        objective="binary:logistic",
        eval_metric="logloss",
        scale_pos_weight=scale_positive_weight,
        **common,
    )
    regressor = XGBRegressor(objective="reg:squarederror", eval_metric="rmse", **common)
    return classifier, regressor


def train_multitask_walk_forward(
    dataset: CandidateDataset,
    scale: str,
    *,
    config: MultiTaskTrainingConfig | None = None,
) -> MultiTaskWalkForwardResult:
    """Select a preset and net-win threshold without inspecting test outcomes."""
    config = config or MultiTaskTrainingConfig()
    win_column = f"net_win_{scale}"
    return_column = f"net_return_{scale}"
    barrier_column = f"label_{scale}"
    required = {win_column, return_column, barrier_column, *dataset.feature_columns}
    missing = required.difference(dataset.rows.columns)
    if missing:
        raise ValueError(f"Unavailable scale or dataset columns: {', '.join(sorted(missing))}")
    rows = dataset.rows.dropna(subset=[win_column, return_column, *dataset.feature_columns]).copy()
    rows[win_column] = rows[win_column].astype("int8")
    folds = annual_walk_forward_folds(
        dataset.session_dates,
        first_test_year=config.first_test_year,
        train_years=config.train_years,
        calibration_years=config.calibration_years,
        label_horizon_bars=config.purge_bars,
        embargo_bars=config.embargo_bars,
    )
    if config.last_test_year is not None:
        folds = [fold for fold in folds if fold.test_year <= config.last_test_year]

    prediction_parts: list[pd.DataFrame] = []
    fold_metrics: list[dict[str, Any]] = []
    importance_parts: list[pd.DataFrame] = []
    artifacts: list[MultiTaskFoldArtifact] = []
    feature_columns = list(dataset.feature_columns)

    for fold in folds:
        train_mask, calibration_mask, test_mask = fold.masks(rows["date"])
        train = rows.loc[train_mask]
        calibration = rows.loc[calibration_mask]
        test = rows.loc[test_mask]
        counts = {"train_samples": len(train), "calibration_samples": len(calibration), "test_samples": len(test)}
        reason = None
        if len(train) < config.minimum_train_samples:
            reason = "insufficient_train_samples"
        elif len(calibration) < config.minimum_calibration_samples:
            reason = "insufficient_calibration_samples"
        elif test.empty:
            reason = "no_test_candidates"
        elif train[win_column].nunique() < 2:
            reason = "single_class_train"
        if reason:
            fold_metrics.append({"scale": scale, "test_year": fold.test_year, "status": "skipped", "reason": reason, **counts})
            continue

        calibration_fit, selection = _split_calibration(calibration, config.calibration_fit_fraction)
        if (
            calibration_fit[win_column].nunique() < 2
            or selection[win_column].nunique() < 2
            or min(len(calibration_fit), len(selection)) < 10
        ):
            fold_metrics.append(
                {"scale": scale, "test_year": fold.test_year, "status": "skipped", "reason": "invalid_calibration_split", **counts}
            )
            continue

        positives = int(train[win_column].sum())
        negatives = len(train) - positives
        positive_weight = sqrt(negatives / positives) if positives > 0 else 1.0
        candidates: list[dict[str, Any]] = []
        for preset in config.presets:
            classifier, regressor = _models(preset, config, scale_positive_weight=positive_weight)
            classifier.fit(train[feature_columns], train[win_column])
            regressor.fit(train[feature_columns], train[return_column])

            fit_raw = classifier.predict_proba(calibration_fit[feature_columns])[:, 1]
            calibrator = LogisticRegression(solver="lbfgs", random_state=config.random_state)
            calibrator.fit(_logit(fit_raw), calibration_fit[win_column])

            selection_raw = classifier.predict_proba(selection[feature_columns])[:, 1]
            selection_probability = calibrator.predict_proba(_logit(selection_raw))[:, 1]
            selection_return = regressor.predict(selection[feature_columns])
            selection_rank = _daily_rank(selection["date"], selection_probability)
            probability_metrics = evaluate_classifier(
                selection[win_column], selection_probability, threshold=0.5
            )
            regression_metrics = evaluate_return_regression(selection[return_column], selection_return)
            for use_return_filter in (False, True):
                eligible = selection_rank >= config.minimum_daily_probability_rank
                if use_return_filter:
                    eligible &= selection_return > config.minimum_predicted_net_return
                threshold = select_precision_threshold(
                    selection[win_column],
                    selection_probability,
                    minimum_precision=config.minimum_precision,
                    minimum_accepted=config.minimum_accepted_selection,
                    eligibility_mask=eligible,
                )
                accepted = eligible & (selection_probability >= threshold.threshold)
                actual_accepted_return = selection.loc[accepted, return_column]
                edge_score = (
                    float(actual_accepted_return.mean()) * sqrt(len(actual_accepted_return))
                    if len(actual_accepted_return)
                    else None
                )
                candidates.append(
                    {
                        "preset": preset,
                        "classifier": classifier,
                        "regressor": regressor,
                        "calibrator": calibrator,
                        "use_return_filter": use_return_filter,
                        "threshold": threshold,
                        "edge_score": edge_score,
                        "accepted_net_return_mean": float(actual_accepted_return.mean()) if len(actual_accepted_return) else None,
                        "accepted_net_return_sum": float(actual_accepted_return.sum()) if len(actual_accepted_return) else None,
                        "precision_frontier": _precision_frontier(
                            selection[win_column].to_numpy(), selection_probability, eligible,
                            config.minimum_accepted_selection,
                        ),
                        "selection_probability_metrics": probability_metrics,
                        "selection_regression_metrics": regression_metrics,
                    }
                )

        gated = [candidate for candidate in candidates if candidate["threshold"].gate_met]
        pool = gated or candidates
        selected = max(
            pool,
            key=lambda candidate: (
                candidate["threshold"].gate_met,
                candidate["edge_score"] if candidate["edge_score"] is not None else float("-inf"),
                candidate["selection_probability_metrics"]["pr_auc"],
            ),
        )
        classifier = selected["classifier"]
        regressor = selected["regressor"]
        calibrator = selected["calibrator"]
        threshold: PrecisionThreshold = selected["threshold"]

        raw_test = classifier.predict_proba(test[feature_columns])[:, 1]
        test_probability = calibrator.predict_proba(_logit(raw_test))[:, 1]
        test_return = regressor.predict(test[feature_columns])
        test_rank = _daily_rank(test["date"], test_probability)
        test_eligible = test_rank >= config.minimum_daily_probability_rank
        if selected["use_return_filter"]:
            test_eligible &= test_return > config.minimum_predicted_net_return
        test_accepted = test_eligible & (test_probability >= threshold.threshold)

        preset_metrics = [
            {
                "preset": candidate["preset"].name,
                "use_return_filter": candidate["use_return_filter"],
                "threshold_selection": asdict(candidate["threshold"]),
                "edge_score": candidate["edge_score"],
                "accepted_net_return_mean": candidate["accepted_net_return_mean"],
                "accepted_net_return_sum": candidate["accepted_net_return_sum"],
                "precision_frontier": candidate["precision_frontier"],
                "probability": candidate["selection_probability_metrics"],
                "regression": candidate["selection_regression_metrics"],
            }
            for candidate in candidates
        ]
        fold_metrics.append(
            {
                "scale": scale,
                "test_year": fold.test_year,
                "status": "trained",
                **counts,
                "calibration_fit_samples": len(calibration_fit),
                "selection_samples": len(selection),
                "selected_preset": selected["preset"].name,
                "selected_return_filter": selected["use_return_filter"],
                "threshold_selection": asdict(threshold),
                "preset_selection_metrics": preset_metrics,
                "test_decisions": _decision_metrics(
                    test[win_column].to_numpy(), test_probability, test_accepted
                ),
                "test_regression": evaluate_return_regression(test[return_column], test_return),
            }
        )

        identity = ["ticker_symbol", "date", "segment_id", barrier_column, win_column, return_column]
        for optional in (f"outcome_{scale}", f"holding_bars_{scale}"):
            if optional in test.columns:
                identity.append(optional)
        fold_predictions = test.loc[:, identity].copy().rename(
            columns={barrier_column: "barrier_label", win_column: "label", return_column: "actual_net_return"}
        )
        fold_predictions["scale"] = scale
        fold_predictions["test_year"] = fold.test_year
        fold_predictions["preset"] = selected["preset"].name
        fold_predictions["return_filter_active"] = selected["use_return_filter"]
        fold_predictions["raw_probability"] = raw_test
        fold_predictions["probability"] = test_probability
        fold_predictions["predicted_net_return"] = test_return
        fold_predictions["daily_probability_rank"] = test_rank
        fold_predictions["threshold"] = threshold.threshold
        fold_predictions["accepted"] = test_accepted
        prediction_parts.append(fold_predictions)

        for model_name, model in (("classifier", classifier), ("return_regressor", regressor)):
            importance_parts.append(
                pd.DataFrame(
                    {
                        "scale": scale,
                        "test_year": fold.test_year,
                        "preset": selected["preset"].name,
                        "model": model_name,
                        "feature": feature_columns,
                        "importance": model.feature_importances_,
                    }
                )
            )
        artifacts.append(
            MultiTaskFoldArtifact(
                scale=scale,
                test_year=fold.test_year,
                preset=selected["preset"],
                threshold=threshold.threshold,
                feature_columns=tuple(feature_columns),
                classifier=classifier,
                return_regressor=regressor,
                calibrator=calibrator,
                use_return_filter=selected["use_return_filter"],
            )
        )

    return MultiTaskWalkForwardResult(
        scale=scale,
        predictions=pd.concat(prediction_parts, ignore_index=True) if prediction_parts else pd.DataFrame(),
        fold_metrics=fold_metrics,
        feature_importance=pd.concat(importance_parts, ignore_index=True) if importance_parts else pd.DataFrame(),
        artifacts=artifacts,
        config=config,
    )
