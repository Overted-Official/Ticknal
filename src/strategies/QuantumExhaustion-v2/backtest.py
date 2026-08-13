"""Event-driven next-open trading simulation for QE-v2."""

from __future__ import annotations

from dataclasses import asdict, dataclass

import numpy as np
import pandas as pd

from .swings import pivot_event_table


@dataclass(frozen=True)
class PolicyConfig:
    entry_probability: float = 0.62
    exit_probability: float = 0.68
    hysteresis: float = 0.05
    cooldown_sessions: int = 3
    atr_stop_multiple: float = 2.5
    trailing_atr_multiple: float = 3.0
    maximum_holding_sessions: int = 120
    probability_horizon: int = 5
    hook_exit_probability: float = 0.50
    maximum_cash_sessions: int = 20
    exit_return_ceiling: float = 0.02
    entry_return_floor: float = -0.02
    minimum_barrier_probability: float = 0.50

    def to_dict(self) -> dict[str, float | int]:
        return asdict(self)


@dataclass
class BacktestResult:
    ledger: pd.DataFrame
    trades: pd.DataFrame
    metrics: dict[str, float | int]


def _max_drawdown(equity: pd.Series) -> float:
    if equity.empty:
        return 0.0
    return float((equity / equity.cummax() - 1.0).min())


def _annualized_return(equity: pd.Series, dates: pd.Series) -> float:
    if len(equity) < 2 or equity.iloc[0] <= 0:
        return 0.0
    years = max((pd.Timestamp(dates.iloc[-1]) - pd.Timestamp(dates.iloc[0])).days / 365.25, 1 / 365.25)
    return float((equity.iloc[-1] / equity.iloc[0]) ** (1 / years) - 1)


def _policy_signal(row: pd.Series, previous: pd.Series | None, position: int, policy: PolicyConfig) -> tuple[int, str]:
    probability_column = f"p_reversal_{policy.probability_horizon}"
    public_probability_column = f"reversal_probability_{policy.probability_horizon}"
    probability = float(row.get(probability_column, row.get(public_probability_column, 0.0)))
    previous_probability = (
        float(previous.get(probability_column, previous.get(public_probability_column, 0.0)))
        if previous is not None else 0.0
    )
    # psi_direction now mirrors the confirmed price leg: +1 bottom->top, -1 top->bottom.
    direction = int(row.get("psi_direction", 0))
    hook = float(row.get("psi_delta_1", row.get("psi_delta", 0.0)))
    previous_hook = (
        float(previous.get("psi_delta_1", previous.get("psi_delta", 0.0)))
        if previous is not None else 0.0
    )
    expected_return = float(row.get("expected_return_10", 0.0))
    barrier_probability = float(row.get("p_barrier", row.get("barrier_probability", 0.5)))
    exit_confirmed = (
        expected_return <= policy.exit_return_ceiling
        and barrier_probability >= policy.minimum_barrier_probability
    )
    entry_confirmed = (
        expected_return >= policy.entry_return_floor
        and barrier_probability >= policy.minimum_barrier_probability
    )

    if position:
        hazard_cross = (
            direction > 0 and probability >= policy.exit_probability
            and previous_probability < policy.exit_probability and exit_confirmed
        )
        negative_hook = (
            hook < 0 <= previous_hook and probability >= policy.hook_exit_probability and exit_confirmed
        )
        if hazard_cross:
            return 0, "price_top_probability"
        if negative_hook:
            return 0, "negative_psi_hook"
        return 1, "hold_long"

    entry_floor = max(policy.entry_probability, policy.exit_probability - policy.hysteresis)
    hazard_cross = (
        direction < 0 and probability >= entry_floor and previous_probability < entry_floor and entry_confirmed
    )
    positive_hook = hook > 0 >= previous_hook and entry_confirmed
    if hazard_cross:
        return 1, "price_bottom_probability"
    if positive_hook:
        return 1, "positive_psi_hook"
    return 0, "hold_cash"


