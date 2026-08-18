"""Main Walk-Forward Optimization Pipeline orchestrator."""

from __future__ import annotations
import csv
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Set, Any
import numba as nb
import numpy as np
import pandas as pd

from .config import (
    ENTRY_LEVELS,
    AYM_LIMITS,
    AYM_MULTIPLIERS,
    ATR_DISTANCES,
    STOPLOSS_LEVELS,
    DEFAULT_TRAIN_START,
    DEFAULT_TRAIN_END,
    DEFAULT_TEST_START,
    DEFAULT_TEST_END,
    DEFAULT_TOP_K,
    DEFAULT_MIN_TRAIN_TRADES,
    DEFAULT_OUTPUT_DIR,
    RESULT_HEADERS,
)
from .data_loader import get_available_tickers, load_ticker_data
from .indicators import compute_ticker_indicators
from .backtest_core import (
    backtest_full_grid_numba,
    backtest_candidate_list_numba,
    format_result_row,
)
from .ranker import rank_train_combinations, select_best_oos_combination


CANDIDATE_AUDIT_HEADERS = [
    "ticker_id",
    "candidate_rank",
    "level_mask",
    "L-14.6",
    "L-23.6",
    "L-38.2",
    "L-50.0",
    "L-61.8",
    "Use AYM",
    "AYM TP Multiplier",
    "AYM Limit",
    "Use ATR",
    "ATR Distance",
    "Use Stoploss",
    "Stoploss Level",
    "Train Sys ROI",
    "Train B&H ROI",
    "Train ROI Margin",
    "Train # Trades",
    "Train Win Rate",
    "Train Max Drawdown",
    "Train Avg Bars",
    "Train Composite Score",
    "Test Sys ROI",
    "Test B&H ROI",
    "Test ROI Margin",
    "Test # Trades",
    "Test Win Rate",
    "Test Max Drawdown",
    "Test Avg Bars",
    "Is Final Winner",
]

WINNING_SUMMARY_HEADERS = [
    "ticker_id",
    "level_mask",
    "L-14.6",
    "L-23.6",
    "L-38.2",
    "L-50.0",
    "L-61.8",
    "Use AYM",
    "AYM TP Multiplier",
    "AYM Limit",
    "Use ATR",
    "ATR Distance",
    "Use Stoploss",
    "Stoploss Level",
    "Train Period",
    "Train Bars",
    "Train Sys ROI (%)",
    "Train B&H ROI (%)",
    "Train ROI Margin (%)",
    "Train Trades",
    "Train Win Rate (%)",
    "Train Max DD (%)",
    "Train Avg Bars/Trade",
    "Test Period",
    "Test Bars",
    "Test Sys ROI (%)",
    "Test B&H ROI (%)",
    "Test ROI Margin (%)",
    "Test Trades",
    "Test Win Rate (%)",
    "Test Max DD (%)",
    "Test Avg Bars/Trade",
]


