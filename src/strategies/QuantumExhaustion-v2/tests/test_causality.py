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


def test_reversal_extremum_is_only_observable_on_confirmation_date() -> None:
    psi = pd.Series([50, 53, 56, 60, 58, 56, 55, 52, 49], dtype=float)
    legs = data_module.causal_leg_features(psi, reversal_points=5)
    assert legs.loc[:5, "reversal_confirmation"].sum() == 0
    assert legs.loc[6, "reversal_confirmation"] == 1
    assert legs.loc[5, "psi_direction"] == 1
    assert legs.loc[6, "psi_direction"] == -1