def backtest_ticker(
    frame: pd.DataFrame,
    policy: PolicyConfig | None = None,
    initial_cash: float = 100_000.0,
    friction_bps: float = 0.0,
) -> BacktestResult:
    """Simulate one ticker, executing close-generated decisions at the next valid open."""
    policy = policy or PolicyConfig()
    data = frame.sort_values("date").drop_duplicates("date").reset_index(drop=True).copy()
    if data.empty:
        return BacktestResult(pd.DataFrame(), pd.DataFrame(), {})

    cash = float(initial_cash)
    shares = 0.0
    pending_target: int | None = 1  # risk-on default; filled at first available open
    pending_reason = "risk_on_default"
    entry_price = np.nan
    high_watermark = np.nan
    holding_sessions = 0
    trade_mfe = 0.0
    trade_mae = 0.0
    cooldown = 0
    cash_sessions = 0
    trade_open: dict[str, object] | None = None
    ledger_rows: list[dict[str, object]] = []
    trades: list[dict[str, object]] = []
    previous: pd.Series | None = None
    cost_rate = friction_bps / 10_000.0

    for _, row in data.iterrows():
        date = pd.Timestamp(row["date"])
        open_price = float(row["open"])
        close_price = float(row["close"])
        fill = None

        # A pending target is carried until a row with a usable open is observed.
        if pending_target is not None and np.isfinite(open_price) and open_price > 0:
            if pending_target == 1 and shares == 0:
                fill_price = open_price * (1.0 + cost_rate)
                shares = cash / fill_price
                cash -= shares * fill_price
                entry_price = fill_price
                high_watermark = open_price
                holding_sessions = 0
                cash_sessions = 0
                trade_mfe = 0.0
                trade_mae = 0.0
                trade_open = {
                    "ticker": row["ticker"], "entry_date": date, "entry_price": fill_price,
                    "entry_reason": pending_reason, "shares": shares,
                }
                fill = "buy"
            elif pending_target == 0 and shares > 0:
                fill_price = open_price * (1.0 - cost_rate)
                proceeds = shares * fill_price
                cash += proceeds
                if trade_open is not None:
                    trades.append({
                        **trade_open,
                        "exit_date": date,
                        "exit_price": fill_price,
                        "exit_reason": pending_reason,
                        "return": fill_price / float(trade_open["entry_price"]) - 1.0,
                        "holding_sessions": holding_sessions,
                        "mfe": trade_mfe,
                        "mae": trade_mae,
                    })
                shares = 0.0
                entry_price = np.nan
                high_watermark = np.nan
                holding_sessions = 0
                cash_sessions = 0
                trade_mfe = 0.0
                trade_mae = 0.0
                trade_open = None
                fill = "sell"
            pending_target = None
            pending_reason = ""

        position = int(shares > 0)
        if position:
            holding_sessions += 1
            bar_high = float(row.get("high", close_price))
            bar_low = float(row.get("low", close_price))
            high_watermark = max(float(high_watermark), bar_high)
            trade_mfe = max(trade_mfe, bar_high / float(entry_price) - 1.0)
            trade_mae = min(trade_mae, bar_low / float(entry_price) - 1.0)
            cash_sessions = 0
        else:
            cash_sessions += 1
        cooldown = max(0, cooldown - 1)

        desired, reason = _policy_signal(row, previous, position, policy)
        atr = float(row.get("atr14", np.nan))
        if position and np.isfinite(atr) and atr > 0:
            if close_price <= float(entry_price) - policy.atr_stop_multiple * atr:
                desired, reason = 0, "atr_stop"
            elif close_price <= float(high_watermark) - policy.trailing_atr_multiple * atr:
                desired, reason = 0, "trailing_atr_stop"
        if position and holding_sessions >= policy.maximum_holding_sessions:
            desired, reason = 0, "maximum_holding_guardrail"
        if not position and cash_sessions >= policy.maximum_cash_sessions:
            desired, reason = 1, "risk_on_cash_timeout"

        if desired != position and cooldown == 0 and pending_target is None:
            pending_target = desired
            pending_reason = reason
            cooldown = policy.cooldown_sessions

        equity = cash + shares * close_price
        ledger_rows.append({
            "ticker": row["ticker"], "date": date, "cash": cash, "shares": shares,
            "open": open_price, "close": close_price, "fill": fill,
            "position": position, "target_position": desired,
            "pending_target": pending_target, "reason": reason,
            "equity": equity, "exposure": shares * close_price / equity if equity else 0.0,
            "holding_sessions": holding_sessions,
            "cash_sessions": cash_sessions,
            "trade_mfe": trade_mfe if position else None,
            "trade_mae": trade_mae if position else None,
        })
        previous = row

    ledger = pd.DataFrame(ledger_rows)
    trade_frame = pd.DataFrame(trades)
    b_and_h = data["close"].iloc[-1] / data["open"].iloc[0] - 1.0
    buy_hold_equity = data["close"] / data["open"].iloc[0]
    total_return = ledger["equity"].iloc[-1] / initial_cash - 1.0
    metrics: dict[str, float | int] = {
        "total_return": float(total_return),
        "b_and_h_return": float(b_and_h),
        "b_and_h_max_drawdown": _max_drawdown(buy_hold_equity),
        "excess_return": float(total_return - b_and_h),
        "cagr": _annualized_return(ledger["equity"], ledger["date"]),
        "max_drawdown": _max_drawdown(ledger["equity"]),
        "exposure": float(ledger["exposure"].mean()),
        "trade_count": int(len(trade_frame)),
        "win_rate": float((trade_frame["return"] > 0).mean()) if not trade_frame.empty else 0.0,
        "average_mfe": float(trade_frame["mfe"].mean()) if not trade_frame.empty else 0.0,
        "average_mae": float(trade_frame["mae"].mean()) if not trade_frame.empty else 0.0,
    }
    return BacktestResult(ledger, trade_frame, metrics)


