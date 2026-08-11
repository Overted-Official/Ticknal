"""Shared source configuration for quant-engine commands."""

from __future__ import annotations

import os
from pathlib import Path

from quant_engine.data import CsvMarketDataSource, MarketDataSource, PostgresMarketDataSource


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PRICES_PATH = PROJECT_ROOT / "Data" / "consolidated_prices_new.csv"
DEFAULT_TICKERS_PATH = PROJECT_ROOT / "Data" / "tickers_new.csv"


def load_local_environment(path: Path | None = None) -> None:
    """Load missing keys from .env.local without logging secret values."""
    env_path = path or PROJECT_ROOT / ".env.local"
    if not env_path.exists():
        return
    for raw in env_path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def build_source(name: str) -> MarketDataSource:
    normalized = name.strip().lower()
    if normalized == "csv":
        return CsvMarketDataSource(DEFAULT_PRICES_PATH, DEFAULT_TICKERS_PATH)
    if normalized in {"database", "postgres", "supabase"}:
        load_local_environment()
        database_url = os.environ.get("DATABASE_URL")
        if not database_url:
            raise RuntimeError("DATABASE_URL is not configured")
        return PostgresMarketDataSource(database_url)
    raise ValueError(f"Unsupported data source: {name}")
