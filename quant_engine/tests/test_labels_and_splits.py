import pandas as pd
import pytest

from quant_engine.labels import BarrierDefinition, apply_triple_barrier_labels, net_return_after_costs
from quant_engine.validation import annual_walk_forward_folds


def test_same_bar_collision_is_labeled_as_stop():
    frame = pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "date": pd.date_range("2021-01-01", periods=4),
            "open": [10, 10, 10, 10],
            "high": [10, 12, 10, 10],
            "low": [10, 8, 10, 10],
            "close": [10, 10, 10, 10],
            "segment_id": "AAA:0",
            "entry_signal": [True, False, False, False],
            "atr_14": [1, 1, 1, 1],
        }
    )
    labeled = apply_triple_barrier_labels(
        frame,
        definitions=(BarrierDefinition("test", 1, 1, 2),),
    )
    assert labeled.loc[0, "label_test"] == 0
    assert labeled.loc[0, "outcome_test"] == "stop"


def test_incomplete_horizon_is_not_mislabeled_as_loss():
    frame = pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "date": pd.date_range("2021-01-01", periods=2),
            "open": [10, 10],
            "high": [10, 10.2],
            "low": [10, 9.8],
            "close": [10, 10],
            "segment_id": "AAA:0",
            "entry_signal": [True, False],
            "atr_14": [1, 1],
        }
    )
    labeled = apply_triple_barrier_labels(
        frame,
        definitions=(BarrierDefinition("test", 2, 2, 5),),
    )
    assert pd.isna(labeled.loc[0, "label_test"])


def test_cost_aware_return_matches_round_trip_execution_factors():
    result = net_return_after_costs(0.10, commission_bps_per_side=10, slippage_bps_per_side=15)
    expected = 1.10 * (1 - 0.0015) * (1 - 0.0010) / ((1 + 0.0015) * (1 + 0.0010)) - 1
    assert result == pytest.approx(expected)
    assert net_return_after_costs(0.0) < 0


def test_walk_forward_folds_are_chronological_and_purged():
    dates = pd.bdate_range("2015-01-01", "2023-12-31")
    folds = annual_walk_forward_folds(dates, first_test_year=2021, label_horizon_bars=10, embargo_bars=5)
    assert [fold.test_year for fold in folds] == [2021, 2022, 2023]
    for fold in folds:
        assert fold.train_dates.max() < fold.calibration_dates.min()
        assert fold.calibration_dates.max() < fold.test_dates.min()
        assert len(pd.bdate_range(fold.calibration_dates.max(), fold.test_dates.min())) > 10