def run_walkforward_pipeline(
    tickers_filter: Optional[List[str]] = None,
    train_start: str = DEFAULT_TRAIN_START,
    train_end: str = DEFAULT_TRAIN_END,
    test_start: str = DEFAULT_TEST_START,
    test_end: str = DEFAULT_TEST_END,
    top_k: int = DEFAULT_TOP_K,
    min_trades: int = DEFAULT_MIN_TRAIN_TRADES,
    threads: Optional[int] = None,
    output_dir: Path = DEFAULT_OUTPUT_DIR,
) -> Dict[str, Any]:
    """Executes the complete Walk-Forward In-Sample Training + Out-of-Sample Testing across tickers."""
    start_time = time.time()
    if threads is not None and threads > 0:
        nb.set_num_threads(threads)

    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = output_dir / f"run_{timestamp_str}"
    run_dir.mkdir(parents=True, exist_ok=True)

    # 1. Discover all tickers
    available_tickers = get_available_tickers()
    if not available_tickers:
        raise RuntimeError("No ticker data found in dataset directories.")

    if tickers_filter:
        target_symbols = [s.strip().upper().replace(".CA", "") for s in tickers_filter if s.strip()]
        selected_tickers = {k: v for k, v in available_tickers.items() if k in target_symbols}
    else:
        selected_tickers = available_tickers

    print("=" * 80)
    print(" 🚀 PSI STRATEGY WALK-FORWARD OPTIMIZATION & VALIDATION PIPELINE")
    print("=" * 80)
    print(f" Target Universe:          {len(selected_tickers)} tickers (EGX + Gold + Silver)")
    print(f" In-Sample Training Slice: {train_start} to {train_end}")
    print(f" Out-of-Sample Test Slice: {test_start} to {test_end}")
    print(f" Search Space:             50,220 combinations per ticker")
    print(f" Top Candidates (Top-K):   {top_k}")
    print(f" Output Audit Folder:      {run_dir}")
    print("=" * 80)

    # Prepare Grid parameter vectors
    level_masks = np.arange(1, 32, dtype=np.int64)
    aym_pairs = [(float(val), float(lim)) for val in AYM_MULTIPLIERS for lim in AYM_LIMITS] + [(np.nan, np.nan)]
    aym_values = np.array([pair[0] for pair in aym_pairs], dtype=np.float64)
    aym_limits = np.array([pair[1] for pair in aym_pairs], dtype=np.float64)
    atr_values = np.array(ATR_DISTANCES, dtype=np.float64)
    stoploss_values = np.array(STOPLOSS_LEVELS, dtype=np.float64)

    # Result containers
    all_winning_param_rows: List[List[str]] = []
    all_winning_summary_rows: List[List[str]] = []
    all_candidate_audit_rows: List[List[str]] = []

    successful_tickers = 0
    skipped_tickers = 0

    ticker_list = sorted(selected_tickers.keys())

    for idx, ticker in enumerate(ticker_list, start=1):
        ticker_start = time.time()
        ticker_source = selected_tickers[ticker]

        df = load_ticker_data(ticker, ticker_source)
        if df is None:
            print(f"[{idx:03d}/{len(ticker_list):03d}] {ticker:<8} | Skipped: insufficient raw data")
            skipped_tickers += 1
            continue

        prepared = compute_ticker_indicators(df, train_start, train_end, test_start, test_end)
        if prepared is None or prepared.get("train") is None:
            print(f"[{idx:03d}/{len(ticker_list):03d}] {ticker:<8} | Skipped: insufficient training window bars")
            skipped_tickers += 1
            continue

        train_arr = prepared["train"]
        test_arr = prepared.get("test")

        # 1. Run In-Sample Grid Search (50,220 combinations)
        train_results = backtest_full_grid_numba(
            train_arr["master_index"],
            train_arr["master_index_adjusted"],
            train_arr["close"],
            train_arr["high"],
            train_arr["low"],
            train_arr["median_daily_move"],
            train_arr["atr"],
            level_masks,
            aym_values,
            aym_limits,
            atr_values,
            stoploss_values,
            train_arr["years"],
            close_open_at_end=True,
        )

        # 2. Filter and rank Top-K candidates on Train data
        top_candidates = rank_train_combinations(train_results, min_trades=min_trades, top_k=top_k)
        if len(top_candidates) == 0:
            print(f"[{idx:03d}/{len(ticker_list):03d}] {ticker:<8} | Skipped: 0 valid trades across all combinations")
            skipped_tickers += 1
            continue

        # 3. Out-of-Sample Test Evaluation on 2025-2026 data
        candidates_params = top_candidates[:, :5]  # shape (K, 5): [level_mask, aym, aym_limit, atr_distance, stoploss]
        has_test = test_arr is not None and test_arr["bars_count"] >= 2

        if has_test:
            test_results = backtest_candidate_list_numba(
                test_arr["master_index"],
                test_arr["master_index_adjusted"],
                test_arr["close"],
                test_arr["high"],
                test_arr["low"],
                test_arr["median_daily_move"],
                test_arr["atr"],
                candidates_params,
                test_arr["years"],
                close_open_at_end=True,
            )
            best_cand_idx = select_best_oos_combination(top_candidates, test_results)
        else:
            test_results = np.full((len(top_candidates), 16), np.nan)
            best_cand_idx = 0

        winner_train = top_candidates[best_cand_idx]
        winner_test = test_results[best_cand_idx] if has_test else np.full(16, np.nan)

        # 4. Format deployable winning parameters row (standard format)
        param_row = format_result_row(ticker, winner_train[:16])
        all_winning_param_rows.append(param_row)

        # 5. Format candidate audit rows (all Top-K)
        for c_idx in range(len(top_candidates)):
            cand_tr = top_candidates[c_idx]
            cand_te = test_results[c_idx]
            is_winner = (c_idx == best_cand_idx)

            mask = int(cand_tr[0])
            levels_enabled = [(mask & (1 << bit)) != 0 for bit in range(5)]

            audit_row = [
                ticker,
                str(c_idx + 1),
                str(mask),
                *["TRUE" if e else "FALSE" for e in levels_enabled],
                "TRUE" if not np.isnan(cand_tr[1]) else "FALSE",
                f"{cand_tr[1]:.1f}" if not np.isnan(cand_tr[1]) else "null",
                f"{cand_tr[2]:.1f}" if not np.isnan(cand_tr[2]) else "null",
                "TRUE" if not np.isnan(cand_tr[3]) else "FALSE",
                f"{cand_tr[3]:.1f}" if not np.isnan(cand_tr[3]) else "null",
                "TRUE" if not np.isnan(cand_tr[4]) else "FALSE",
                f"{cand_tr[4]:.1f}" if not np.isnan(cand_tr[4]) else "null",
                f"{cand_tr[5]:.2f}",
                f"{cand_tr[6]:.2f}",
                f"{cand_tr[7]:.2f}",
                str(int(cand_tr[8])),
                f"{cand_tr[9]:.2f}",
                f"{cand_tr[10]:.2f}",
                f"{cand_tr[15]:.1f}",
                f"{cand_tr[16]:.4f}",
                f"{cand_te[5]:.2f}" if not np.isnan(cand_te[5]) else "N/A",
                f"{cand_te[6]:.2f}" if not np.isnan(cand_te[6]) else "N/A",
                f"{cand_te[7]:.2f}" if not np.isnan(cand_te[7]) else "N/A",
                str(int(cand_te[8])) if not np.isnan(cand_te[8]) else "0",
                f"{cand_te[9]:.2f}" if not np.isnan(cand_te[9]) else "N/A",
                f"{cand_te[10]:.2f}" if not np.isnan(cand_te[10]) else "N/A",
                f"{cand_te[15]:.1f}" if not np.isnan(cand_te[15]) else "N/A",
                "YES" if is_winner else "NO",
            ]
            all_candidate_audit_rows.append(audit_row)

        # 6. Format winning summary row
        w_mask = int(winner_train[0])
        w_levels_enabled = [(w_mask & (1 << bit)) != 0 for bit in range(5)]

        summary_row = [
            ticker,
            str(w_mask),
            *["TRUE" if e else "FALSE" for e in w_levels_enabled],
            "TRUE" if not np.isnan(winner_train[1]) else "FALSE",
            f"{winner_train[1]:.1f}" if not np.isnan(winner_train[1]) else "null",
            f"{winner_train[2]:.1f}" if not np.isnan(winner_train[2]) else "null",
            "TRUE" if not np.isnan(winner_train[3]) else "FALSE",
            f"{winner_train[3]:.1f}" if not np.isnan(winner_train[3]) else "null",
            "TRUE" if not np.isnan(winner_train[4]) else "FALSE",
            f"{winner_train[4]:.1f}" if not np.isnan(winner_train[4]) else "null",
            f"{train_arr['start_date']} to {train_arr['end_date']}",
            str(train_arr['bars_count']),
            f"{winner_train[5]:.2f}",
            f"{winner_train[6]:.2f}",
            f"{winner_train[7]:.2f}",
            str(int(winner_train[8])),
            f"{winner_train[9]:.2f}",
            f"{winner_train[10]:.2f}",
            f"{winner_train[15]:.1f}",
            f"{test_arr['start_date']} to {test_arr['end_date']}" if has_test else "N/A",
            str(test_arr['bars_count']) if has_test else "0",
            f"{winner_test[5]:.2f}" if has_test and not np.isnan(winner_test[5]) else "N/A",
            f"{winner_test[6]:.2f}" if has_test and not np.isnan(winner_test[6]) else "N/A",
            f"{winner_test[7]:.2f}" if has_test and not np.isnan(winner_test[7]) else "N/A",
            str(int(winner_test[8])) if has_test and not np.isnan(winner_test[8]) else "0",
            f"{winner_test[9]:.2f}" if has_test and not np.isnan(winner_test[9]) else "N/A",
            f"{winner_test[10]:.2f}" if has_test and not np.isnan(winner_test[10]) else "N/A",
            f"{winner_test[15]:.1f}" if has_test and not np.isnan(winner_test[15]) else "N/A",
        ]
        all_winning_summary_rows.append(summary_row)

        successful_tickers += 1
        elapsed = time.time() - ticker_start
        test_margin_str = f"{winner_test[7]:+6.2f}%" if has_test and not np.isnan(winner_test[7]) else "  N/A "
        print(
            f"[{idx:03d}/{len(ticker_list):03d}] {ticker:<8} | "
            f"Train Margin: {winner_train[7]:+6.2f}% ({int(winner_train[8]):02d} trades, win: {winner_train[9]:5.1f}%) | "
            f"OOS Margin: {test_margin_str} | "
            f"{elapsed:4.1f}s"
        )

    # 7. Write Output CSVs to timestamped run folder and latest symlink
    csv_candidates_path = run_dir / "candidates_oos_audit.csv"
    csv_winning_summary_path = run_dir / "winning_combinations_summary.csv"
    csv_best_params_path = run_dir / "psi_best_combinations_tested.csv"
    json_metadata_path = run_dir / "run_metadata.json"

    with csv_candidates_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(CANDIDATE_AUDIT_HEADERS)
        writer.writerows(all_candidate_audit_rows)

    with csv_winning_summary_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(WINNING_SUMMARY_HEADERS)
        writer.writerows(all_winning_summary_rows)

    with csv_best_params_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(RESULT_HEADERS)
        writer.writerows(all_winning_param_rows)

    # Also copy latest tested params to output_dir root for easy access
    latest_best_params = output_dir / "latest_psi_best_combinations.csv"
    latest_winning_summary = output_dir / "latest_winning_combinations_summary.csv"
    latest_audit = output_dir / "latest_candidates_oos_audit.csv"

    with latest_best_params.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(RESULT_HEADERS)
        writer.writerows(all_winning_param_rows)

    with latest_winning_summary.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(WINNING_SUMMARY_HEADERS)
        writer.writerows(all_winning_summary_rows)

    with latest_audit.open("w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(CANDIDATE_AUDIT_HEADERS)
        writer.writerows(all_candidate_audit_rows)

    total_duration = time.time() - start_time

    metadata = {
        "timestamp": timestamp_str,
        "train_period": f"{train_start} to {train_end}",
        "test_period": f"{test_start} to {test_end}",
        "total_tickers_requested": len(selected_tickers),
        "successful_tickers": successful_tickers,
        "skipped_tickers": skipped_tickers,
        "combinations_per_ticker": 50220,
        "top_k_candidates": top_k,
        "min_train_trades": min_trades,
        "total_duration_seconds": round(total_duration, 2),
        "output_files": {
            "candidates_audit": str(csv_candidates_path),
            "winning_summary": str(csv_winning_summary_path),
            "best_params_csv": str(csv_best_params_path),
        }
    }

    with json_metadata_path.open("w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print("\n" + "=" * 80)
    print(" ✅ WALK-FORWARD OPTIMIZATION COMPLETED SUCCESSFULLY")
    print("=" * 80)
    print(f" Total Elapsed Time:      {total_duration / 60:.2f} minutes")
    print(f" Processed Tickers:       {successful_tickers} / {len(selected_tickers)}")
    print(f" 1. Candidate Audit Log:  {csv_candidates_path}")
    print(f" 2. Winning Summary:      {csv_winning_summary_path}")
    print(f" 3. Tested Params CSV:    {csv_best_params_path}")
    print(f" 4. Run Metadata JSON:    {json_metadata_path}")
    print("=" * 80)

    return metadata
