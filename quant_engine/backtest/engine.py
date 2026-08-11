"""Single-asset event-driven backtester with causal next-open execution."""

from __future__ import annotations

from dataclasses import dataclass
from math import floor

import numpy as np
import pandas as pd

from .models import BacktestConfig, BacktestResult, Trade


@dataclass
class _PendingEntry:
    signal_date: pd.Timestamp
    segment_id: str | None
    stop_distance_pct: float | None
    target_distance_pct: float | None
    trailing_atr_multiple: float | None
    target_active: bool
    maximum_holding_bars: int | None


@dataclass
class _Position:
    signal_date: pd.Timestamp
    entry_date: pd.Timestamp
    entry_index: int
    entry_price: float
    shares: int
    entry_total_cost: float
    segment_id: str | None
    original_stop: float | None
    active_stop: float | None
    target_price: float | None
    target_active: bool
    trailing_atr_multiple: float | None
    high_watermark: float
    lowest_price: float
    highest_price: float
    maximum_holding_bars: int | None


def _optional_positive(value: object) -> float | None:
    if value is None or pd.isna(value):
        return None
    number = float(value)
    return number if number > 0 else None


def _optional_positive_integer(value: object) -> int | None:
    number = _optional_positive(value)
    return int(number) if number is not None else None


def _sell_execution_price(raw_price: float, config: BacktestConfig) -> float:
    return raw_price * (1.0 - config.slippage_rate)


def _buy_execution_price(raw_price: float, config: BacktestConfig) -> float:
    return raw_price * (1.0 + config.slippage_rate)


def _calculate_buy_hold(prices: pd.DataFrame, config: BacktestConfig) -> float:
    first = prices.iloc[0]
    last = prices.iloc[-1]
    entry_price = _buy_execution_price(float(first["open"]), config)
    budget = config.initial_capital
    shares = floor(budget / (entry_price * (1.0 + config.commission_rate)))
    if shares <= 0:
        return config.initial_capital
    entry_notional = shares * entry_price
    cash = budget - entry_notional - entry_notional * config.commission_rate
    exit_price = _sell_execution_price(float(last["close"]), config)
    exit_notional = shares * exit_price
    return cash + exit_notional - exit_notional * config.commission_rate


