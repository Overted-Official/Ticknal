from __future__ import annotations

import importlib
import json

import numpy as np
import pandas as pd
import torch


backtest = importlib.import_module("src.strategies.QuantumExhaustion-v2.backtest")
deployment = importlib.import_module("src.strategies.QuantumExhaustion-v2.deployment")
models = importlib.import_module("src.strategies.QuantumExhaustion-v2.models")
config_module = importlib.import_module("src.strategies.QuantumExhaustion-v2.config")


def test_calibrator_preserves_cumulative_probability_order() -> None:
    prediction = pd.DataFrame({
        "reversal_probability_3": [0.1, 0.2, 0.7, 0.8],
        "reversal_probability_5": [0.2, 0.4, 0.8, 0.9],
        "reversal_probability_10": [0.5, 0.7, 0.9, 0.95],
    })
    truth = pd.DataFrame({"event_observed": [0, 1, 1, 1], "event_time": [10, 8, 4, 2]})
    transformed = models.HorizonCalibrator().fit(prediction, truth).transform(prediction)
    values = transformed[[f"reversal_probability_{horizon}" for horizon in (3, 5, 10)]].to_numpy()
    assert np.all(np.diff(values, axis=1) >= 0)


def test_atr_stop_decision_fills_at_following_open_and_accounting_reconciles() -> None:
    dates = pd.bdate_range("2024-01-01", periods=3)
    frame = pd.DataFrame({
        "ticker": "AAA", "date": dates, "open": [100, 99, 85], "close": [100, 88, 86],
        "atr14": [4, 4, 4], "psi_direction": [1, 1, 1], "psi_delta": [1, 1, 1],
        "reversal_probability_5": [0.1, 0.1, 0.1],
    })
    result = backtest.backtest_ticker(
        frame, backtest.PolicyConfig(atr_stop_multiple=2, cooldown_sessions=0), friction_bps=0,
    )
    assert result.trades.iloc[0]["exit_reason"] == "atr_stop"
    assert result.trades.iloc[0]["exit_date"] == dates[2]
    assert result.trades.iloc[0]["exit_price"] == 85
    final = result.ledger.iloc[-1]
    assert np.isclose(final["equity"], final["cash"] + final["shares"] * final["close"])


def test_artifact_hashes_and_research_gate_are_exported(tmp_path) -> None:
    model_dir = tmp_path / "member"
    model_dir.mkdir()
    (model_dir / "model.pt").write_bytes(b"deterministic-model")
    data_path = tmp_path / "dataset.parquet"
    data_path.write_bytes(b"deterministic-dataset")
    scores = pd.DataFrame({
        "ticker": ["AAA"], "date": [pd.Timestamp("2026-08-12")], "psi40": [75.0],
        "psi_direction": [1], "exhaustion_percentile": [90.0],
        "reversal_probability_3": [0.5], "reversal_probability_5": [0.7],
        "reversal_probability_10": [0.9], "expected_return_5": [0.01],
        "expected_return_10": [0.02], "expected_return_20": [0.03],
        "barrier_probability": [0.6], "expected_mfe_10": [0.05], "expected_mae_10": [-0.02],
        "prediction_uncertainty": [0.02], "target_position": [0], "reason": ["test"],
    })
    manifest = deployment.export_deployment_bundle(
        tmp_path / "deploy", scores, [model_dir], {"features": []}, {},
        backtest.PolicyConfig(), "QE-v2-test", data_path,
    )
    assert manifest["status"] == "research"
    score_path = tmp_path / "deploy" / "scores" / "AAA.json"
    assert manifest["scoreHashes"]["scores/AAA.json"] == deployment.sha256_file(score_path)
    stored = json.loads((tmp_path / "deploy" / "manifest.json").read_text(encoding="utf-8"))
    assert stored["promotion"]["promoted"] is False


def test_seed_reproduces_model_initialization() -> None:
    categories = models.CategoryMaps({"AAA": 1}, {"Test": 1})
    config = config_module.QEConfig(hidden_channels=8, embedding_dim=2)
    models.set_deterministic_seed(17)
    first = models.build_model("tcn", len(config_module.DYNAMIC_FEATURES), categories, config)
    models.set_deterministic_seed(17)
    second = models.build_model("tcn", len(config_module.DYNAMIC_FEATURES), categories, config)
    for left, right in zip(first.state_dict().values(), second.state_dict().values()):
        assert torch.equal(left, right)
