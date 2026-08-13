"""Causal price-swing state and offline pivot labels for Quantum Exhaustion v2.1.

Price defines the pivots. PSI is sampled at those price pivots and measures how
far the current price leg has progressed relative to completed historical legs.
"""

from __future__ import annotations

import bisect
from collections import defaultdict
from dataclasses import dataclass

import numpy as np
import pandas as pd

from .config import QEConfig


@dataclass(frozen=True)
class PricePivot:
    pivot_index: int
    confirmation_index: int
    pivot_type: str
    price: float
    psi40: float
    threshold: float


def trailing_median_daily_move(close: pd.Series, config: QEConfig) -> pd.Series:
    """Median absolute close-to-close move known before the current close."""
    returns = close.astype(float).pct_change(fill_method=None).abs()
    median = returns.shift(1).rolling(
        config.swing_median_window,
        min_periods=config.swing_median_min_periods,
    ).median()
    return median.clip(lower=config.swing_threshold_floor)


def detect_price_pivots(frame: pd.DataFrame, config: QEConfig) -> list[PricePivot]:
    """Detect alternating close-price pivots and retain their confirmation dates.

    The extremum is an offline label. It becomes observable to live features only
    on ``confirmation_index``, after price reverses by the median-move threshold.
    """
    data = frame.sort_values("date").reset_index(drop=True)
    prices = data["close"].to_numpy(dtype=float)
    psi = data["psi40"].to_numpy(dtype=float)
    median_move = data["median_daily_move"].to_numpy(dtype=float)
    if len(data) < 2:
        return []

    valid = np.flatnonzero(np.isfinite(prices) & np.isfinite(median_move))
    if not valid.size:
        return []
    start = int(valid[0])
    high_index = low_index = start
    extreme_index = start
    direction = 0  # +1 means a confirmed bottom exists; seek a top. -1 is inverse.
    pivots: list[PricePivot] = []

    def threshold(index: int) -> float:
        return max(
            config.swing_threshold_floor,
            config.swing_threshold_multiplier * float(median_move[index]),
        )

    def append(pivot_index: int, confirmation_index: int, pivot_type: str) -> None:
        pivots.append(PricePivot(
            pivot_index=pivot_index,
            confirmation_index=confirmation_index,
            pivot_type=pivot_type,
            price=float(prices[pivot_index]),
            psi40=float(psi[pivot_index]),
            threshold=threshold(pivot_index),
        ))

    for index in range(start + 1, len(data)):
        price = prices[index]
        if not np.isfinite(price):
            continue
        if direction == 0:
            if price >= prices[high_index]:
                high_index = index
            if price <= prices[low_index]:
                low_index = index
            if price >= prices[low_index] * (1.0 + threshold(low_index)):
                append(low_index, index, "bottom")
                direction = 1
                extreme_index = index
            elif price <= prices[high_index] * (1.0 - threshold(high_index)):
                append(high_index, index, "top")
                direction = -1
                extreme_index = index
            continue

        if direction > 0:
            if price >= prices[extreme_index]:
                extreme_index = index
            elif price <= prices[extreme_index] * (1.0 - threshold(extreme_index)):
                append(extreme_index, index, "top")
                direction = -1
                extreme_index = index
        else:
            if price <= prices[extreme_index]:
                extreme_index = index
            elif price >= prices[extreme_index] * (1.0 + threshold(extreme_index)):
                append(extreme_index, index, "bottom")
                direction = 1
                extreme_index = index
    return pivots


