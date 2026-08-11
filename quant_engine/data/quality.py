"""Canonical market-data normalization, profiling, and eligibility rules.

The functions in this module never repair market observations. Structural
errors fail fast; suspicious price discontinuities are retained and separated
into deterministic segments so features and labels cannot cross them.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

import numpy as np
import pandas as pd


PRICE_COLUMNS = ("ticker_symbol", "date", "open", "high", "low", "close", "volume")
NUMERIC_COLUMNS = ("open", "high", "low", "close", "volume")
TICKER_COLUMNS = ("symbol", "company_name", "website", "exchange", "sector", "industry")


class DataQualityError(ValueError):
    """Raised when a dataset violates the canonical structural contract."""


@dataclass(frozen=True)
class QualityIssue:
    code: str
    severity: str
    count: int
    message: str


@dataclass(frozen=True)
class DataQualityReport:
    row_count: int
    ticker_count: int
    first_date: str | None
    last_date: str | None
    zero_volume_rows: int
    discontinuity_rows: int
    issues: tuple[QualityIssue, ...] = field(default_factory=tuple)

    @property
    def is_usable(self) -> bool:
        return not any(issue.severity == "critical" for issue in self.issues)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["is_usable"] = self.is_usable
        return payload


def normalize_prices(raw: pd.DataFrame) -> pd.DataFrame:
    """Return prices at canonical ticker/date grain without dropping bad rows."""
    df = raw.copy()
    aliases = {
        "tickerSymbol": "ticker_symbol",
        "ticker": "ticker_symbol",
        "Date": "date",
        "Open": "open",
        "High": "high",
        "Low": "low",
        "Close": "close",
        "Volume": "volume",
    }
    for source, target in aliases.items():
        if source in df.columns and target not in df.columns:
            df = df.rename(columns={source: target})

    missing = [column for column in PRICE_COLUMNS if column not in df.columns]
    if missing:
        raise DataQualityError(f"Missing required price columns: {', '.join(missing)}")

    df = df.loc[:, list(PRICE_COLUMNS)].copy()
    df["ticker_symbol"] = df["ticker_symbol"].astype("string").str.strip().str.upper()
    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.normalize()
    for column in NUMERIC_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce")

    return df.sort_values(["ticker_symbol", "date"], kind="stable").reset_index(drop=True)


def normalize_tickers(raw: pd.DataFrame) -> pd.DataFrame:
    """Normalize ticker metadata while preserving nullable descriptive fields."""
    df = raw.copy()
    aliases = {"companyName": "company_name", "ticker_symbol": "symbol"}
    for source, target in aliases.items():
        if source in df.columns and target not in df.columns:
            df = df.rename(columns={source: target})

    if "symbol" not in df.columns:
        raise DataQualityError("Missing required ticker column: symbol")
    for column in TICKER_COLUMNS:
        if column not in df.columns:
            df[column] = pd.NA

    df = df.loc[:, list(TICKER_COLUMNS)].copy()
    df["symbol"] = df["symbol"].astype("string").str.strip().str.upper()
    for column in TICKER_COLUMNS[1:]:
        df[column] = df[column].astype("string").str.strip()
        df.loc[df[column].eq(""), column] = pd.NA
    return df.sort_values("symbol", kind="stable").reset_index(drop=True)


def annotate_discontinuities(
    prices: pd.DataFrame,
    *,
    absolute_return_threshold: float = 0.50,
) -> pd.DataFrame:
    """Mark price jumps and create clean, per-ticker segment identifiers.

    A flagged row starts a new segment. Rolling features, entry signals, and
    forward outcomes can then be grouped by ``segment_id`` to avoid treating a
    split or bad source transition as an economic return.
    """
    if absolute_return_threshold <= 0:
        raise ValueError("absolute_return_threshold must be positive")

    df = prices.copy()
    previous_close = df.groupby("ticker_symbol", sort=False)["close"].shift(1)
    returns = df["close"].div(previous_close).sub(1.0)
    df["close_return"] = returns
    df["is_discontinuity"] = previous_close.notna() & returns.abs().gt(absolute_return_threshold)
    segment_number = df.groupby("ticker_symbol", sort=False)["is_discontinuity"].cumsum().astype("int64")
    df["segment_id"] = df["ticker_symbol"].astype("string") + ":" + segment_number.astype("string")
    return df


def validate_prices(prices: pd.DataFrame) -> DataQualityReport:
    """Profile canonical prices and identify structural failures."""
    issues: list[QualityIssue] = []

    missing_symbol = int(prices["ticker_symbol"].isna().sum() + prices["ticker_symbol"].eq("").sum())
    missing_date = int(prices["date"].isna().sum())
    missing_numeric = int(prices.loc[:, list(NUMERIC_COLUMNS)].isna().any(axis=1).sum())
    duplicate_keys = int(prices.duplicated(["ticker_symbol", "date"], keep=False).sum())
    nonpositive_prices = int(prices.loc[:, ["open", "high", "low", "close"]].le(0).any(axis=1).sum())
    negative_volume = int(prices["volume"].lt(0).sum())
    invalid_ohlc = int(
        (
            prices["high"].lt(prices[["open", "close", "low"]].max(axis=1))
            | prices["low"].gt(prices[["open", "close", "high"]].min(axis=1))
            | prices["high"].lt(prices["low"])
        ).sum()
    )

    checks = (
        ("missing_symbol", missing_symbol, "Rows have no ticker symbol."),
        ("missing_date", missing_date, "Rows have an invalid or missing date."),
        ("missing_numeric", missing_numeric, "Rows have missing or non-numeric OHLCV values."),
        ("duplicate_ticker_date", duplicate_keys, "Ticker/date grain is not unique."),
        ("nonpositive_price", nonpositive_prices, "Rows contain non-positive OHLC prices."),
        ("negative_volume", negative_volume, "Rows contain negative volume."),
        ("invalid_ohlc", invalid_ohlc, "Rows violate OHLC range relationships."),
    )
    for code, count, message in checks:
        if count:
            issues.append(QualityIssue(code=code, severity="critical", count=count, message=message))

    zero_volume = int(prices["volume"].eq(0).sum())
    if zero_volume:
        issues.append(
            QualityIssue(
                code="zero_volume",
                severity="warning",
                count=zero_volume,
                message="Zero-volume observations require point-in-time liquidity filtering.",
            )
        )

    discontinuities = int(prices.get("is_discontinuity", pd.Series(False, index=prices.index)).sum())
    if discontinuities:
        issues.append(
            QualityIssue(
                code="price_discontinuity",
                severity="warning",
                count=discontinuities,
                message="Large close-to-close jumps were segmented and cannot be crossed by research windows.",
            )
        )

    valid_dates = prices["date"].dropna()
    return DataQualityReport(
        row_count=len(prices),
        ticker_count=int(prices["ticker_symbol"].nunique(dropna=True)),
        first_date=str(valid_dates.min().date()) if not valid_dates.empty else None,
        last_date=str(valid_dates.max().date()) if not valid_dates.empty else None,
        zero_volume_rows=zero_volume,
        discontinuity_rows=discontinuities,
        issues=tuple(issues),
    )


def add_point_in_time_eligibility(
    prices: pd.DataFrame,
    tickers: pd.DataFrame | None = None,
    *,
    minimum_clean_bars: int = 252,
    liquidity_window: int = 60,
    minimum_nonzero_volume_rate: float = 0.80,
    traded_value_floor: float = 1_000_000.0,
) -> pd.DataFrame:
    """Attach causal liquidity and metadata eligibility to every observation."""
    df = prices.copy()
    if "segment_id" not in df.columns:
        df = annotate_discontinuities(df)

    groups = df.groupby(["ticker_symbol", "segment_id"], sort=False, group_keys=False)
    df["clean_bar_count"] = groups.cumcount().add(1)
    df["nonzero_volume_rate_60"] = groups["volume"].transform(
        lambda series: series.gt(0).rolling(liquidity_window, min_periods=liquidity_window).mean()
    )
    df["traded_value_est"] = df["close"] * df["volume"]
    df["median_traded_value_60"] = groups["traded_value_est"].transform(
        lambda series: series.rolling(liquidity_window, min_periods=liquidity_window).median()
    )

    base = (
        df["clean_bar_count"].ge(minimum_clean_bars)
        & df["nonzero_volume_rate_60"].ge(minimum_nonzero_volume_rate)
    )
    cross_sectional_median = (
        df.loc[base].groupby("date")["median_traded_value_60"].median().rename("market_median_traded_value")
    )
    df = df.join(cross_sectional_median, on="date")
    df["required_traded_value"] = df["market_median_traded_value"].fillna(0).clip(lower=traded_value_floor)

    if tickers is not None:
        metadata = tickers[["symbol", "sector"]].rename(columns={"symbol": "ticker_symbol"})
        df = df.merge(metadata, on="ticker_symbol", how="left", validate="many_to_one")
        sector_known = df["sector"].notna() & df["sector"].astype("string").str.strip().ne("")
    else:
        sector_known = pd.Series(True, index=df.index)

    df["is_eligible"] = (
        base
        & df["median_traded_value_60"].ge(df["required_traded_value"])
        & sector_known
        & ~df["is_discontinuity"]
    )
    return df


def require_usable(report: DataQualityReport) -> None:
    """Raise a single actionable error for a structurally unusable source."""
    if report.is_usable:
        return
    failures = "; ".join(f"{issue.code}={issue.count}" for issue in report.issues if issue.severity == "critical")
    raise DataQualityError(f"Market data failed structural validation: {failures}")
