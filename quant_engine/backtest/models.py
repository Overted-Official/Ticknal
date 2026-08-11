"""Backtest configuration and immutable result records."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

import pandas as pd


@dataclass(frozen=True)
class BacktestConfig:
    initial_capital: float = 10_000.0
    commission_bps_per_side: float = 10.0
    slippage_bps_per_side: float = 15.0
    position_fraction: float = 1.0
    force_exit_at_end: bool = True

    def __post_init__(self) -> None:
        if self.initial_capital <= 0:
            raise ValueError("initial_capital must be positive")
        if not 0 < self.position_fraction <= 1:
            raise ValueError("position_fraction must be in (0, 1]")
        if self.commission_bps_per_side < 0 or self.slippage_bps_per_side < 0:
            raise ValueError("execution costs cannot be negative")

    @property
    def commission_rate(self) -> float:
        return self.commission_bps_per_side / 10_000.0

    @property
    def slippage_rate(self) -> float:
        return self.slippage_bps_per_side / 10_000.0


@dataclass(frozen=True)
class Trade:
    ticker_symbol: str
    signal_date: pd.Timestamp
    entry_date: pd.Timestamp
    exit_date: pd.Timestamp
    entry_price: float
    exit_price: float
    shares: int
    gross_return: float
    net_return: float
    net_pnl: float
    holding_bars: int
    exit_reason: str
    maximum_adverse_excursion: float
    maximum_favorable_excursion: float

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        for key in ("signal_date", "entry_date", "exit_date"):
            payload[key] = str(payload[key].date())
        return payload


@dataclass(frozen=True)
class BacktestResult:
    ticker_symbol: str
    config: BacktestConfig
    trades: tuple[Trade, ...]
    equity_curve: pd.DataFrame
    initial_capital: float
    final_equity: float
    buy_hold_final_equity: float
    start_date: pd.Timestamp
    end_date: pd.Timestamp

