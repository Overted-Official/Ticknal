"""Multi-objective ranking and candidate selection for Walk-Forward optimization."""

from __future__ import annotations
import numpy as np
from scipy.stats import rankdata
from typing import Tuple, Optional

from .config import (
    WEIGHT_ROI_MARGIN,
    WEIGHT_WIN_RATE,
    WEIGHT_AVG_BARS,
    WEIGHT_DRAWDOWN,
    DEFAULT_TOP_K,
    DEFAULT_MIN_TRAIN_TRADES,
)


def rank_train_combinations(
    results: np.ndarray,
    min_trades: int = DEFAULT_MIN_TRAIN_TRADES,
    top_k: int = DEFAULT_TOP_K,
) -> np.ndarray:
    """Filters and ranks in-sample train combinations using multi-objective scoring.
    
    Returns array of top_k results sorted by Composite Score descending.
    Each row is the 16-element metric vector plus composite score appended as col 16.
    """
    if len(results) == 0:
        return np.empty((0, 17), dtype=np.float64)

    # 1. Filter by minimum trades
    valid_mask = results[:, 8] >= min_trades
    valid_results = results[valid_mask]

    # Fallback to at least 1 trade if min_trades filter yielded nothing
    if len(valid_results) == 0:
        valid_mask = results[:, 8] >= 1
        valid_results = results[valid_mask]

    if len(valid_results) == 0:
        return np.empty((0, 17), dtype=np.float64)

    # 2. Extract key metrics:
    # col 7: ROI Margin
    # col 9: Win Rate
    # col 15: Avg Bars / Trade (lower is better)
    # col 10: Max Drawdown (lower is better)
    margin = valid_results[:, 7]
    win_rate = valid_results[:, 9]
    avg_bars = valid_results[:, 15]
    drawdown = valid_results[:, 10]

    n = len(valid_results)
    if n == 1:
        composite = np.array([1.0], dtype=np.float64)
    else:
        rank_margin = (rankdata(margin) - 1.0) / (n - 1.0)
        rank_win_rate = (rankdata(win_rate) - 1.0) / (n - 1.0)
        rank_bars = 1.0 - ((rankdata(avg_bars) - 1.0) / (n - 1.0))
        rank_dd = 1.0 - ((rankdata(drawdown) - 1.0) / (n - 1.0))

        composite = (
            WEIGHT_ROI_MARGIN * rank_margin
            + WEIGHT_WIN_RATE * rank_win_rate
            + WEIGHT_AVG_BARS * rank_bars
            + WEIGHT_DRAWDOWN * rank_dd
        )

    # Attach composite score as 17th column
    augmented = np.hstack((valid_results, composite.reshape(-1, 1)))

    # Sort descending by composite score, then by ROI Margin as tiebreaker
    sort_keys = np.lexsort((augmented[:, 7], augmented[:, 16]))
    sorted_candidates = augmented[sort_keys[::-1]]

    return sorted_candidates[:top_k]


def select_best_oos_combination(
    top_candidates_train: np.ndarray,  # shape (K, 17)
    test_results: np.ndarray,          # shape (K, 16)
    target_win_rate: float = 90.0,
) -> int:
    """Selects the single winning candidate index based on out-of-sample (2025-2026) test performance.
    
    Tiered Selection Rule:
    - Tier 1: Candidates with Test Trades > 0 and Test Win Rate >= target_win_rate (90.0%).
              Selected by HIGHEST Out-of-Sample ROI Margin.
    - Tier 2: If no candidate achieves >= target_win_rate, select candidate with HIGHEST
              available Test Win Rate (e.g. 75-88.9%), and among those HIGHEST ROI Margin.
    - Tier 3: If 0 Test Trades triggered (illiquid in 2025-2026), fallback to #1 In-Sample candidate.
    """
    k = len(top_candidates_train)
    if k == 0 or len(test_results) == 0:
        return -1

    # Candidates with trades in OOS test period
    traded_indices = [i for i in range(k) if test_results[i, 8] > 0]

    if not traded_indices:
        # Tier 3: Fallback to #1 Train candidate if no test trades triggered
        return 0

    # Tier 1: Candidates with OOS Win Rate >= target_win_rate (90.0%)
    tier1_indices = [i for i in traded_indices if test_results[i, 9] >= target_win_rate]

    if tier1_indices:
        # Pick candidate with Highest Out-of-Sample ROI Margin (test_results col 7)
        # Tiebreaker: Highest Train Composite Score (top_candidates_train col 16)
        best_idx = tier1_indices[0]
        best_margin = test_results[best_idx, 7]
        best_train_score = top_candidates_train[best_idx, 16]

        for idx in tier1_indices[1:]:
            margin = test_results[idx, 7]
            train_score = top_candidates_train[idx, 16]
            if (margin > best_margin) or (margin == best_margin and train_score > best_train_score):
                best_idx = idx
                best_margin = margin
                best_train_score = train_score

        return best_idx

    # Tier 2: No candidate reached 90% Win Rate -> Rank by Highest Win Rate, then Highest ROI Margin
    best_idx = traded_indices[0]
    best_wr = test_results[best_idx, 9]
    best_margin = test_results[best_idx, 7]
    best_train_score = top_candidates_train[best_idx, 16]

    for idx in traded_indices[1:]:
        wr = test_results[idx, 9]
        margin = test_results[idx, 7]
        train_score = top_candidates_train[idx, 16]

        if (wr > best_wr) or (wr == best_wr and margin > best_margin) or (wr == best_wr and margin == best_margin and train_score > best_train_score):
            best_idx = idx
            best_wr = wr
            best_margin = margin
            best_train_score = train_score

    return best_idx
