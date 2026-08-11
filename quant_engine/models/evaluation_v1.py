"""Out-of-sample predictive metrics for classifier and return models."""

from __future__ import annotations

from typing import Any

import numpy as np
from scipy.stats import spearmanr
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    log_loss,
    mean_absolute_error,
    mean_squared_error,
    median_absolute_error,
    precision_score,
    r2_score,
    recall_score,
    roc_auc_score,
)


def expected_calibration_error(
    y_true: np.ndarray,
    probabilities: np.ndarray,
    *,
    bins: int = 10,
) -> float:
    """Weighted absolute gap between confidence and observed frequency."""
    if bins < 2:
        raise ValueError("bins must be at least 2")
    edges = np.linspace(0.0, 1.0, bins + 1)
    bucket = np.clip(np.digitize(probabilities, edges[1:-1], right=True), 0, bins - 1)
    error = 0.0
    for index in range(bins):
        mask = bucket == index
        if not mask.any():
            continue
        error += float(mask.mean()) * abs(float(y_true[mask].mean()) - float(probabilities[mask].mean()))
    return error


def evaluate_classifier(
    y_true,
    probabilities,
    *,
    threshold: float = 0.60,
    calibration_bins: int = 10,
) -> dict[str, Any]:
    """Evaluate a target-before-stop probability model against prevalence."""
    truth = np.asarray(y_true, dtype=int)
    probs = np.asarray(probabilities, dtype=float)
    if truth.shape != probs.shape or truth.ndim != 1:
        raise ValueError("y_true and probabilities must be equally sized 1-D arrays")
    if len(truth) == 0 or not np.isin(truth, [0, 1]).all():
        raise ValueError("y_true must be a non-empty binary array")
    if not np.isfinite(probs).all() or ((probs < 0) | (probs > 1)).any():
        raise ValueError("probabilities must be finite values in [0, 1]")

    predicted = probs >= threshold
    prevalence = float(truth.mean())
    baseline = np.full(len(truth), prevalence)
    matrix = confusion_matrix(truth, predicted, labels=[0, 1])
    roc_auc = float(roc_auc_score(truth, probs)) if len(np.unique(truth)) == 2 else None

    return {
        "sample_count": len(truth),
        "positive_rate": prevalence,
        "threshold": threshold,
        "accepted_count": int(predicted.sum()),
        "precision": float(precision_score(truth, predicted, zero_division=0)),
        "recall": float(recall_score(truth, predicted, zero_division=0)),
        "f1": float(f1_score(truth, predicted, zero_division=0)),
        "roc_auc": roc_auc,
        "pr_auc": float(average_precision_score(truth, probs)),
        "log_loss": float(log_loss(truth, probs, labels=[0, 1])),
        "baseline_log_loss": float(log_loss(truth, baseline, labels=[0, 1])),
        "brier_score": float(brier_score_loss(truth, probs)),
        "baseline_brier_score": float(brier_score_loss(truth, baseline)),
        "expected_calibration_error": expected_calibration_error(
            truth, probs, bins=calibration_bins
        ),
        "confusion_matrix": {
            "true_negative": int(matrix[0, 0]),
            "false_positive": int(matrix[0, 1]),
            "false_negative": int(matrix[1, 0]),
            "true_positive": int(matrix[1, 1]),
        },
    }


def evaluate_return_regression(y_true, predictions) -> dict[str, Any]:
    """Evaluate return forecasts against the causal zero-return baseline."""
    truth = np.asarray(y_true, dtype=float)
    predicted = np.asarray(predictions, dtype=float)
    if truth.shape != predicted.shape or truth.ndim != 1 or len(truth) == 0:
        raise ValueError("y_true and predictions must be equally sized non-empty 1-D arrays")
    if not np.isfinite(truth).all() or not np.isfinite(predicted).all():
        raise ValueError("return arrays must contain only finite values")
    baseline = np.zeros_like(truth)
    correlation = (
        spearmanr(truth, predicted).statistic
        if np.std(truth) > 0 and np.std(predicted) > 0
        else np.nan
    )
    return {
        "sample_count": len(truth),
        "mae": float(mean_absolute_error(truth, predicted)),
        "baseline_mae": float(mean_absolute_error(truth, baseline)),
        "rmse": float(np.sqrt(mean_squared_error(truth, predicted))),
        "baseline_rmse": float(np.sqrt(mean_squared_error(truth, baseline))),
        "median_absolute_error": float(median_absolute_error(truth, predicted)),
        "r2": float(r2_score(truth, predicted)),
        "spearman_rank_correlation": float(correlation) if np.isfinite(correlation) else None,
        "directional_accuracy": float((np.sign(truth) == np.sign(predicted)).mean()),
    }