def backtest_universe(
    frame: pd.DataFrame,
    policy: PolicyConfig | None = None,
    initial_cash_per_ticker: float = 100_000.0,
    friction_bps: float = 0.0,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, dict[str, float]]:
    ledgers: list[pd.DataFrame] = []
    trades: list[pd.DataFrame] = []
    metrics: list[dict[str, object]] = []
    for ticker, ticker_frame in frame.groupby("ticker", sort=True):
        result = backtest_ticker(ticker_frame, policy, initial_cash_per_ticker, friction_bps)
        if result.ledger.empty:
            continue
        ledgers.append(result.ledger)
        if not result.trades.empty:
            trades.append(result.trades)
        metrics.append({"ticker": ticker, **result.metrics})
    metric_frame = pd.DataFrame(metrics)
    excess = metric_frame["excess_return"] if not metric_frame.empty else pd.Series(dtype=float)
    winsorized = excess.clip(excess.quantile(0.05), excess.quantile(0.95)) if len(excess) else excess
    all_ledger = pd.concat(ledgers, ignore_index=True) if ledgers else pd.DataFrame()
    if not all_ledger.empty:
        normalized = all_ledger.assign(normalized=all_ledger["equity"] / initial_cash_per_ticker)
        portfolio = normalized.pivot(index="date", columns="ticker", values="normalized").ffill().mean(axis=1)
        equal_weight_return = float(portfolio.iloc[-1] / portfolio.iloc[0] - 1) if len(portfolio) else 0.0
        equal_weight_drawdown = _max_drawdown(portfolio)
    else:
        equal_weight_return = 0.0
        equal_weight_drawdown = 0.0
    positive_gains = metric_frame["excess_return"].clip(lower=0) if not metric_frame.empty else pd.Series(dtype=float)
    largest_gain_share = float(positive_gains.max() / positive_gains.sum()) if positive_gains.sum() > 0 else 1.0
    summary = {
        "ticker_count": float(len(metric_frame)),
        "b_and_h_beat_rate": float((excess > 0).mean()) if len(excess) else 0.0,
        "median_excess_return": float(excess.median()) if len(excess) else 0.0,
        "winsorized_equal_weight_excess": float(winsorized.mean()) if len(winsorized) else 0.0,
        "median_max_drawdown": float(metric_frame["max_drawdown"].median()) if len(metric_frame) else 0.0,
        "median_exposure": float(metric_frame["exposure"].median()) if len(metric_frame) else 0.0,
        "equal_weight_total_return": equal_weight_return,
        "equal_weight_max_drawdown": equal_weight_drawdown,
        "largest_ticker_gain_share": largest_gain_share,
    }
    return (
        all_ledger,
        pd.concat(trades, ignore_index=True) if trades else pd.DataFrame(),
        metric_frame,
        summary,
    )


