"""Numba parallel grid backtesting engine for the PSI strategy."""

from __future__ import annotations
import math
import numba as nb
import numpy as np
from typing import List, Dict, Any, Optional

from .config import (
    ENTRY_LEVELS,
    AYM_LIMITS,
    AYM_MULTIPLIERS,
    ATR_DISTANCES,
    STOPLOSS_LEVELS,
    INITIAL_CAPITAL,
    RESULT_HEADERS,
)


@nb.njit(cache=True, parallel=True)
def backtest_full_grid_numba(
    master_index: np.ndarray,
    master_index_adjusted: np.ndarray,
    close: np.ndarray,
    high: np.ndarray,
    low: np.ndarray,
    median_daily_move: np.ndarray,
    atr: np.ndarray,
    level_masks: np.ndarray,
    aym_values: np.ndarray,
    aym_limits: np.ndarray,
    atr_values: np.ndarray,
    stoploss_values: np.ndarray,
    years: float,
    close_open_at_end: bool = True,
) -> np.ndarray:
    """Evaluates all combinations (31 x 45 x 6 x 6 = 50,220) in parallel using Numba."""
    total = len(level_masks) * len(aym_values) * len(atr_values) * len(stoploss_values)
    results = np.empty((total, 16), dtype=np.float64)
    n = len(close)
    bh_roi = ((close[-1] / close[0]) - 1.0) * 100.0 if n > 1 and close[0] > 0 else 0.0

    for combo_index in nb.prange(total):
        sl_idx = combo_index % len(stoploss_values)
        atr_idx = (combo_index // len(stoploss_values)) % len(atr_values)
        aym_idx = (combo_index // (len(stoploss_values) * len(atr_values))) % len(aym_values)
        mask_idx = combo_index // (len(stoploss_values) * len(atr_values) * len(aym_values))

        level_mask = level_masks[mask_idx]
        aym = aym_values[aym_idx]
        aym_limit = aym_limits[aym_idx]
        atr_distance = atr_values[atr_idx]
        stoploss = stoploss_values[sl_idx]

        balance = INITIAL_CAPITAL
        active = False
        entry_price = 0.0
        target_price = np.nan
        highest_price = 0.0
        lowest_price = 0.0
        trade_count = 0
        win_count = 0
        closed_trades = 0
        active_bars = 0
        return_sum = 0.0
        adverse_sum = 0.0
        favorable_sum = 0.0
        peak_equity = INITIAL_CAPITAL
        max_drawdown = 0.0
        final_equity = INITIAL_CAPITAL

        for i in range(1, n):
            current_master = master_index[i]
            previous_master = master_index[i - 1]

            if not active and not np.isnan(current_master) and not np.isnan(previous_master):
                crossed = False
                for bit in range(5):
                    if (level_mask & (1 << bit)) != 0:
                        level = ENTRY_LEVELS[bit]
                        if current_master > level and previous_master <= level:
                            crossed = True
                            break

                if crossed:
                    shares = math.floor(balance / close[i])
                    if shares > 0:
                        active = True
                        entry_price = close[i]
                        highest_price = high[i]
                        lowest_price = low[i]
                        trade_count += 1
                        target_price = np.nan
                        if not np.isnan(aym) and not np.isnan(median_daily_move[i]):
                            target_price = close[i] * (1.0 + (median_daily_move[i] * aym / 100.0))

            if active:
                active_bars += 1
                if high[i] > highest_price:
                    highest_price = high[i]
                if low[i] < lowest_price:
                    lowest_price = low[i]

                hit_take_profit = (
                    not np.isnan(aym)
                    and not np.isnan(target_price)
                    and not np.isnan(aym_limit)
                    and not np.isnan(master_index_adjusted[i])
                    and close[i] >= target_price
                    and master_index_adjusted[i] < aym_limit
                )
                hit_stoploss = (
                    not np.isnan(stoploss)
                    and not np.isnan(median_daily_move[i])
                    and close[i] <= entry_price * (1.0 - (median_daily_move[i] * stoploss / 100.0))
                )
                hit_trail = (
                    not np.isnan(atr_distance)
                    and not np.isnan(atr[i])
                    and close[i] <= highest_price - (atr[i] * atr_distance)
                    and close[i] > entry_price
                )

                if hit_stoploss or hit_trail or hit_take_profit:
                    shares = math.floor(balance / entry_price)
                    trade_return = ((close[i] - entry_price) / entry_price) * 100.0
                    balance += shares * (close[i] - entry_price)
                    return_sum += trade_return
                    adverse_sum += ((lowest_price - entry_price) / entry_price) * 100.0
                    favorable_sum += ((highest_price - entry_price) / entry_price) * 100.0
                    closed_trades += 1
                    if trade_return > 0.0:
                        win_count += 1
                    active = False

            if active:
                shares = math.floor(balance / entry_price)
                final_equity = shares * close[i] + (balance - shares * entry_price)
            else:
                final_equity = balance
            if final_equity > peak_equity:
                peak_equity = final_equity
            if peak_equity > 0.0:
                drawdown = ((peak_equity - final_equity) / peak_equity) * 100.0
                if drawdown > max_drawdown:
                    max_drawdown = drawdown

        if active and close_open_at_end:
            shares = math.floor(balance / entry_price)
            trade_return = ((close[-1] - entry_price) / entry_price) * 100.0
            balance += shares * (close[-1] - entry_price)
            return_sum += trade_return
            adverse_sum += ((lowest_price - entry_price) / entry_price) * 100.0
            favorable_sum += ((highest_price - entry_price) / entry_price) * 100.0
            closed_trades += 1
            if trade_return > 0.0:
                win_count += 1
            final_equity = balance
            active = False

        sys_roi = ((final_equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100.0
        cagr = ((final_equity / INITIAL_CAPITAL) ** (1.0 / years) - 1.0) * 100.0 if years > 0.0 and final_equity > 0.0 else 0.0

        results[combo_index, 0] = level_mask
        results[combo_index, 1] = aym
        results[combo_index, 2] = aym_limit
        results[combo_index, 3] = atr_distance
        results[combo_index, 4] = stoploss
        results[combo_index, 5] = sys_roi
        results[combo_index, 6] = bh_roi
        results[combo_index, 7] = sys_roi - bh_roi
        results[combo_index, 8] = trade_count
        results[combo_index, 9] = (win_count / trade_count) * 100.0 if trade_count > 0 else 0.0
        results[combo_index, 10] = max_drawdown
        results[combo_index, 11] = adverse_sum / trade_count if trade_count > 0 else 0.0
        results[combo_index, 12] = favorable_sum / trade_count if trade_count > 0 else 0.0
        results[combo_index, 13] = cagr
        results[combo_index, 14] = return_sum / closed_trades if closed_trades > 0 else 0.0
        results[combo_index, 15] = active_bars / trade_count if trade_count > 0 else 0.0

    return results


@nb.njit(cache=True)
def backtest_candidate_list_numba(
    master_index: np.ndarray,
    master_index_adjusted: np.ndarray,
    close: np.ndarray,
    high: np.ndarray,
    low: np.ndarray,
    median_daily_move: np.ndarray,
    atr: np.ndarray,
    candidates: np.ndarray,  # shape (K, 5): [level_mask, aym, aym_limit, atr_distance, stoploss]
    years: float,
    close_open_at_end: bool = True,
) -> np.ndarray:
    """Evaluates a specific list of Top-K candidate combinations on a date array (e.g. Test slice)."""
    k = len(candidates)
    results = np.empty((k, 16), dtype=np.float64)
    n = len(close)
    bh_roi = ((close[-1] / close[0]) - 1.0) * 100.0 if n > 1 and close[0] > 0 else 0.0

    for idx in range(k):
        level_mask = int(candidates[idx, 0])
        aym = candidates[idx, 1]
        aym_limit = candidates[idx, 2]
        atr_distance = candidates[idx, 3]
        stoploss = candidates[idx, 4]

        balance = INITIAL_CAPITAL
        active = False
        entry_price = 0.0
        target_price = np.nan
        highest_price = 0.0
        lowest_price = 0.0
        trade_count = 0
        win_count = 0
        closed_trades = 0
        active_bars = 0
        return_sum = 0.0
        adverse_sum = 0.0
        favorable_sum = 0.0
        peak_equity = INITIAL_CAPITAL
        max_drawdown = 0.0
        final_equity = INITIAL_CAPITAL

        for i in range(1, n):
            current_master = master_index[i]
            previous_master = master_index[i - 1]

            if not active and not np.isnan(current_master) and not np.isnan(previous_master):
                crossed = False
                for bit in range(5):
                    if (level_mask & (1 << bit)) != 0:
                        level = ENTRY_LEVELS[bit]
                        if current_master > level and previous_master <= level:
                            crossed = True
                            break

                if crossed:
                    shares = math.floor(balance / close[i])
                    if shares > 0:
                        active = True
                        entry_price = close[i]
                        highest_price = high[i]
                        lowest_price = low[i]
                        trade_count += 1
                        target_price = np.nan
                        if not np.isnan(aym) and not np.isnan(median_daily_move[i]):
                            target_price = close[i] * (1.0 + (median_daily_move[i] * aym / 100.0))

            if active:
                active_bars += 1
                if high[i] > highest_price:
                    highest_price = high[i]
                if low[i] < lowest_price:
                    lowest_price = low[i]

                hit_take_profit = (
                    not np.isnan(aym)
                    and not np.isnan(target_price)
                    and not np.isnan(aym_limit)
                    and not np.isnan(master_index_adjusted[i])
                    and close[i] >= target_price
                    and master_index_adjusted[i] < aym_limit
                )
                hit_stoploss = (
                    not np.isnan(stoploss)
                    and not np.isnan(median_daily_move[i])
                    and close[i] <= entry_price * (1.0 - (median_daily_move[i] * stoploss / 100.0))
                )
                hit_trail = (
                    not np.isnan(atr_distance)
                    and not np.isnan(atr[i])
                    and close[i] <= highest_price - (atr[i] * atr_distance)
                    and close[i] > entry_price
                )

                if hit_stoploss or hit_trail or hit_take_profit:
                    shares = math.floor(balance / entry_price)
                    trade_return = ((close[i] - entry_price) / entry_price) * 100.0
                    balance += shares * (close[i] - entry_price)
                    return_sum += trade_return
                    adverse_sum += ((lowest_price - entry_price) / entry_price) * 100.0
                    favorable_sum += ((highest_price - entry_price) / entry_price) * 100.0
                    closed_trades += 1
                    if trade_return > 0.0:
                        win_count += 1
                    active = False

            if active:
                shares = math.floor(balance / entry_price)
                final_equity = shares * close[i] + (balance - shares * entry_price)
            else:
                final_equity = balance
            if final_equity > peak_equity:
                peak_equity = final_equity
            if peak_equity > 0.0:
                drawdown = ((peak_equity - final_equity) / peak_equity) * 100.0
                if drawdown > max_drawdown:
                    max_drawdown = drawdown

        if active and close_open_at_end:
            shares = math.floor(balance / entry_price)
            trade_return = ((close[-1] - entry_price) / entry_price) * 100.0
            balance += shares * (close[-1] - entry_price)
            return_sum += trade_return
            adverse_sum += ((lowest_price - entry_price) / entry_price) * 100.0
            favorable_sum += ((highest_price - entry_price) / entry_price) * 100.0
            closed_trades += 1
            if trade_return > 0.0:
                win_count += 1
            final_equity = balance
            active = False

        sys_roi = ((final_equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100.0
        cagr = ((final_equity / INITIAL_CAPITAL) ** (1.0 / years) - 1.0) * 100.0 if years > 0.0 and final_equity > 0.0 else 0.0

        results[idx, 0] = level_mask
        results[idx, 1] = aym
        results[idx, 2] = aym_limit
        results[idx, 3] = atr_distance
        results[idx, 4] = stoploss
        results[idx, 5] = sys_roi
        results[idx, 6] = bh_roi
        results[idx, 7] = sys_roi - bh_roi
        results[idx, 8] = trade_count
        results[idx, 9] = (win_count / trade_count) * 100.0 if trade_count > 0 else 0.0
        results[idx, 10] = max_drawdown
        results[idx, 11] = adverse_sum / trade_count if trade_count > 0 else 0.0
        results[idx, 12] = favorable_sum / trade_count if trade_count > 0 else 0.0
        results[idx, 13] = cagr
        results[idx, 14] = return_sum / closed_trades if closed_trades > 0 else 0.0
        results[idx, 15] = active_bars / trade_count if trade_count > 0 else 0.0

    return results


def format_result_row(ticker: str, result: np.ndarray) -> List[str]:
    level_mask = int(result[0])
    aym = result[1]
    aym_limit = result[2]
    atr_distance = result[3]
    stoploss = result[4]
    levels_enabled = [(level_mask & (1 << bit)) != 0 for bit in range(5)]

    def bool_text(v: bool) -> str:
        return "TRUE" if v else "FALSE"

    def num_or_null(v: float) -> str:
        if np.isnan(v):
            return "null"
        if float(v).is_integer():
            return str(int(v))
        return f"{v:.1f}"

    return [
        ticker,
        "1",
        *[bool_text(enabled) for enabled in levels_enabled],
        *["1" if enabled else "null" for enabled in levels_enabled],
        "FALSE",
        "null",
        bool_text(not np.isnan(aym)),
        num_or_null(aym),
        num_or_null(aym_limit),
        bool_text(not np.isnan(atr_distance)),
        num_or_null(atr_distance),
        bool_text(not np.isnan(stoploss)),
        num_or_null(stoploss),
        f"{result[5]:.2f}",
        f"{result[6]:.2f}",
        f"{result[7]:.2f}",
        str(int(result[8])),
        f"{result[9]:.2f}",
        f"{result[10]:.2f}",
        f"{result[11]:.2f}",
        f"{result[12]:.2f}",
        f"{result[13]:.2f}",
        f"{result[14]:.2f}",
        f"{result[15]:.1f}",
    ]