def run_single_asset_backtest(
    signal_frame: pd.DataFrame,
    *,
    start_date: str | pd.Timestamp = "2021-01-01",
    end_date: str | pd.Timestamp | None = None,
    config: BacktestConfig | None = None,
) -> BacktestResult:
    """Execute causal signals for exactly one ticker.

    ``entry_signal`` and ``exit_signal`` are decisions made at a session close.
    They execute at the following valid session's open. Stop, target, and
    trailing orders are active during a bar only when their inputs were known by
    the prior close. If stop and target are both touched, the stop is assumed to
    execute first.
    """
    config = config or BacktestConfig()
    required = {"ticker_symbol", "date", "open", "high", "low", "close", "entry_signal", "exit_signal"}
    missing = required.difference(signal_frame.columns)
    if missing:
        raise ValueError(f"Missing backtest columns: {', '.join(sorted(missing))}")

    frame = signal_frame.copy()
    frame["date"] = pd.to_datetime(frame["date"])
    frame = frame.sort_values("date", kind="stable").reset_index(drop=True)
    symbols = frame["ticker_symbol"].dropna().unique()
    if len(symbols) != 1:
        raise ValueError("run_single_asset_backtest requires exactly one ticker")
    ticker_symbol = str(symbols[0])

    start = pd.Timestamp(start_date)
    end = pd.Timestamp(end_date) if end_date is not None else frame["date"].max()
    execution = frame.loc[frame["date"].between(start, end)].reset_index(drop=True)
    if len(execution) < 2:
        raise ValueError("At least two execution bars are required")

    defaults: dict[str, object] = {
        "is_eligible": True,
        "is_discontinuity": False,
        "segment_id": None,
        "stop_distance_pct": np.nan,
        "target_distance_pct": np.nan,
        "trailing_atr_multiple": np.nan,
        "atr": np.nan,
        "allow_target_exit": True,
        "exit_only_if_profitable": False,
        "exit_reason": "strategy_exit",
        "maximum_holding_bars": np.nan,
    }
    for column, default in defaults.items():
        if column not in execution.columns:
            execution[column] = default

    cash = config.initial_capital
    position: _Position | None = None
    pending_entry: _PendingEntry | None = None
    pending_exit_reason: str | None = None
    trades: list[Trade] = []
    equity_rows: list[dict[str, object]] = []

    def close_position(raw_price: float, date: pd.Timestamp, index: int, reason: str) -> None:
        nonlocal cash, position, pending_exit_reason
        if position is None:
            return
        exit_price = _sell_execution_price(float(raw_price), config)
        exit_notional = position.shares * exit_price
        net_proceeds = exit_notional - exit_notional * config.commission_rate
        cash += net_proceeds
        net_pnl = net_proceeds - position.entry_total_cost
        gross_return = exit_price / position.entry_price - 1.0
        net_return = net_pnl / position.entry_total_cost
        mae = position.lowest_price / position.entry_price - 1.0
        mfe = position.highest_price / position.entry_price - 1.0
        trades.append(
            Trade(
                ticker_symbol=ticker_symbol,
                signal_date=position.signal_date,
                entry_date=position.entry_date,
                exit_date=date,
                entry_price=position.entry_price,
                exit_price=exit_price,
                shares=position.shares,
                gross_return=gross_return,
                net_return=net_return,
                net_pnl=net_pnl,
                holding_bars=max(1, index - position.entry_index),
                exit_reason=reason,
                maximum_adverse_excursion=mae,
                maximum_favorable_excursion=mfe,
            )
        )
        position = None
        pending_exit_reason = None

    for index, row in execution.iterrows():
        date = pd.Timestamp(row["date"])
        open_price = float(row["open"])
        high_price = float(row["high"])
        low_price = float(row["low"])
        close_price = float(row["close"])

        # Risk orders and close-generated exits execute before a new entry.
        if position is not None:
            if position.active_stop is not None and open_price <= position.active_stop:
                close_position(open_price, date, index, "gap_stop")
            elif position.target_price is not None and position.target_active and open_price >= position.target_price:
                close_position(position.target_price, date, index, "gap_target")
            elif pending_exit_reason is not None:
                close_position(open_price, date, index, pending_exit_reason)

        if position is None and pending_entry is not None:
            same_segment = pending_entry.segment_id is None or str(row["segment_id"]) == pending_entry.segment_id
            if same_segment and not bool(row["is_discontinuity"]):
                entry_price = _buy_execution_price(open_price, config)
                budget = cash * config.position_fraction
                shares = floor(budget / (entry_price * (1.0 + config.commission_rate)))
                if shares > 0:
                    entry_notional = shares * entry_price
                    commission = entry_notional * config.commission_rate
                    entry_total_cost = entry_notional + commission
                    cash -= entry_total_cost
                    stop_price = (
                        entry_price * (1.0 - pending_entry.stop_distance_pct)
                        if pending_entry.stop_distance_pct is not None
                        else None
                    )
                    target_price = (
                        entry_price * (1.0 + pending_entry.target_distance_pct)
                        if pending_entry.target_distance_pct is not None
                        else None
                    )
                    position = _Position(
                        signal_date=pending_entry.signal_date,
                        entry_date=date,
                        entry_index=index,
                        entry_price=entry_price,
                        shares=shares,
                        entry_total_cost=entry_total_cost,
                        segment_id=pending_entry.segment_id,
                        original_stop=stop_price,
                        active_stop=stop_price,
                        target_price=target_price,
                        target_active=pending_entry.target_active,
                        trailing_atr_multiple=pending_entry.trailing_atr_multiple,
                        high_watermark=open_price,
                        lowest_price=open_price,
                        highest_price=open_price,
                        maximum_holding_bars=pending_entry.maximum_holding_bars,
                    )
            pending_entry = None

        # Intraday bracket execution. Adverse-first resolves unknown sequencing.
        if position is not None:
            stop_touched = position.active_stop is not None and low_price <= position.active_stop
            target_touched = (
                position.target_price is not None
                and position.target_active
                and high_price >= position.target_price
            )
            position.lowest_price = min(position.lowest_price, low_price)
            position.highest_price = max(position.highest_price, high_price)
            if stop_touched:
                close_position(float(position.active_stop), date, index, "stop")
            elif target_touched:
                close_position(float(position.target_price), date, index, "target")

        # Close decisions affect only the following bar.
        if position is not None:
            position.high_watermark = max(position.high_watermark, high_price)
            atr = _optional_positive(row["atr"])
            if position.trailing_atr_multiple is not None and atr is not None:
                trailing_stop = position.high_watermark - atr * position.trailing_atr_multiple
                if trailing_stop > position.entry_price:
                    position.active_stop = max(position.active_stop or trailing_stop, trailing_stop)
            position.target_active = bool(row["allow_target_exit"])

            profitable = close_price > position.entry_price
            if bool(row["exit_signal"]) and (not bool(row["exit_only_if_profitable"]) or profitable):
                pending_exit_reason = str(row["exit_reason"] or "strategy_exit")
            held_sessions = index - position.entry_index + 1
            if (
                pending_exit_reason is None
                and position.maximum_holding_bars is not None
                and held_sessions >= position.maximum_holding_bars
            ):
                pending_exit_reason = "time_exit"
        elif bool(row["entry_signal"]) and bool(row["is_eligible"]) and not bool(row["is_discontinuity"]):
            pending_entry = _PendingEntry(
                signal_date=date,
                segment_id=str(row["segment_id"]) if pd.notna(row["segment_id"]) else None,
                stop_distance_pct=_optional_positive(row["stop_distance_pct"]),
                target_distance_pct=_optional_positive(row["target_distance_pct"]),
                trailing_atr_multiple=_optional_positive(row["trailing_atr_multiple"]),
                target_active=bool(row["allow_target_exit"]),
                maximum_holding_bars=_optional_positive_integer(row["maximum_holding_bars"]),
            )

        position_value = position.shares * close_price if position is not None else 0.0
        equity_rows.append(
            {
                "date": date,
                "cash": cash,
                "position_value": position_value,
                "equity": cash + position_value,
                "in_position": position is not None,
            }
        )

    if position is not None and config.force_exit_at_end:
        last_index = len(execution) - 1
        last = execution.iloc[-1]
        close_position(float(last["close"]), pd.Timestamp(last["date"]), last_index, "end_of_test")
        equity_rows[-1]["cash"] = cash
        equity_rows[-1]["position_value"] = 0.0
        equity_rows[-1]["equity"] = cash
        equity_rows[-1]["in_position"] = False

    equity_curve = pd.DataFrame(equity_rows)
    return BacktestResult(
        ticker_symbol=ticker_symbol,
        config=config,
        trades=tuple(trades),
        equity_curve=equity_curve,
        initial_capital=config.initial_capital,
        final_equity=float(equity_curve.iloc[-1]["equity"]),
        buy_hold_final_equity=_calculate_buy_hold(execution, config),
        start_date=pd.Timestamp(execution.iloc[0]["date"]),
        end_date=pd.Timestamp(execution.iloc[-1]["date"]),
    )
