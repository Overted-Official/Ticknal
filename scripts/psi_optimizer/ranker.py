"""Ranking and candidate selection for Walk-Forward optimization strictly by ROI Margin."""

from __future__ import annotations
import numpy as np
from typing import Optional

from .config import (
    DEFAULT_TOP_K,
    DEFAULT_MIN_TRAIN_TRADES,
)


def rank_train_combinations(
    results: np.ndarray,
    min_trades: int = DEFAULT_MIN_TRAIN_TRADES,
    top_k: int = DEFAULT_TOP_K,
) -> np.ndarray:
    """Filters and ranks in-sample train combinations by highest ROI Margin (Strategy ROI - B&H ROI).
    
    Returns array of top_k results sorted by In-Sample ROI Margin descending.
    Each row is the 16-element metric vector plus ROI Margin appended as col 16.
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

    # col 7 is ROI Margin (sys_roi - bh_roi)
    # col 9 is Win Rate
    # col 5 is Sys ROI
    roi_margin = valid_results[:, 7]

    # Attach ROI margin as 17th column (score)
    augmented = np.hstack((valid_results, roi_margin.reshape(-1, 1)))

    # Sort descending by ROI Margin, then Win Rate, then Sys ROI
    sort_keys = np.lexsort((augmented[:, 5], augmented[:, 9], augmented[:, 7]))
    sorted_candidates = augmented[sort_keys[::-1]]

    return sorted_candidates[:top_k]


def select_best_oos_combination(
    top_candidates_train: np.ndarray,  # shape (K, 17)
    test_results: np.ndarray,          # shape (K, 16)
) -> int:
    """Selects winning candidate with positive out-of-sample alpha (ROI Margin > 0).
    
    Rule:
    1. Positive Alpha Candidates: Traded in OOS (trades > 0) AND achieved POSITIVE ROI Margin (col 7 > 0).
       Select the candidate with the HIGHEST positive OOS ROI Margin (tie-breaker: win rate, then in-sample margin).
    2. Fallback: If NO candidate achieved positive alpha in OOS (or no OOS trades triggered), fallback to
       the #1 In-Sample candidate (index 0), preserving the proven long-term historical alpha edge.
    """
    k = len(top_candidates_train)
    if k == 0 or len(test_results) == 0:
        return -1

    # Filter candidates with trades > 0 AND positive ROI margin (> 0)
    positive_alpha_indices = [
        i for i in range(k)
        if test_results[i, 8] > 0 and test_results[i, 7] > 0
    ]

    if not positive_alpha_indices:
        # Fallback to #1 Train candidate (which has highest long-term historical alpha)
        return 0

    best_idx = positive_alpha_indices[0]
    best_margin = test_results[best_idx, 7]
    best_wr = test_results[best_idx, 9]
    best_train_margin = top_candidates_train[best_idx, 7]

    for idx in positive_alpha_indices[1:]:
        margin = test_results[idx, 7]
        wr = test_results[idx, 9]
        train_margin = top_candidates_train[idx, 7]

        if (
            (margin > best_margin)
            or (margin == best_margin and wr > best_wr)
            or (margin == best_margin and wr == best_wr and train_margin > best_train_margin)
        ):
            best_idx = idx
            best_margin = margin
            best_wr = wr
            best_train_margin = train_margin

    return best_idx

