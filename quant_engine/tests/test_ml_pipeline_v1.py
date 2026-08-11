import numpy as np

from quant_engine.models import select_precision_threshold
from quant_engine.optimization import rank_champions


def test_precision_threshold_uses_broadest_set_that_passes_gate():
    truth = np.array([1, 1, 1, 0, 0])
    probabilities = np.array([0.9, 0.8, 0.7, 0.6, 0.5])
    selected = select_precision_threshold(truth, probabilities, minimum_precision=0.75, minimum_accepted=2)
    assert selected.gate_met is True
    assert selected.threshold == 0.6
    assert selected.accepted_count == 4
    assert selected.precision == 0.75


def test_precision_threshold_rejects_everything_when_gate_is_impossible():
    selected = select_precision_threshold(
        [0, 0, 1], [0.9, 0.8, 0.1], minimum_precision=0.75, minimum_accepted=2
    )
    assert selected.gate_met is False
    assert selected.threshold > 1.0


def test_precision_threshold_respects_multitask_eligibility_mask():
    selected = select_precision_threshold(
        [1, 0, 1, 1],
        [0.95, 0.90, 0.80, 0.70],
        minimum_precision=0.75,
        minimum_accepted=2,
        eligibility_mask=[True, False, True, False],
    )
    assert selected.gate_met is True
    assert selected.accepted_count == 2
    assert selected.precision == 1.0


def test_champion_selection_never_promotes_a_failed_hard_gate():
    base = {
        "ticker_symbol": "AAA",
        "trade_count": 20,
        "buy_hold_roi": 1.0,
        "maximum_drawdown": 0.08,
        "average_holding_bars": 10,
    }
    reports = [
        {**base, "scale": "small", "strategy_roi": 2.0, "win_rate": 0.70},
        {**base, "scale": "medium", "strategy_roi": 1.5, "win_rate": 0.80},
    ]
    selection = rank_champions(reports)
    assert selection["champion"]["scale"] == "medium"
    assert selection["qualified_count"] == 1
