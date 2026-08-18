"""CLI entry point to execute the PSI Strategy Walk-Forward Optimizer."""

from __future__ import annotations
import argparse
import sys
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from scripts.psi_optimizer.config import (
    DEFAULT_TRAIN_START,
    DEFAULT_TRAIN_END,
    DEFAULT_TEST_START,
    DEFAULT_TEST_END,
    DEFAULT_TOP_K,
    DEFAULT_MIN_TRAIN_TRADES,
    DEFAULT_OUTPUT_DIR,
)
from scripts.psi_optimizer.pipeline import run_walkforward_pipeline


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run exhaustive PSI Walk-Forward Optimization (Train <= 2024 -> Top-K candidates -> Test 2025-2026)."
    )
    parser.add_argument(
        "--tickers",
        type=str,
        default=None,
        help="Comma-separated ticker symbols to optimize (e.g. COMI,GOLD,SILVER,ADIB). Default runs all available tickers.",
    )
    parser.add_argument(
        "--train-start",
        type=str,
        default=DEFAULT_TRAIN_START,
        help=f"In-sample train start date (YYYY-MM-DD). Default: {DEFAULT_TRAIN_START}",
    )
    parser.add_argument(
        "--train-end",
        type=str,
        default=DEFAULT_TRAIN_END,
        help=f"In-sample train end date (YYYY-MM-DD). Default: {DEFAULT_TRAIN_END}",
    )
    parser.add_argument(
        "--test-start",
        type=str,
        default=DEFAULT_TEST_START,
        help=f"Out-of-sample test start date (YYYY-MM-DD). Default: {DEFAULT_TEST_START}",
    )
    parser.add_argument(
        "--test-end",
        type=str,
        default=DEFAULT_TEST_END,
        help=f"Out-of-sample test end date (YYYY-MM-DD). Default: {DEFAULT_TEST_END}",
    )
    parser.add_argument(
        "--top-k",
        type=int,
        default=DEFAULT_TOP_K,
        help=f"Number of top train combinations to validate in OOS test slice. Default: {DEFAULT_TOP_K}",
    )
    parser.add_argument(
        "--min-trades",
        type=int,
        default=DEFAULT_MIN_TRAIN_TRADES,
        help=f"Minimum in-sample trades required to qualify a combination. Default: {DEFAULT_MIN_TRAIN_TRADES}",
    )
    parser.add_argument(
        "--threads",
        type=int,
        default=None,
        help="Number of Numba CPU worker threads for parallel grid execution. Default is all available cores.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT_DIR,
        help=f"Directory to save output CSV audit and summary files. Default: {DEFAULT_OUTPUT_DIR}",
    )
    return parser.parse_args()


def main() -> None:
    # Ensure UTF-8 console output on Windows
    if sys.platform.startswith("win"):
        try:
            sys.stdout.reconfigure(encoding="utf-8")
        except Exception:
            pass

    args = parse_args()

    tickers_filter = None
    if args.tickers:
        tickers_filter = [t.strip().upper() for t in args.tickers.split(",") if t.strip()]

    run_walkforward_pipeline(
        tickers_filter=tickers_filter,
        train_start=args.train_start,
        train_end=args.train_end,
        test_start=args.test_start,
        test_end=args.test_end,
        top_k=args.top_k,
        min_trades=args.min_trades,
        threads=args.threads,
        output_dir=args.output_dir,
    )


if __name__ == "__main__":
    main()
