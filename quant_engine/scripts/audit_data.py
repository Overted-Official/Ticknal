"""Audit a canonical source and optionally compare Supabase with local CSV."""

from __future__ import annotations

import argparse
import json
from typing import Any

import pandas as pd

from quant_engine.data import add_point_in_time_eligibility

from ._common import build_source


def _coverage(prices: pd.DataFrame) -> pd.DataFrame:
    return (
        prices.groupby("ticker_symbol", sort=True)
        .agg(rows=("date", "size"), first_date=("date", "min"), last_date=("date", "max"))
        .reset_index()
    )


def _compare(left: pd.DataFrame, right: pd.DataFrame) -> dict[str, Any]:
    comparison = _coverage(left).merge(
        _coverage(right),
        on="ticker_symbol",
        how="outer",
        suffixes=("_source", "_reference"),
    )
    comparison["missing_rows"] = comparison["rows_reference"].fillna(0) - comparison["rows_source"].fillna(0)
    mismatches = comparison.loc[
        comparison["missing_rows"].ne(0)
        | comparison["first_date_source"].ne(comparison["first_date_reference"])
        | comparison["last_date_source"].ne(comparison["last_date_reference"])
    ].copy()
    for column in ("first_date_source", "last_date_source", "first_date_reference", "last_date_reference"):
        mismatches[column] = mismatches[column].map(lambda value: str(value.date()) if pd.notna(value) else None)
    return {
        "row_difference": int(len(right) - len(left)),
        "affected_tickers": len(mismatches),
        "mismatches": mismatches.to_dict(orient="records"),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Audit QuantEGX market data")
    parser.add_argument("--source", choices=["csv", "database"], default="csv")
    parser.add_argument("--compare-csv", action="store_true", help="Compare the selected source with local CSV")
    args = parser.parse_args()

    bundle = build_source(args.source).load()
    eligible = add_point_in_time_eligibility(bundle.prices, bundle.tickers)
    latest = eligible["date"].max()
    payload: dict[str, Any] = {
        "snapshot": bundle.snapshot.to_dict(),
        "quality": bundle.quality.to_dict(),
        "eligible_tickers_latest": int(
            eligible.loc[eligible["date"].eq(latest) & eligible["is_eligible"], "ticker_symbol"].nunique()
        ),
    }
    if args.compare_csv:
        reference = build_source("csv").load()
        payload["csv_parity"] = _compare(bundle.prices, reference.prices)
    print(json.dumps(payload, indent=2, default=str))


if __name__ == "__main__":
    main()
