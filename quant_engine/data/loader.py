import os
from pathlib import Path

import pandas as pd

from .quality import normalize_prices
from .sources import CsvMarketDataSource, PostgresMarketDataSource

def get_db_engine():
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        raise ValueError("DATABASE_URL environment variable is not set.")
    return PostgresMarketDataSource(db_url).engine

def load_price_data(ticker_symbol: str = None) -> pd.DataFrame:
    """
    Loads daily prices from Supabase PostgreSQL.
    If ticker_symbol is provided, loads only for that ticker.
    Otherwise, loads all tickers.
    """
    source = PostgresMarketDataSource(os.environ.get("DATABASE_URL"))
    canonical = source.load(ticker_symbol).prices.loc[:, [
        "ticker_symbol", "date", "open", "high", "low", "close", "volume"
    ]]
    # Backward-compatible shape for legacy feature/signal scripts.
    return canonical.rename(columns={"ticker_symbol": "tickerSymbol"})

def load_csv_data(filepath: str) -> pd.DataFrame:
    """
    Loads daily prices from a consolidated CSV file as a fallback or for local testing.
    """
    canonical = normalize_prices(pd.read_csv(Path(filepath), low_memory=False))
    return canonical.rename(columns={"ticker_symbol": "tickerSymbol"})
