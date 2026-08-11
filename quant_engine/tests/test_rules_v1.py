import numpy as np
import pandas as pd

from quant_engine.strategy.params import get_global_candidate_params
from quant_engine.strategy.rules_v1 import build_master_index_rule_frame


def test_global_candidate_crossing_is_gated_by_point_in_time_eligibility(monkeypatch):
    periods = 35
    master = np.full(periods, 10.0)
    master[5] = 70.0
    master[7] = 70.0

    def fake_master_index(frame, params):
        output = frame.sort_values("date").reset_index(drop=True).copy()
        output["master_index_raw"] = master
        output["mdm"] = 1.0
        output["atr_14"] = 1.0
        output["st_dir"] = 1
        for column in (
            "np_score",
            "rsi_score",
            "banker_score",
            "bb_score",
            "st_score",
            "adx_score",
            "ma_score",
            "slope_score",
        ):
            output[column] = 50.0
        return output

    monkeypatch.setattr("quant_engine.strategy.rules_v1.compute_master_index", fake_master_index)
    prices = pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "date": pd.bdate_range("2020-01-01", periods=periods),
            "open": 10.0,
            "high": 11.0,
            "low": 9.0,
            "close": 10.0,
            "volume": 2_000_000,
            "segment_id": "AAA:0",
            "is_eligible": True,
        }
    )
    prices.loc[5, "is_eligible"] = False
    result = build_master_index_rule_frame(prices, get_global_candidate_params())
    assert result.loc[5, "entry_signal"] == False
    assert result.loc[7, "entry_signal"] == True
    assert result.loc[7, "entry_cross_level"] == 61.8
    assert result.loc[7, "rule_cross_level"] == 0.618
