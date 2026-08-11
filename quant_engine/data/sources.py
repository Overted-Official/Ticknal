"""Interchangeable CSV and PostgreSQL market-data sources."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from hashlib import sha256
from pathlib import Path
from typing import Any

import pandas as pd
from sqlalchemy import Engine, create_engine, text

from .quality import (
    DataQualityReport,
    annotate_discontinuities,
    normalize_prices,
    normalize_tickers,
    require_usable,
    validate_prices,
)


@dataclass(frozen=True)
class DataSnapshot:
    source: str
    identity: str
    row_count: int
    ticker_count: int
    first_date: str | None
    last_date: str | None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class MarketDataBundle:
    prices: pd.DataFrame
    tickers: pd.DataFrame
    quality: DataQualityReport
    snapshot: DataSnapshot


class MarketDataSource(ABC):
    @abstractmethod
    def load(self, ticker_symbol: str | None = None) -> MarketDataBundle:
        """Load and validate a canonical market-data snapshot."""


def _file_sha256(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


class CsvMarketDataSource(MarketDataSource):
    def __init__(self, prices_path: str | Path, tickers_path: str | Path):
        self.prices_path = Path(prices_path).resolve()
        self.tickers_path = Path(tickers_path).resolve()

    def load(self, ticker_symbol: str | None = None) -> MarketDataBundle:
        raw_prices = pd.read_csv(self.prices_path, low_memory=False)
        raw_tickers = pd.read_csv(self.tickers_path, dtype="string", keep_default_na=True)
        prices = normalize_prices(raw_prices)
        tickers = normalize_tickers(raw_tickers)
        if ticker_symbol:
            symbol = ticker_symbol.strip().upper().removesuffix(".CA")
            prices = prices.loc[prices["ticker_symbol"].eq(symbol)].reset_index(drop=True)
            tickers = tickers.loc[tickers["symbol"].eq(symbol)].reset_index(drop=True)

        prices = annotate_discontinuities(prices)
        quality = validate_prices(prices)
        require_usable(quality)
        identity = sha256(
            f"{_file_sha256(self.prices_path)}:{_file_sha256(self.tickers_path)}".encode("utf-8")
        ).hexdigest()
        snapshot = DataSnapshot(
            source="csv",
            identity=identity,
            row_count=quality.row_count,
            ticker_count=quality.ticker_count,
            first_date=quality.first_date,
            last_date=quality.last_date,
        )
        return MarketDataBundle(prices=prices, tickers=tickers, quality=quality, snapshot=snapshot)


class PostgresMarketDataSource(MarketDataSource):
    def __init__(self, database_url: str | None = None, *, engine: Engine | None = None):
        if engine is None and not database_url:
            raise ValueError("database_url or engine is required")
        self.engine = engine or create_engine(database_url, pool_pre_ping=True)

    def load(self, ticker_symbol: str | None = None) -> MarketDataBundle:
        price_sql = "SELECT ticker_symbol, date, open, high, low, close, volume FROM daily_prices"
        parameters: dict[str, str] = {}
        if ticker_symbol:
            price_sql += " WHERE ticker_symbol = :ticker_symbol"
            parameters["ticker_symbol"] = ticker_symbol.strip().upper().removesuffix(".CA")
        price_sql += " ORDER BY ticker_symbol, date"

        ticker_sql = "SELECT symbol, company_name, website, exchange, sector, industry FROM tickers"
        if ticker_symbol:
            ticker_sql += " WHERE symbol = :ticker_symbol"
        ticker_sql += " ORDER BY symbol"

        with self.engine.connect() as connection:
            price_result = connection.execute(text(price_sql), parameters)
            raw_prices = pd.DataFrame(price_result.fetchall(), columns=price_result.keys())
            ticker_result = connection.execute(text(ticker_sql), parameters)
            raw_tickers = pd.DataFrame(ticker_result.fetchall(), columns=ticker_result.keys())

        prices = annotate_discontinuities(normalize_prices(raw_prices))
        tickers = normalize_tickers(raw_tickers)
        quality = validate_prices(prices)
        require_usable(quality)

        aggregate_identity = (
            f"{quality.row_count}:{quality.ticker_count}:{quality.first_date}:{quality.last_date}:"
            f"{prices['close'].sum():.4f}:{prices['volume'].sum():.2f}"
        )
        snapshot = DataSnapshot(
            source="postgres",
            identity=sha256(aggregate_identity.encode("utf-8")).hexdigest(),
            row_count=quality.row_count,
            ticker_count=quality.ticker_count,
            first_date=quality.first_date,
            last_date=quality.last_date,
        )
        return MarketDataBundle(prices=prices, tickers=tickers, quality=quality, snapshot=snapshot)
