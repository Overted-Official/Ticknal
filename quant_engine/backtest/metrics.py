"""Economic metrics and the explicit QuantEGX success contract."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Any

import numpy as np

from .models import BacktestResult


class QualificationStatus(str, Enum):
    QUALIFIED = "QUALIFIED"
    FAILED_BENCHMARK = "FAILED_BENCHMARK"
    FAILED_WIN_RATE = "FAILED_WIN_RATE"
    FAILED_RISK = "FAILED_RISK"
    INSUFFICIENT_EVIDENCE = "INSUFFICIENT_EVIDENCE"


@dataclass(frozen=True)
class QualificationPolicy:
    minimum_win_rate: float = 0.75
    minimum_trades: int = 10
    preferred_max_average_holding_bars: float = 64.0
    maximum_drawdown: float | None = 0.10


def _safe_ratio(numerator: float, denominator: float) -> float | None:
    return numerator / denominator if denominator > 0 else None


def evaluate_backtest(
    result: BacktestResult,
    policy: QualificationPolicy | None = None,
) -> dict[str, Any]:
    policy = policy or QualificationPolicy()
    trades = list(result.trades)
    net_returns = np.array([trade.net_return for trade in trades], dtype=float)
    holding_bars = np.array([trade.holding_bars for trade in trades], dtype=float)

    strategy_roi = result.final_equity / result.initial_capital - 1.0
    buy_hold_roi = result.buy_hold_final_equity / result.initial_capital - 1.0
    excess_roi = strategy_roi - buy_hold_roi
    wealth_uplift = result.final_equity / result.buy_hold_final_equity - 1.0
    wins = int((net_returns > 0).sum()) if len(net_returns) else 0
    win_rate = wins / len(trades) if trades else 0.0
    gross_profit = float(net_returns[net_returns > 0].sum()) if len(net_returns) else 0.0
    gross_loss = float(-net_returns[net_returns < 0].sum()) if len(net_returns) else 0.0
    profit_factor = _safe_ratio(gross_profit, gross_loss)

    curve = result.equity_curve.copy()
    running_peak = curve["equity"].cummax()
    drawdown = curve["equity"].div(running_peak).sub(1.0)
    maximum_drawdown = float(-drawdown.min())
    daily_returns = curve["equity"].pct_change().dropna()
    daily_std = float(daily_returns.std(ddof=1)) if len(daily_returns) > 1 else 0.0
    downside = daily_returns[daily_returns < 0]
    downside_std = float(downside.std(ddof=1)) if len(downside) > 1 else 0.0
    sharpe = float(np.sqrt(252) * daily_returns.mean() / daily_std) if daily_std > 0 else None
    sortino = float(np.sqrt(252) * daily_returns.mean() / downside_std) if downside_std > 0 else None

    years = max((result.end_date - result.start_date).days / 365.25, 1 / 365.25)
    cagr = (result.final_equity / result.initial_capital) ** (1.0 / years) - 1.0
    exposure = float(curve["in_position"].mean())
    average_holding = float(holding_bars.mean()) if len(holding_bars) else 0.0

    if len(trades) < policy.minimum_trades:
        status = QualificationStatus.INSUFFICIENT_EVIDENCE
    elif strategy_roi <= buy_hold_roi:
        status = QualificationStatus.FAILED_BENCHMARK
    elif win_rate < policy.minimum_win_rate:
        status = QualificationStatus.FAILED_WIN_RATE
    elif policy.maximum_drawdown is not None and maximum_drawdown > policy.maximum_drawdown:
        status = QualificationStatus.FAILED_RISK
    else:
        status = QualificationStatus.QUALIFIED

    return {
        "ticker_symbol": result.ticker_symbol,
        "status": status.value,
        "period": {"start": str(result.start_date.date()), "end": str(result.end_date.date())},
        "strategy_roi": strategy_roi,
        "buy_hold_roi": buy_hold_roi,
        "excess_roi": excess_roi,
        "wealth_uplift_vs_buy_hold": wealth_uplift,
        "cagr": cagr,
        "maximum_drawdown": maximum_drawdown,
        "trade_count": len(trades),
        "win_count": wins,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "expectancy": float(net_returns.mean()) if len(net_returns) else 0.0,
        "average_holding_bars": average_holding,
        "median_holding_bars": float(np.median(holding_bars)) if len(holding_bars) else 0.0,
        "p90_holding_bars": float(np.quantile(holding_bars, 0.90)) if len(holding_bars) else 0.0,
        "p95_holding_bars": float(np.quantile(holding_bars, 0.95)) if len(holding_bars) else 0.0,
        "maximum_holding_bars": int(holding_bars.max()) if len(holding_bars) else 0,
        "share_trades_over_64_bars": float((holding_bars > 64).mean()) if len(holding_bars) else 0.0,
        "preferred_holding_target_met": average_holding <= policy.preferred_max_average_holding_bars,
        "exposure": exposure,
        "sharpe": sharpe,
        "sortino": sortino,
        "policy": asdict(policy),
        "execution": asdict(result.config),
    }