def causal_price_swing_features(frame: pd.DataFrame, config: QEConfig) -> pd.DataFrame:
    """Replay confirmed price pivots without backfilling the extremum date."""
    data = frame.sort_values("date").reset_index(drop=True)
    pivots = detect_price_pivots(data, config)
    by_confirmation: dict[int, list[PricePivot]] = defaultdict(list)
    for pivot in pivots:
        by_confirmation[pivot.confirmation_index].append(pivot)

    n = len(data)
    direction = np.zeros(n, dtype=np.int8)
    age = np.zeros(n, dtype=np.int32)
    psi_anchor = np.full(n, np.nan, dtype=np.float32)
    psi_delta = np.zeros(n, dtype=np.float32)
    price_return = np.zeros(n, dtype=np.float32)
    price_multiple = np.zeros(n, dtype=np.float32)
    confirmation = np.zeros(n, dtype=np.int8)
    confirmed_pivot_index = np.full(n, -1, dtype=np.int32)
    confirmed_pivot_type = np.zeros(n, dtype=np.int8)
    completed_direction = np.zeros(n, dtype=np.int8)
    completed_delta = np.full(n, np.nan, dtype=np.float32)

    prices = data["close"].to_numpy(dtype=float)
    psi = data["psi40"].to_numpy(dtype=float)
    medians = data["median_daily_move"].to_numpy(dtype=float)
    current_pivot: PricePivot | None = None
    previous_pivot: PricePivot | None = None
    current_direction = 0

    for index in range(n):
        for pivot in by_confirmation.get(index, []):
            if previous_pivot is not None and previous_pivot.pivot_type != pivot.pivot_type:
                if pivot.pivot_type == "top":
                    delta = pivot.psi40 - previous_pivot.psi40
                    leg_direction = 1
                else:
                    delta = previous_pivot.psi40 - pivot.psi40
                    leg_direction = -1
                completed_direction[index] = leg_direction
                completed_delta[index] = float(delta)
            previous_pivot = pivot
            current_pivot = pivot
            current_direction = 1 if pivot.pivot_type == "bottom" else -1
            confirmation[index] = 1
            confirmed_pivot_index[index] = pivot.pivot_index
            confirmed_pivot_type[index] = -1 if pivot.pivot_type == "bottom" else 1

        direction[index] = current_direction
        if current_pivot is None or current_direction == 0:
            continue
        age[index] = max(0, index - current_pivot.pivot_index)
        psi_anchor[index] = current_pivot.psi40
        if current_direction > 0:
            psi_delta[index] = float(psi[index] - current_pivot.psi40)
            price_return[index] = float(prices[index] / current_pivot.price - 1.0)
        else:
            psi_delta[index] = float(current_pivot.psi40 - psi[index])
            price_return[index] = float(current_pivot.price / prices[index] - 1.0)
        if np.isfinite(medians[index]) and medians[index] > 0:
            price_multiple[index] = price_return[index] / float(medians[index])

    return pd.DataFrame({
        "psi_direction": direction,
        "leg_age": age,
        "running_delta": psi_delta,
        "psi_at_last_pivot": psi_anchor,
        "price_swing_return": price_return,
        "price_swing_median_multiple": price_multiple,
        "pivot_confirmation": confirmation,
        "confirmed_pivot_index": confirmed_pivot_index,
        "confirmed_pivot_type": confirmed_pivot_type,
        "completed_swing_direction": completed_direction,
        "completed_psi_delta": completed_delta,
    }, index=frame.sort_values("date").index)


def _ecdf(history: list[float], value: float) -> float:
    if not history or not np.isfinite(value):
        return 0.5
    return bisect.bisect_right(history, float(value)) / len(history)


