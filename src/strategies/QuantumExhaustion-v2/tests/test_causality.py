from __future__ import annotations

import importlib

import pandas as pd
from pandas.testing import assert_frame_equal


config_module = importlib.import_module("src.strategies.QuantumExhaustion-v2.config")
data_module = importlib.import_module("src.strategies.QuantumExhaustion-v2.data")


def test_appending_bars_does_not_rewrite_features_or_mature_labels(price_frame: pd.DataFrame) -> None:
    config = config_module.QEConfig(minimum_history=1)
    cutoff = pd.Timestamp("2021-01-15")
    prefix = price_frame[price_frame["date"] <= cutoff]
    extended = price_frame[price_frame["date"] <= cutoff + pd.offsets.BDay(20)]
    prefix_dataset = data_module.build_causal_dataset(prefix, config)
    extended_dataset = data_module.build_causal_dataset(extended, config)
    feature_columns = ["ticker", "date", *config_module.DYNAMIC_FEATURES]
    assert_frame_equal(
        prefix_dataset[feature_columns].reset_index(drop=True),
        extended_dataset.loc[extended_dataset["date"] <= cutoff, feature_columns].reset_index(drop=True),
        check_dtype=False,
        atol=1e-7,
    )
    mature_cutoff = cutoff - pd.offsets.BDay(20)
    label_columns = ["ticker", "date", "event_time", "event_observed", "barrier_success", "mfe_10", "mae_10",
                     "target_return_5", "target_return_10", "target_return_20"]
    assert_frame_equal(
        prefix_dataset.loc[prefix_dataset["date"] <= mature_cutoff, label_columns].reset_index(drop=True),
        extended_dataset.loc[extended_dataset["date"] <= mature_cutoff, label_columns].reset_index(drop=True),
        check_dtype=False,
        atol=1e-7,
    )


def test_price_extremum_is_only_observable_on_confirmation_date() -> None:
    swings = importlib.import_module("src.strategies.QuantumExhaustion-v2.swings")
    frame = pd.DataFrame({
        "date": pd.bdate_range("2024-01-01", periods=8),
        "close": [100, 102, 105, 108, 107, 105, 104, 103],
        "psi40": [30, 35, 45, 70, 67, 58, 50, 45],
        "median_daily_move": [0.01] * 8,
    })
    config = config_module.QEConfig(
        minimum_history=1,
        swing_median_min_periods=1,
        swing_threshold_multiplier=2.0,
        swing_threshold_floor=0.005,
    )
    state = swings.causal_price_swing_features(frame, config)
    assert state.loc[:4, "confirmed_pivot_type"].max() <= 0
    assert state.loc[5, "pivot_confirmation"] == 1
    assert state.loc[4, "psi_direction"] == 1
    assert state.loc[5, "psi_direction"] == -1
