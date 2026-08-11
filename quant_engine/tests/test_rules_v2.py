import pandas as pd

from quant_engine.strategy.rules_v2 import build_expanded_candidate_frame


def test_expanded_candidate_accepts_non_master_reversal(monkeypatch):
    frame = pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "segment_id": "AAA:0",
            "date": pd.bdate_range("2021-01-01", periods=55),
            "open": 10.0,
            "high": 10.5,
            "low": 9.5,
            "close": 10.0,
            "volume": 1_000_000,
            "entry_cross_level": pd.NA,
            "rule_cross_level": pd.NA,
            "rsi_score": 40.0,
            "bb_score": 50.0,
            "st_dir": 1,
            "is_eligible": True,
        }
    )
    frame.loc[29, "rsi_score"] = 30.0
    frame.loc[30, "rsi_score"] = 40.0
    monkeypatch.setattr(
        "quant_engine.strategy.rules_v2.build_master_index_rule_frame",
        lambda prices, params: frame.copy(),
    )
    result = build_expanded_candidate_frame(frame)
    assert result.loc[30, "rule_source_master_cross"] == 0
    assert result.loc[30, "rule_source_rsi_reversal"] == 1
    assert result.loc[30, "entry_signal"] == True
    assert result.loc[30, "rule_cross_level"] == 0.0