def calibrate_policy(frame: pd.DataFrame) -> tuple[PolicyConfig, pd.DataFrame]:
    """Two-stage bounded policy search using calibration data only."""
    candidates: list[tuple[float, PolicyConfig, dict[str, float]]] = []
    swings = offline_price_swings(frame)
    evaluated: set[tuple[float, ...]] = set()

    def evaluate(policy: PolicyConfig) -> None:
        key = (
            policy.entry_probability, policy.exit_probability, policy.atr_stop_multiple,
            policy.trailing_atr_multiple, float(policy.maximum_holding_sessions),
            policy.hook_exit_probability, float(policy.maximum_cash_sessions),
            policy.exit_return_ceiling, policy.entry_return_floor,
            policy.minimum_barrier_probability,
        )
        if key in evaluated:
            return
        evaluated.add(key)
        ledger, _, _, summary = backtest_universe(frame, policy)
        swing = swing_capture_metrics(ledger, swings)
        objective = (
            summary["winsorized_equal_weight_excess"]
            + 0.10 * summary["b_and_h_beat_rate"]
            + 0.05 * swing["captured_swing_return_ratio"]
            + 0.20 * summary["equal_weight_max_drawdown"]
        )
        metrics = {**summary, **swing, "objective": float(objective)}
        candidates.append((float(objective), policy, metrics))

    for entry, exit_probability in ((0.55, 0.60), (0.62, 0.68), (0.70, 0.76)):
        for atr_stop, trailing_stop, max_holding in ((2.0, 2.5, 80), (2.5, 3.0, 120), (3.0, 3.5, 120)):
            evaluate(PolicyConfig(
                entry_probability=entry, exit_probability=exit_probability, hysteresis=0.05,
                cooldown_sessions=3, atr_stop_multiple=atr_stop,
                trailing_atr_multiple=trailing_stop, maximum_holding_sessions=max_holding,
                hook_exit_probability=0.50, maximum_cash_sessions=20,
                exit_return_ceiling=0.02, entry_return_floor=-0.02,
                minimum_barrier_probability=0.50,
            ))
    candidates.sort(key=lambda item: item[0], reverse=True)
    coarse_best = candidates[0][1]
    for entry_offset in (-0.04, 0.0, 0.04):
        for exit_offset in (-0.04, 0.0, 0.04):
            evaluate(PolicyConfig(
                entry_probability=float(np.clip(coarse_best.entry_probability + entry_offset, 0.50, 0.85)),
                exit_probability=float(np.clip(coarse_best.exit_probability + exit_offset, 0.50, 0.85)),
                hysteresis=coarse_best.hysteresis,
                cooldown_sessions=coarse_best.cooldown_sessions,
                atr_stop_multiple=coarse_best.atr_stop_multiple,
                trailing_atr_multiple=coarse_best.trailing_atr_multiple,
                maximum_holding_sessions=coarse_best.maximum_holding_sessions,
                hook_exit_probability=coarse_best.hook_exit_probability,
                maximum_cash_sessions=coarse_best.maximum_cash_sessions,
                exit_return_ceiling=coarse_best.exit_return_ceiling,
                entry_return_floor=coarse_best.entry_return_floor,
                minimum_barrier_probability=coarse_best.minimum_barrier_probability,
            ))
    for exit_ceiling, entry_floor, barrier_floor in (
        (0.02, -0.02, 0.50), (0.00, -0.01, 0.50),
        (0.00, 0.00, 0.55), (-0.01, 0.00, 0.60),
    ):
        evaluate(PolicyConfig(
            entry_probability=coarse_best.entry_probability,
            exit_probability=coarse_best.exit_probability,
            hysteresis=coarse_best.hysteresis,
            cooldown_sessions=coarse_best.cooldown_sessions,
            atr_stop_multiple=coarse_best.atr_stop_multiple,
            trailing_atr_multiple=coarse_best.trailing_atr_multiple,
            maximum_holding_sessions=coarse_best.maximum_holding_sessions,
            probability_horizon=coarse_best.probability_horizon,
            hook_exit_probability=coarse_best.hook_exit_probability,
            maximum_cash_sessions=coarse_best.maximum_cash_sessions,
            exit_return_ceiling=exit_ceiling,
            entry_return_floor=entry_floor,
            minimum_barrier_probability=barrier_floor,
        ))
    candidates.sort(key=lambda item: item[0], reverse=True)
    records = [{**candidate.to_dict(), **metrics} for _, candidate, metrics in candidates]
    return candidates[0][1], pd.DataFrame(records)


