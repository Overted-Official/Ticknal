from __future__ import annotations

import importlib

import numpy as np
import pandas as pd


config_module = importlib.import_module("src.strategies.QuantumExhaustion-v2.config")
swings = importlib.import_module("src.strategies.QuantumExhaustion-v2.swings")
validation = importlib.import_module("src.strategies.QuantumExhaustion-v2.validation")


def test_trailing_median_move_cannot_see_current_return() -> None:
    config = config_module.QEConfig(
        minimum_history=1, swing_median_window=3, swing_median_min_periods=1,
        swing_threshold_floor=0.0,
    )
    close = pd.Series([100.0, 102.0, 104.04, 124.848])
    median = swings.trailing_median_daily_move(close, config)
    assert np.isclose(median.iloc[3], 0.02)


def test_cdf_does_not_use_same_close_completed_event() -> None:
    config = config_module.QEConfig(minimum_history=1, cdf_ticker_prior=0.0, cdf_sector_prior=0.0)
    dates = pd.bdate_range("2024-01-01", periods=2)
    frame = pd.DataFrame({
        "ticker": ["AAA", "AAA"], "sector": ["S", "S"], "date": dates,
        "psi_direction": [1, 1], "running_delta": [20.0, 30.0],
        "completed_swing_direction": [1, 0], "completed_psi_delta": [25.0, np.nan],
    })
    result = swings.add_hierarchical_exhaustion(frame, config)
    assert result.loc[0, "cdf_market_count"] == 0
    assert result.loc[0, "exhaustion_percentile"] == 50.0
    assert result.loc[1, "cdf_market_count"] == 1
    assert result.loc[1, "exhaustion_percentile"] == 100.0


def test_probability_mae_and_rmse_use_binary_realized_pivots() -> None:
    truth = pd.DataFrame({
        "event_observed": [1, 0, 1, 0],
        "event_time": [2, 10, 5, 10],
        "target_event_type": ["bottom", "bottom", "top", "top"],
        "target_return_5": [0.0] * 4,
        "target_return_10": [0.0] * 4,
        "target_return_20": [0.0] * 4,
    })
    probability = np.array([0.8, 0.3, 0.6, 0.1])
    prediction = pd.DataFrame({
        "p_reversal_3": [0.8, 0.3, 0.2, 0.1],
        "p_reversal_5": probability,
        "p_reversal_10": probability,
        "expected_return_5": [0.0] * 4,
        "expected_return_10": [0.0] * 4,
        "expected_return_20": [0.0] * 4,
    })
    metrics = validation.reversal_metrics(truth, prediction)
    actual = np.array([1.0, 0.0, 1.0, 0.0])
    assert np.isclose(metrics["probability_mae_5"], np.mean(np.abs(probability - actual)))
    assert np.isclose(metrics["probability_rmse_5"], np.sqrt(np.mean((probability - actual) ** 2)))
    assert np.isclose(metrics["probability_rmse_5"] ** 2, metrics["brier_5"])
    assert "bottom_probability_mae_5" in metrics
    assert "top_probability_rmse_5" in metrics
