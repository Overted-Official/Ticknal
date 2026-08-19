"""Configuration constants and search grids for the PSI Walk-Forward Optimizer."""

from __future__ import annotations
import os
from pathlib import Path
import numpy as np

# Project root resolution
PROJECT_ROOT = Path(__file__).resolve().parents[2]

# Default data directories
DEFAULT_EGX_DATA_DIR = PROJECT_ROOT / "_playground" / "QE-V1-Upgrade" / "dataset" / "egx"
DEFAULT_COMMODITIES_DATA_DIR = PROJECT_ROOT / "_playground" / "QE-V1-Upgrade" / "dataset" / "commodities"
DEFAULT_CONSOLIDATED_DATA_PATH = PROJECT_ROOT / "_playground" / "_random" / "consolidated_prices_new.csv"

# Default output directory for research and traceability (does NOT overwrite live app data)
DEFAULT_OUTPUT_DIR = PROJECT_ROOT / "_technical_support" / "psi_walkforward_optimization" / "results"

# Grid search space (31 x 45 x 6 = 8,370 combinations per ticker)
ENTRY_LEVELS = np.array([14.6, 23.6, 38.2, 50.0, 61.8], dtype=np.float64)
AYM_LIMITS = [50.0, 61.8, 78.6, 88.6]
AYM_MULTIPLIERS = list(range(2, 13))
ATR_DISTANCES = [2.0, 3.0, 4.0, 5.0, 6.0, np.nan]
STOPLOSS_LEVELS = [np.nan]  # Exits are exclusively AYM and ATR
INITIAL_CAPITAL = 3000.0

# Default Walk-Forward Date Slices (All data prior to 2025 for training)
DEFAULT_TRAIN_START = None
DEFAULT_TRAIN_END = "2024-12-31"
DEFAULT_TEST_START = "2025-01-01"
DEFAULT_TEST_END = "2026-12-31"

# Candidate selection settings
DEFAULT_TOP_K = 25
DEFAULT_MIN_TRAIN_TRADES = 3

# Multi-objective composite scoring weights for Train phase
WEIGHT_ROI_MARGIN = 0.50
WEIGHT_WIN_RATE = 0.30
WEIGHT_AVG_BARS = 0.15  # Lower avg bars is preferred -> penalizes lingering
WEIGHT_DRAWDOWN = 0.05  # Lower drawdown is preferred

# Standard Result CSV Headers
RESULT_HEADERS = [
    "ticker_id",
    "Max Slots",
    "L-14.6",
    "L-23.6",
    "L-38.2",
    "L-50.0",
    "L-61.8",
    "Slots L-14.6",
    "Slots L-23.6",
    "Slots L-38.2",
    "Slots L-50.0",
    "Slots L-61.8",
    "Use Smrt Index Exit",
    "Exit Level",
    "Use AYM",
    "AYM TP Multiplier",
    "AYM Limit",
    "Use ATR",
    "ATR Distance",
    "Use Stoploss",
    "Stoploss Level",
    "Sys ROI",
    "B&H ROI",
    "ROI Margin",
    "# of Trades",
    "Win Rate",
    "Max Drawdown",
    "Avg. Adverse Excursion",
    "Avg. Favorable Excursion",
    "Annual CAGR",
    "Avg. Return/Trade",
    "Avg Bars/Trade",
]