def offline_price_swings(frame: pd.DataFrame, tolerance_sessions: int = 3) -> pd.DataFrame:
    """Return the same median-move price swings used by the corrected QE target."""
    if {"pivot_confirmation", "confirmed_pivot_index", "confirmed_pivot_type"}.issubset(frame.columns):
        events = pivot_event_table(frame)
        if events.empty:
            return events
        events = events.rename(columns={"price_return": "swing_return"})
        events["tolerance_sessions"] = tolerance_sessions
        return events
    rows: list[dict[str, object]] = []
    for ticker, group in frame.sort_values("date").groupby("ticker"):
        prices = group["close"].to_numpy(dtype=float)
        atr = group["atr14"].bfill().fillna(0).to_numpy(dtype=float)
        dates = pd.to_datetime(group["date"]).to_numpy()
        if len(prices) < 2:
            continue
        pivot = 0
        direction = 0
        extreme = 0
        for index in range(1, len(prices)):
            threshold = max(0.05, 2 * atr[index] / prices[index] if prices[index] else 0.05)
            if direction >= 0:
                if prices[index] >= prices[extreme]:
                    extreme = index
                elif prices[index] / prices[extreme] - 1 <= -threshold:
                    if direction == 1:
                        rows.append({"ticker": ticker, "start_date": dates[pivot], "end_date": dates[extreme],
                                     "direction": 1, "swing_return": prices[extreme] / prices[pivot] - 1,
                                     "tolerance_sessions": tolerance_sessions})
                    pivot = extreme
                    extreme = index
                    direction = -1
            if direction <= 0:
                if prices[index] <= prices[extreme]:
                    extreme = index
                elif prices[index] / prices[extreme] - 1 >= threshold:
                    if direction == -1:
                        rows.append({"ticker": ticker, "start_date": dates[pivot], "end_date": dates[extreme],
                                     "direction": -1, "swing_return": prices[extreme] / prices[pivot] - 1,
                                     "tolerance_sessions": tolerance_sessions})
                    pivot = extreme
                    extreme = index
                    direction = 1
    return pd.DataFrame(rows)


def swing_capture_metrics(ledger: pd.DataFrame, swings: pd.DataFrame) -> dict[str, float]:
    """Measure long exposure captured during offline up-swings and avoided during down-swings."""
    if ledger.empty or swings.empty:
        return {"captured_swing_return_ratio": 0.0, "swing_timing_accuracy": 0.0}
    captured = 0.0
    available = 0.0
    timed = 0
    for swing in swings.itertuples(index=False):
        segment = ledger[(ledger["ticker"] == swing.ticker) &
                         (ledger["date"] >= pd.Timestamp(swing.start_date)) &
                         (ledger["date"] <= pd.Timestamp(swing.end_date))]
        if segment.empty:
            continue
        desirable = segment["exposure"].mean() if swing.direction > 0 else 1.0 - segment["exposure"].mean()
        magnitude = abs(float(swing.swing_return))
        captured += magnitude * float(desirable)
        available += magnitude
        timed += int(desirable >= 0.5)
    return {
        "captured_swing_return_ratio": captured / available if available else 0.0,
        "swing_timing_accuracy": timed / len(swings) if len(swings) else 0.0,
    }
