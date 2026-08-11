import pytest

from quant_engine.models.evaluation_v1 import evaluate_classifier, evaluate_return_regression


def test_classifier_metrics_include_probability_and_threshold_quality():
    metrics = evaluate_classifier([0, 0, 1, 1], [0.1, 0.4, 0.7, 0.9], threshold=0.6)
    assert metrics["precision"] == 1.0
    assert metrics["recall"] == 1.0
    assert metrics["brier_score"] < metrics["baseline_brier_score"]
    assert metrics["log_loss"] < metrics["baseline_log_loss"]


def test_return_metrics_compare_with_zero_return_baseline():
    metrics = evaluate_return_regression([0.1, -0.1, 0.2], [0.08, -0.08, 0.18])
    assert metrics["mae"] < metrics["baseline_mae"]
    assert metrics["rmse"] < metrics["baseline_rmse"]
    assert metrics["directional_accuracy"] == 1.0


def test_classifier_rejects_invalid_probabilities():
    with pytest.raises(ValueError):
        evaluate_classifier([0, 1], [0.2, 1.2])
