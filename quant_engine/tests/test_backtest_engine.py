import pandas as pd
import pytest

from quant_engine.backtest import BacktestConfig, QualificationPolicy, evaluate_backtest, run_single_asset_backtest
from quant_engine.backtest.models import BacktestResult, Trade
from quant_engine.optimization.replay_v1 import build_barrier_signal_frame


def _frame():
    return pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "date": pd.date_range("2021-01-01", periods=5, freq="D"),
            "open": [10.0, 11.0, 11.5, 12.0, 12.5],
            "high": [10.5, 11.5, 12.0, 12.5, 13.0],
            "low": [9.5, 10.5, 11.0, 11.5, 12.0],
            "close": [10.2, 11.2, 11.8, 12.2, 12.8],
            "entry_signal": [True, False, False, False, False],
            "exit_signal": [False, False, True, False, False],
            "segment_id": "AAA:0",
            "is_eligible": True,
            "is_discontinuity": False,
        }
    )


def test_close_signal_executes_at_next_open():
    result = run_single_asset_backtest(
        _frame(), config=BacktestConfig(commission_bps_per_side=0, slippage_bps_per_side=0)
    )
    assert len(result.trades) == 1
    trade = result.trades[0]
    assert str(trade.entry_date.date()) == "2021-01-02"
    assert trade.entry_price == 11.0
    assert str(trade.exit_date.date()) == "2021-01-04"
    assert trade.exit_price == 12.0


def test_stop_wins_when_stop_and_target_are_touched_same_bar():
    frame = _frame().iloc[:3].copy()
    frame.loc[0, "stop_distance_pct"] = 0.10
    frame.loc[0, "target_distance_pct"] = 0.10
    frame.loc[1, ["open", "high", "low", "close"]] = [10.0, 12.0, 8.0, 10.0]
    result = run_single_asset_backtest(
        frame, config=BacktestConfig(commission_bps_per_side=0, slippage_bps_per_side=0)
    )
    assert result.trades[0].exit_reason == "stop"
    assert result.trades[0].exit_price == pytest.approx(9.0)


def test_maximum_holding_schedules_a_causal_next_open_exit():
    frame = _frame()
    frame["exit_signal"] = False
    frame.loc[0, "maximum_holding_bars"] = 2
    result = run_single_asset_backtest(
        frame, config=BacktestConfig(commission_bps_per_side=0, slippage_bps_per_side=0)
    )
    trade = result.trades[0]
    assert trade.exit_reason == "time_exit"
    assert str(trade.exit_date.date()) == "2021-01-04"
    assert trade.holding_bars == 2


def test_replay_accepts_expanded_candidate_dates_not_present_in_v1(monkeypatch):
    frame = _frame()
    frame["entry_signal"] = False
    frame["atr_14"] = 1.0
    monkeypatch.setattr(
        "quant_engine.optimization.replay_v1.build_master_index_rule_frame",
        lambda prices, params: frame.copy(),
    )
    predictions = pd.DataFrame(
        {"ticker_symbol": ["AAA"], "date": [frame.loc[1, "date"]], "scale": ["small"], "accepted": [True]}
    )
    replay = build_barrier_signal_frame(frame, predictions, "small")
    assert replay.loc[1, "entry_signal"] == True


def test_holding_target_is_soft_when_other_qualification_gates_pass():
    trades = tuple(
        Trade(
            ticker_symbol="AAA",
            signal_date=pd.Timestamp("2021-01-01"),
            entry_date=pd.Timestamp("2021-01-02"),
            exit_date=pd.Timestamp("2021-04-01"),
            entry_price=10,
            exit_price=12,
            shares=10,
            gross_return=0.2,
            net_return=0.18,
            net_pnl=18,
            holding_bars=80,
            exit_reason="target",
            maximum_adverse_excursion=-0.02,
            maximum_favorable_excursion=0.21,
        )
        for _ in range(10)
    )
    curve = pd.DataFrame(
        {
            "date": pd.date_range("2021-01-01", periods=10),
            "cash": [100] * 10,
            "position_value": [0] * 10,
            "equity": [100, 102, 105, 108, 112, 118, 125, 135, 150, 180],
            "in_position": [False] * 10,
        }
    )
    result = BacktestResult(
        ticker_symbol="AAA",
        config=BacktestConfig(initial_capital=100),
        trades=trades,
        equity_curve=curve,
        initial_capital=100,
        final_equity=180,
        buy_hold_final_equity=150,
        start_date=pd.Timestamp("2021-01-01"),
        end_date=pd.Timestamp("2022-01-01"),
    )
    metrics = evaluate_backtest(result, QualificationPolicy(maximum_drawdown=None))
    assert metrics["status"] == "QUALIFIED"
    assert metrics["preferred_holding_target_met"] is False
