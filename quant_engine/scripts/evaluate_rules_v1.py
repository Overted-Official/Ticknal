"""Run the corrected v1 Master Index benchmark for one ticker."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import pandas as pd

from quant_engine.backtest import BacktestConfig, QualificationPolicy, evaluate_backtest, run_single_asset_backtest
from quant_engine.data import add_point_in_time_eligibility
from quant_engine.strategy.params import get_params_for_ticker
from quant_engine.strategy.rules_v1 import build_master_index_rule_frame

from ._common import build_source


def _json_ready(value):
    if isinstance(value, float) and (pd.isna(value) or value in (float("inf"), float("-inf"))):
        return None
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate corrected QuantEGX rules")
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--source", choices=["csv", "database"], default="csv")
    parser.add_argument("--start", default="2021-01-01")
    parser.add_argument("--end")
    parser.add_argument("--initial-capital", type=float, default=10_000.0)
    parser.add_argument("--commission-bps-per-side", type=float, default=10.0)
    parser.add_argument("--slippage-bps-per-side", type=float, default=15.0)
    parser.add_argument("--minimum-win-rate", type=float, default=0.75)
    parser.add_argument("--minimum-trades", type=int, default=10)
    parser.add_argument("--preferred-holding-bars", type=float, default=64.0)
    parser.add_argument("--maximum-drawdown", type=float, default=0.10)
    parser.add_argument("--output-dir", type=Path)
    args = parser.parse_args()

    ticker = args.ticker.strip().upper().removesuffix(".CA")
    bundle = build_source(args.source).load()
    eligible = add_point_in_time_eligibility(bundle.prices, bundle.tickers)
    ticker_prices = eligible.loc[eligible["ticker_symbol"].eq(ticker)].reset_index(drop=True)
    if ticker_prices.empty:
        raise SystemExit(f"Ticker {ticker} is not present in {args.source}")

    params = get_params_for_ticker(ticker, {})
    signal_frame = build_master_index_rule_frame(ticker_prices, params)
    result = run_single_asset_backtest(
        signal_frame,
        start_date=args.start,
        end_date=args.end,
        config=BacktestConfig(
            initial_capital=args.initial_capital,
            commission_bps_per_side=args.commission_bps_per_side,
            slippage_bps_per_side=args.slippage_bps_per_side,
        ),
    )
    metrics = evaluate_backtest(
        result,
        QualificationPolicy(
            minimum_win_rate=args.minimum_win_rate,
            minimum_trades=args.minimum_trades,
            preferred_max_average_holding_bars=args.preferred_holding_bars,
            maximum_drawdown=args.maximum_drawdown,
        ),
    )
    report = {
        "data_snapshot": bundle.snapshot.to_dict(),
        "quality": bundle.quality.to_dict(),
        "strategy": "master-index-rules-v1",
        "parameters": params,
        "metrics": metrics,
    }

    if args.output_dir:
        output_dir = args.output_dir.resolve() / ticker
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / "metrics.json").write_text(
            json.dumps(report, indent=2, default=_json_ready), encoding="utf-8"
        )
        pd.DataFrame([trade.to_dict() for trade in result.trades]).to_csv(output_dir / "trades.csv", index=False)
        result.equity_curve.to_csv(output_dir / "equity_curve.csv", index=False)

    print(json.dumps(report, indent=2, default=_json_ready))


if __name__ == "__main__":
    main()
