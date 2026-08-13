from __future__ import annotations

import importlib

import numpy as np
import pandas as pd
import torch


config_module = importlib.import_module("src.strategies.QuantumExhaustion-v2.config")
data_module = importlib.import_module("src.strategies.QuantumExhaustion-v2.data")
models = importlib.import_module("src.strategies.QuantumExhaustion-v2.models")
baselines = importlib.import_module("src.strategies.QuantumExhaustion-v2.baselines")


def test_sequences_never_cross_ticker_boundaries(price_frame: pd.DataFrame) -> None:
    frame = data_module.build_causal_dataset(price_frame, config_module.QEConfig(minimum_history=1))
    scaler = models.FeatureScaler.fit(frame)
    categories = models.CategoryMaps.fit(frame)
    dataset = models.SequenceDataset(frame, scaler, categories, sequence_length=32)
    for end in dataset.ends:
        start = end - 31
        assert dataset.frame.iloc[start]["ticker"] == dataset.frame.iloc[end]["ticker"]


def test_tcn_and_tft_emit_all_multi_task_heads(price_frame: pd.DataFrame) -> None:
    frame = data_module.build_causal_dataset(price_frame, config_module.QEConfig(minimum_history=1))
    scaler = models.FeatureScaler.fit(frame)
    categories = models.CategoryMaps.fit(frame)
    dataset = models.SequenceDataset(frame, scaler, categories, sequence_length=32)
    batch = dataset[0]
    config = config_module.QEConfig(minimum_history=1, hidden_channels=16, embedding_dim=4, dropout=0.0)
    for model_type in ("tcn", "tft"):
        model = models.build_model(model_type, len(config_module.DYNAMIC_FEATURES), categories, config).eval()
        with torch.no_grad():
            output = model(batch["x"].unsqueeze(0), batch["ticker"].unsqueeze(0), batch["sector"].unsqueeze(0))
        assert output["hazard_logits"].shape == (1, 10)
        assert output["returns"].shape == (1, 3)
        assert output["excursions"].shape == (1, 2)
        cumulative = models.hazard_probabilities(output["hazard_logits"]).numpy()[0]
        assert np.all(np.diff(cumulative) >= -1e-7)


def test_causal_convolution_cannot_change_past_outputs() -> None:
    torch.manual_seed(17)
    layer = models.CausalConv1d(2, 3, kernel_size=3, dilation=2)
    prefix = torch.randn(1, 2, 12)
    extension = torch.randn(1, 2, 5)
    prefix_output = layer(prefix)
    extended_output = layer(torch.cat([prefix, extension], dim=-1))
    assert torch.allclose(prefix_output, extended_output[:, :, : prefix.shape[-1]], atol=1e-7)


def test_regularized_discrete_hazard_baseline_outputs_daily_hazards(price_frame: pd.DataFrame) -> None:
    frame = data_module.build_causal_dataset(price_frame, config_module.QEConfig(minimum_history=1)).iloc[200:500]
    prediction = baselines.LogisticHazardBaseline().fit(frame).predict(frame)
    hazards = prediction[[f"hazard_probability_{day}" for day in range(1, 11)]].to_numpy()
    cumulative = prediction[[f"p_reversal_{horizon}" for horizon in (3, 5, 10)]].to_numpy()
    assert np.all((hazards >= 0) & (hazards <= 1))
    assert np.all(np.diff(cumulative, axis=1) >= -1e-7)
