"""Calibrated annual walk-forward XGBoost training for pooled candidates."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from xgboost import XGBClassifier

from quant_engine.research import CandidateDataset
from quant_engine.validation import annual_walk_forward_folds

from .evaluation_v1 import evaluate_classifier


@dataclass(frozen=True)
class WalkForwardTrainingConfig:
    first_test_year: int = 2021
    last_test_year: int | None = None
    train_years: int = 5
    calibration_years: int = 1
    purge_bars: int = 64
    embargo_bars: int = 5
    minimum_precision: float = 0.75
    minimum_accepted_calibration: int = 20
    minimum_train_samples: int = 250
    minimum_calibration_samples: int = 50
    n_estimators: int = 250
    learning_rate: float = 0.03
    max_depth: int = 3
    min_child_weight: float = 10.0
    subsample: float = 0.80
    colsample_bytree: float = 0.80
    reg_lambda: float = 5.0
    gamma: float = 0.10
    n_jobs: int = -1
    random_state: int = 42

    def __post_init__(self) -> None:
        if not 0 < self.minimum_precision <= 1:
            raise ValueError("minimum_precision must be in (0, 1]")
        if self.minimum_accepted_calibration <= 0:
            raise ValueError("minimum_accepted_calibration must be positive")


@dataclass(frozen=True)
class PrecisionThreshold:
    threshold: float
    accepted_count: int
    precision: float
    recall: float
    gate_met: bool


@dataclass
class FoldModelArtifact:
    scale: str
    test_year: int
    threshold: float
    feature_columns: tuple[str, ...]
    model: XGBClassifier
    calibrator: LogisticRegression


@dataclass
class WalkForwardModelResult:
    scale: str
    predictions: pd.DataFrame
    fold_metrics: list[dict[str, Any]]
    feature_importance: pd.DataFrame
    artifacts: list[FoldModelArtifact]
    config: WalkForwardTrainingConfig


def _logit(probabilities: np.ndarray) -> np.ndarray:
    clipped = np.clip(np.asarray(probabilities, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(clipped / (1.0 - clipped)).reshape(-1, 1)


def select_precision_threshold(
    y_true,
    probabilities,
    *,
    minimum_precision: float = 0.75,
    minimum_accepted: int = 20,
    eligibility_mask=None,
) -> PrecisionThreshold:
    """Select the broadest calibration-only acceptance set meeting precision."""
    truth = np.asarray(y_true, dtype=int)
    probs = np.asarray(probabilities, dtype=float)
    if truth.ndim != 1 or truth.shape != probs.shape or len(truth) == 0:
        raise ValueError("truth and probabilities must be equally sized non-empty 1-D arrays")
    if not np.isin(truth, [0, 1]).all():
        raise ValueError("truth must be binary")
    eligible = (
        np.ones(len(truth), dtype=bool)
        if eligibility_mask is None
        else np.asarray(eligibility_mask, dtype=bool)
    )
    if eligible.shape != truth.shape:
        raise ValueError("eligibility_mask must match truth")

    best: PrecisionThreshold | None = None
    for threshold in np.sort(np.unique(probs[eligible]))[::-1]:
        accepted = eligible & (probs >= threshold)
        count = int(accepted.sum())
        if count < minimum_accepted:
            continue
        precision = float(truth[accepted].mean())
        if precision < minimum_precision:
            continue
        positives = int(truth.sum())
        recall = float(truth[accepted].sum() / positives) if positives else 0.0
        candidate = PrecisionThreshold(float(threshold), count, precision, recall, True)
        if best is None or (candidate.accepted_count, candidate.recall) > (best.accepted_count, best.recall):
            best = candidate
    if best is not None:
        return best
    return PrecisionThreshold(float(np.nextafter(1.0, 2.0)), 0, 0.0, 0.0, False)


def train_walk_forward_classifier(
    dataset: CandidateDataset,
    scale: str,
    *,
    config: WalkForwardTrainingConfig | None = None,
) -> WalkForwardModelResult:
    """Train, calibrate, threshold, and predict locked annual OOS folds."""
    config = config or WalkForwardTrainingConfig()
    label_column = f"label_{scale}"
    if label_column not in dataset.rows.columns:
        raise ValueError(f"Unknown or unavailable swing scale: {scale}")

    rows = dataset.rows.dropna(subset=[label_column, *dataset.feature_columns]).copy()
    rows[label_column] = rows[label_column].astype("int8")
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

    predictions: list[pd.DataFrame] = []
    fold_metrics: list[dict[str, Any]] = []
    importance_parts: list[pd.DataFrame] = []
    artifacts: list[FoldModelArtifact] = []

    for fold in folds:
        train_mask, calibration_mask, test_mask = fold.masks(rows["date"])
        train = rows.loc[train_mask]
        calibration = rows.loc[calibration_mask]
        test = rows.loc[test_mask]
        counts = {
            "train_samples": len(train),
            "calibration_samples": len(calibration),
            "test_samples": len(test),
        }
        skip_reason = None
        if len(train) < config.minimum_train_samples:
            skip_reason = "insufficient_train_samples"
        elif len(calibration) < config.minimum_calibration_samples:
            skip_reason = "insufficient_calibration_samples"
        elif test.empty:
            skip_reason = "no_test_candidates"
        elif train[label_column].nunique() < 2:
            skip_reason = "single_class_train"
        elif calibration[label_column].nunique() < 2:
            skip_reason = "single_class_calibration"
        if skip_reason:
            fold_metrics.append(
                {"scale": scale, "test_year": fold.test_year, "status": "skipped", "reason": skip_reason, **counts}
            )
            continue

        model = XGBClassifier(
            objective="binary:logistic",
            eval_metric="logloss",
            tree_method="hist",
            n_estimators=config.n_estimators,
            learning_rate=config.learning_rate,
            max_depth=config.max_depth,
            min_child_weight=config.min_child_weight,
            subsample=config.subsample,
            colsample_bytree=config.colsample_bytree,
            reg_lambda=config.reg_lambda,
            gamma=config.gamma,
            n_jobs=config.n_jobs,
            random_state=config.random_state,
        )
        feature_columns = list(dataset.feature_columns)
        model.fit(train[feature_columns], train[label_column])

        raw_calibration = model.predict_proba(calibration[feature_columns])[:, 1]
        calibrator = LogisticRegression(solver="lbfgs", random_state=config.random_state)
        calibrator.fit(_logit(raw_calibration), calibration[label_column])
        calibrated_calibration = calibrator.predict_proba(_logit(raw_calibration))[:, 1]
        selection = select_precision_threshold(
            calibration[label_column],
            calibrated_calibration,
            minimum_precision=config.minimum_precision,
            minimum_accepted=config.minimum_accepted_calibration,
        )

        raw_test = model.predict_proba(test[feature_columns])[:, 1]
        calibrated_test = calibrator.predict_proba(_logit(raw_test))[:, 1]
        test_metrics = evaluate_classifier(test[label_column], calibrated_test, threshold=selection.threshold)
        calibration_metrics = evaluate_classifier(
            calibration[label_column], calibrated_calibration, threshold=selection.threshold
        )
        fold_metrics.append(
            {
                "scale": scale,
                "test_year": fold.test_year,
                "status": "trained",
                **counts,
                "threshold_selection": asdict(selection),
                "calibration": calibration_metrics,
                "test": test_metrics,
            }
        )

        identity = ["ticker_symbol", "date", "segment_id", label_column]
        for optional in (f"outcome_{scale}", f"holding_bars_{scale}", f"realized_return_{scale}"):
            if optional in test.columns:
                identity.append(optional)
        fold_predictions = test.loc[:, identity].copy()
        fold_predictions = fold_predictions.rename(columns={label_column: "label"})
        fold_predictions["scale"] = scale
        fold_predictions["test_year"] = fold.test_year
        fold_predictions["raw_probability"] = raw_test
        fold_predictions["probability"] = calibrated_test
        fold_predictions["threshold"] = selection.threshold
        fold_predictions["accepted"] = calibrated_test >= selection.threshold
        predictions.append(fold_predictions)

        importance_parts.append(
            pd.DataFrame(
                {
                    "scale": scale,
                    "test_year": fold.test_year,
                    "feature": feature_columns,
                    "importance": model.feature_importances_,
                }
            )
        )
        artifacts.append(
            FoldModelArtifact(
                scale=scale,
                test_year=fold.test_year,
                threshold=selection.threshold,
                feature_columns=tuple(feature_columns),
                model=model,
                calibrator=calibrator,
            )
        )

    prediction_frame = pd.concat(predictions, ignore_index=True) if predictions else pd.DataFrame()
    importance_frame = pd.concat(importance_parts, ignore_index=True) if importance_parts else pd.DataFrame()
    return WalkForwardModelResult(
        scale=scale,
        predictions=prediction_frame,
        fold_metrics=fold_metrics,
        feature_importance=importance_frame,
        artifacts=artifacts,
        config=config,
    )
