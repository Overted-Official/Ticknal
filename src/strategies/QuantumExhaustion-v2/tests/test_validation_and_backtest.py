from __future__ import annotations

import importlib

import pandas as pd


backtest = importlib.import_module("src.strategies.QuantumExhaustion-v2.backtest")
validation = importlib.import_module("src.strategies.QuantumExhaustion-v2.validation")


def test_walk_forward_fold_has_purge_and_embargo() -> None:
    dates = pd.bdate_range("2017-01-01", "2024-12-31")
    folds = validation.make_walk_forward_folds(dates, first_test_year=2020, last_test_year=2024,
                                                purge_sessions=20, embargo_sessions=5)
    assert [fold.test_year for fold in folds] == [2020, 2021, 2022, 2023, 2024]
    for fold in folds:
        assert pd.Timestamp(fold.train_end).year <= fold.test_year - 2
        assert pd.Timestamp(fold.calibration_start).year == fold.test_year - 1
        assert pd.Timestamp(fold.test_start).year == fold.test_year


def test_signal_generated_at_close_fills_next_open() -> None:
    dates = pd.bdate_range("2024-01-01", periods=4)
    frame = pd.DataFrame({
        "ticker": "AAA", "date": dates, "open": [100, 101, 90, 92], "close": [100, 102, 91, 93],
        "atr14": [2, 2, 2, 2], "psi_direction": [1, 1, 1, -1],
        "psi_delta": [1, -1, -2, 1], "reversal_probability_5": [0.2, 0.8, 0.8, 0.8],
    })
    result = backtest.backtest_ticker(frame, policy=backtest.PolicyConfig(cooldown_sessions=0))
    assert result.ledger.iloc[0]["fill"] == "buy"
    assert result.trades.iloc[0]["exit_date"] == dates[2]
    assert result.trades.iloc[0]["exit_price"] == 90


def test_promotion_requires_every_gate() -> None:
    passing = {
        "coverage": 0.95, "beats_causal": True, "beats_boosted_tree": True, "winning_years": 4,
        "winsorized_equal_weight_excess": 0.02, "b_and_h_beat_rate": 0.6,
        "swing_capture_improved": True, "drawdown_guardrail": True,
        "largest_ticker_gain_share": 0.15, "sealed_test_passed": True, "shadow_sessions": 60,
    }
    assert validation.evaluate_promotion_gates(passing)["promoted"] is True
    passing["beats_boosted_tree"] = False
    assert validation.evaluate_promotion_gates(passing)["promoted"] is False