def add_hierarchical_exhaustion(frame: pd.DataFrame, config: QEConfig) -> pd.DataFrame:
    """Add CDF percentiles using only events confirmed before each session.

    Ticker CDFs shrink toward sector CDFs, which shrink toward the all-EGX CDF.
    Events confirmed on the same close are inserted only after that date is scored.
    """
    data = frame.copy()
    n = len(data)
    percentile_output = np.full(n, 50.0, dtype=np.float32)
    ticker_count_output = np.zeros(n, dtype=np.float32)
    sector_count_output = np.zeros(n, dtype=np.float32)
    market_count_output = np.zeros(n, dtype=np.float32)
    ticker_history: dict[tuple[str, int], list[float]] = defaultdict(list)
    sector_history: dict[tuple[str, int], list[float]] = defaultdict(list)
    market_history: dict[int, list[float]] = defaultdict(list)

    tickers = data["ticker"].astype(str).to_numpy()
    sectors = data["sector"].astype(str).to_numpy()
    directions = data["psi_direction"].to_numpy(dtype=np.int8)
    running_deltas = data["running_delta"].to_numpy(dtype=float)
    completed_directions = data["completed_swing_direction"].to_numpy(dtype=np.int8)
    completed_deltas = data["completed_psi_delta"].to_numpy(dtype=float)
    dates = pd.to_datetime(data["date"]).to_numpy()
    ordered = np.lexsort((tickers, dates))
    ordered_dates = dates[ordered]
    boundaries = np.flatnonzero(np.r_[True, ordered_dates[1:] != ordered_dates[:-1], True])
    for start, stop in zip(boundaries[:-1], boundaries[1:]):
        positions = ordered[start:stop]
        for position in positions:
            direction = int(directions[position])
            if direction == 0:
                continue
            ticker_key = (tickers[position], direction)
            sector_key = (sectors[position], direction)
            ticker_values = ticker_history[ticker_key]
            sector_values = sector_history[sector_key]
            market_values = market_history[direction]
            value = running_deltas[position]
            market_percentile = _ecdf(market_values, value)
            sector_percentile = _ecdf(sector_values, value)
            ticker_percentile = _ecdf(ticker_values, value)
            sector_denominator = len(sector_values) + config.cdf_sector_prior
            ticker_denominator = len(ticker_values) + config.cdf_ticker_prior
            sector_weight = len(sector_values) / sector_denominator if sector_denominator else 0.0
            ticker_weight = len(ticker_values) / ticker_denominator if ticker_denominator else 0.0
            sector_blend = sector_weight * sector_percentile + (1.0 - sector_weight) * market_percentile
            percentile = ticker_weight * ticker_percentile + (1.0 - ticker_weight) * sector_blend
            percentile_output[position] = 100.0 * percentile
            ticker_count_output[position] = len(ticker_values)
            sector_count_output[position] = len(sector_values)
            market_count_output[position] = len(market_values)

        for position in positions:
            direction = int(completed_directions[position])
            delta = completed_deltas[position]
            if direction == 0 or not np.isfinite(delta):
                continue
            bisect.insort(ticker_history[(tickers[position], direction)], delta)
            bisect.insort(sector_history[(sectors[position], direction)], delta)
            bisect.insort(market_history[direction], delta)
    data["exhaustion_percentile"] = percentile_output
    data["cdf_ticker_count"] = ticker_count_output
    data["cdf_sector_count"] = sector_count_output
    data["cdf_market_count"] = market_count_output
    return data


def pivot_event_table(frame: pd.DataFrame) -> pd.DataFrame:
    """Materialize confirmed historical price swings for audit and research."""
    rows: list[dict[str, object]] = []
    for ticker, group in frame.sort_values("date").groupby("ticker", sort=True):
        ordered = group.reset_index(drop=True)
        ordered["_local_position"] = np.arange(len(ordered), dtype=np.int32)
        confirmations = ordered[ordered["pivot_confirmation"] == 1]
        records = confirmations.to_dict(orient="records")
        previous: dict[str, object] | None = None
        for row in records:
            if previous is not None and int(previous["confirmed_pivot_type"]) != int(row["confirmed_pivot_type"]):
                direction = 1 if int(row["confirmed_pivot_type"]) > 0 else -1
                start_index = int(previous["_local_position"]) - int(previous["leg_age"])
                end_index = int(row["_local_position"]) - int(row["leg_age"])
                if start_index < 0 or end_index < 0 or start_index >= len(ordered) or end_index >= len(ordered):
                    previous = row
                    continue
                start = ordered.iloc[start_index]
                end = ordered.iloc[end_index]
                rows.append({
                    "ticker": ticker,
                    "sector": row["sector"],
                    "direction": direction,
                    "start_date": start["date"],
                    "end_date": end["date"],
                    "confirmation_date": row["date"],
                    "start_price": float(start["close"]),
                    "end_price": float(end["close"]),
                    "start_psi40": float(start["psi40"]),
                    "end_psi40": float(end["psi40"]),
                    "psi_delta": float(row["completed_psi_delta"]),
                    "price_return": float(end["close"] / start["close"] - 1.0),
                })
            previous = row
    return pd.DataFrame(rows)
