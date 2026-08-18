"""Data loader module for EGX stocks, Gold, and Silver."""

from __future__ import annotations
import os
from pathlib import Path
from typing import Dict, List, Optional, Set
import pandas as pd

from .config import (
    DEFAULT_EGX_DATA_DIR,
    DEFAULT_COMMODITIES_DATA_DIR,
    DEFAULT_CONSOLIDATED_DATA_PATH,
)


def get_available_tickers(
    egx_dir: Path = DEFAULT_EGX_DATA_DIR,
    commodities_dir: Path = DEFAULT_COMMODITIES_DATA_DIR,
    consolidated_path: Path = DEFAULT_CONSOLIDATED_DATA_PATH,
) -> Dict[str, Path | str]:
    """Returns a dictionary mapping ticker symbol to its file path or consolidated source."""
    tickers: Dict[str, Path | str] = {}

    # 1. Discover EGX stocks
    if egx_dir.exists() and egx_dir.is_dir():
        for csv_file in sorted(egx_dir.glob("*.csv")):
            symbol = csv_file.stem.upper().replace(".CA", "")
            if symbol and symbol not in tickers:
                tickers[symbol] = csv_file

    # 2. Discover Commodities (GOLD, SILVER)
    if commodities_dir.exists() and commodities_dir.is_dir():
        for csv_file in sorted(commodities_dir.glob("*.csv")):
            symbol = csv_file.stem.upper().replace(".CA", "")
            if symbol and symbol not in tickers:
                tickers[symbol] = csv_file

    # 3. Fallback to consolidated CSV if folder discovery found nothing
    if not tickers and consolidated_path.exists():
        try:
            df = pd.read_csv(consolidated_path, usecols=["ticker_symbol"], low_memory=False)
            col = "ticker_symbol"
        except Exception:
            df = pd.read_csv(consolidated_path, usecols=["ticker"], low_memory=False)
            col = "ticker"
        symbols = df[col].dropna().astype(str).str.upper().str.replace(".CA", "", regex=False).unique()
        for sym in sorted(symbols):
            tickers[sym] = "CONSOLIDATED"

    return tickers


def load_ticker_data(
    ticker: str,
    ticker_source: Path | str,
    consolidated_df: Optional[pd.DataFrame] = None,
) -> Optional[pd.DataFrame]:
    """Loads and standardizes OHLCV DataFrame for a single ticker."""
    df: Optional[pd.DataFrame] = None

    if isinstance(ticker_source, Path) and ticker_source.exists():
        try:
            df = pd.read_csv(ticker_source, low_memory=False)
        except Exception as e:
            print(f"Error reading {ticker_source}: {e}")
            return None
    elif ticker_source == "CONSOLIDATED" and consolidated_df is not None:
        sym_col = "ticker_symbol" if "ticker_symbol" in consolidated_df.columns else "ticker"
        df = consolidated_df[consolidated_df[sym_col].astype(str).str.upper().str.replace(".CA", "", regex=False) == ticker].copy()
    else:
        return None

    if df is None or df.empty:
        return None

    # Normalize column names to lowercase
    df.columns = [str(c).strip().lower() for c in df.columns]

    # Map column aliases
    col_map = {
        "datetime": "date",
        "timestamp": "date",
        "time": "date",
        "vol": "volume",
    }
    df = df.rename(columns=col_map)

    required_cols = {"date", "open", "high", "low", "close"}
    if not required_cols.issubset(set(df.columns)):
        return None

    if "volume" not in df.columns:
        df["volume"] = 0.0

    # Clean dates and numbers
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.tz_localize(None)
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    # Drop nulls and non-positive prices
    df = df.dropna(subset=["date", "open", "high", "low", "close"])
    df = df[(df["open"] > 0) & (df["high"] > 0) & (df["low"] > 0) & (df["close"] > 0)]

    # Deduplicate and sort chronologically
    df = df.sort_values("date", kind="stable").drop_duplicates(subset=["date"]).reset_index(drop=True)

    if len(df) < 100:
        return None

    return df
