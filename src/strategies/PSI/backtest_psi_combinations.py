"""Exhaustive PSI v9 parameter sweep for EGX tickers.

The app computes live PSI signals in TypeScript for Vercel. This script is the
offline research path: it tests every entry/AYM/ATR/stop combination per ticker
from 2020-01-01 through the requested end date and writes CSV results.
"""

from __future__ import annotations

import argparse
import csv
import math
import time
from datetime import date
from pathlib import Path

import numba as nb
import numpy as np
import pandas as pd
import pandas_ta as ta


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATA_PATH = PROJECT_ROOT / "Data" / "consolidated_prices_new.csv"
DEFAULT_OUTPUT_PATH = PROJECT_ROOT / "Data" / "psi_combination_backtest_results.csv"
DEFAULT_BEST_OUTPUT_PATH = PROJECT_ROOT / "Data" / "psi_best_combinations.csv"

ENTRY_LEVELS = np.array([14.6, 23.6, 38.2, 50.0, 61.8], dtype=np.float64)
AYM_LIMITS = [50.0, 61.8, 78.6, 88.6]
AYM_MULTIPLIERS = list(range(2, 13))
ATR_DISTANCES = [2.0, 3.0, 4.0, 5.0, 6.0, np.nan]
STOPLOSS_LEVELS = [4.0, 5.0, 6.0, 8.0, 10.0, np.nan]
INITIAL_CAPITAL = 3000.0

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


@nb.njit(cache=True)
def calc_weighted_simple_average(src: np.ndarray, length: int, weight: float) -> np.ndarray:
    n = len(src)
    output = np.full(n, np.nan)
    sum_float = np.nan

    for i in range(n):
        if np.isnan(src[i]):
            sum_float = np.nan
            continue

        previous_sum = 0.0 if np.isnan(sum_float) else sum_float
        old_value = src[i - length] if i >= length and not np.isnan(src[i - length]) else 0.0
        sum_float = previous_sum - old_value + src[i]

        moving_average = np.nan
        if i >= length and not np.isnan(src[i - length]):
            moving_average = sum_float / length

        previous_output = output[i - 1] if i > 0 else np.nan
        if np.isnan(previous_output):
            output[i] = moving_average
        else:
            output[i] = (src[i] * weight + previous_output * (length - weight)) / length

    return output


@nb.njit(cache=True)
def dynamic_ema(src: np.ndarray, length: int) -> np.ndarray:
    out = np.full(len(src), np.nan)
    alpha = 2.0 / (length + 1.0)
    previous = np.nan
    for i in range(len(src)):
        if np.isnan(src[i]):
            continue
        if np.isnan(previous):
            previous = src[i]
        else:
            previous = alpha * src[i] + (1.0 - alpha) * previous
        out[i] = previous
    return out


@nb.njit(cache=True, parallel=True)
def backtest_grid(
    master_index: np.ndarray,
    master_index_adjusted: np.ndarray,
    close: np.ndarray,
    high: np.ndarray,
    low: np.ndarray,
    median_daily_move: np.ndarray,
    atr: np.ndarray,
    level_masks: np.ndarray,
    aym_values: np.ndarray,
    aym_limits: np.ndarray,
    atr_values: np.ndarray,
    stoploss_values: np.ndarray,
    years: float,
    close_open_at_end: bool,
) -> np.ndarray:
    total = len(level_masks) * len(aym_values) * len(atr_values) * len(stoploss_values)
    results = np.empty((total, 16), dtype=np.float64)
    n = len(close)
    bh_roi = ((close[-1] / close[0]) - 1.0) * 100.0 if n > 1 and close[0] > 0 else 0.0

    for combo_index in nb.prange(total):
        sl_idx = combo_index % len(stoploss_values)
        atr_idx = (combo_index // len(stoploss_values)) % len(atr_values)
        aym_idx = (combo_index // (len(stoploss_values) * len(atr_values))) % len(aym_values)
        mask_idx = combo_index // (len(stoploss_values) * len(atr_values) * len(aym_values))

        level_mask = level_masks[mask_idx]
        aym = aym_values[aym_idx]
        aym_limit = aym_limits[aym_idx]
        atr_distance = atr_values[atr_idx]
        stoploss = stoploss_values[sl_idx]

        balance = INITIAL_CAPITAL
        active = False
        entry_price = 0.0
        target_price = np.nan
        highest_price = 0.0
        lowest_price = 0.0
        trade_count = 0
        win_count = 0
        closed_trades = 0
        active_bars = 0
        return_sum = 0.0
        adverse_sum = 0.0
        favorable_sum = 0.0
        peak_equity = INITIAL_CAPITAL
        max_drawdown = 0.0
        final_equity = INITIAL_CAPITAL

        for i in range(1, n):
            current_master = master_index[i]
            previous_master = master_index[i - 1]

            if not active and not np.isnan(current_master) and not np.isnan(previous_master):
                crossed = False
                for bit in range(5):
                    if (level_mask & (1 << bit)) != 0:
                        level = ENTRY_LEVELS[bit]
                        if current_master > level and previous_master <= level:
                            crossed = True
                            break

                if crossed:
                    shares = math.floor(balance / close[i])
                    if shares > 0:
                        active = True
                        entry_price = close[i]
                        highest_price = high[i]
                        lowest_price = low[i]
                        trade_count += 1
                        target_price = np.nan
                        if not np.isnan(aym) and not np.isnan(median_daily_move[i]):
                            target_price = close[i] * (1.0 + (median_daily_move[i] * aym / 100.0))

            if active:
                active_bars += 1
                if high[i] > highest_price:
                    highest_price = high[i]
                if low[i] < lowest_price:
                    lowest_price = low[i]

                hit_take_profit = (
                    not np.isnan(aym)
                    and not np.isnan(target_price)
                    and not np.isnan(aym_limit)
                    and not np.isnan(master_index_adjusted[i])
                    and close[i] >= target_price
                    and master_index_adjusted[i] < aym_limit
                )
                hit_stoploss = (
                    not np.isnan(stoploss)
                    and not np.isnan(median_daily_move[i])
                    and close[i] <= entry_price * (1.0 - (median_daily_move[i] * stoploss / 100.0))
                )
                hit_trail = (
                    not np.isnan(atr_distance)
                    and not np.isnan(atr[i])
                    and close[i] <= highest_price - (atr[i] * atr_distance)
                    and close[i] > entry_price
                )

                if hit_stoploss or hit_trail or hit_take_profit:
                    shares = math.floor(balance / entry_price)
                    trade_return = ((close[i] - entry_price) / entry_price) * 100.0
                    balance += shares * (close[i] - entry_price)
                    return_sum += trade_return
                    adverse_sum += ((lowest_price - entry_price) / entry_price) * 100.0
                    favorable_sum += ((highest_price - entry_price) / entry_price) * 100.0
                    closed_trades += 1
                    if trade_return > 0.0:
                        win_count += 1
                    active = False

            if active:
                shares = math.floor(balance / entry_price)
                final_equity = shares * close[i] + (balance - shares * entry_price)
            else:
                final_equity = balance
            if final_equity > peak_equity:
                peak_equity = final_equity
            if peak_equity > 0.0:
                drawdown = ((peak_equity - final_equity) / peak_equity) * 100.0
                if drawdown > max_drawdown:
                    max_drawdown = drawdown

        if active and close_open_at_end:
            shares = math.floor(balance / entry_price)
            trade_return = ((close[-1] - entry_price) / entry_price) * 100.0
            balance += shares * (close[-1] - entry_price)
            return_sum += trade_return
            adverse_sum += ((lowest_price - entry_price) / entry_price) * 100.0
            favorable_sum += ((highest_price - entry_price) / entry_price) * 100.0
            closed_trades += 1
            if trade_return > 0.0:
                win_count += 1
            final_equity = balance
            active = False

        sys_roi = ((final_equity - INITIAL_CAPITAL) / INITIAL_CAPITAL) * 100.0
        cagr = ((final_equity / INITIAL_CAPITAL) ** (1.0 / years) - 1.0) * 100.0 if years > 0.0 and final_equity > 0.0 else 0.0

        results[combo_index, 0] = level_mask
        results[combo_index, 1] = aym
        results[combo_index, 2] = aym_limit
        results[combo_index, 3] = atr_distance
        results[combo_index, 4] = stoploss
        results[combo_index, 5] = sys_roi
        results[combo_index, 6] = bh_roi
        results[combo_index, 7] = sys_roi - bh_roi
        results[combo_index, 8] = trade_count
        results[combo_index, 9] = (win_count / trade_count) * 100.0 if trade_count > 0 else 0.0
        results[combo_index, 10] = max_drawdown
        results[combo_index, 11] = adverse_sum / trade_count if trade_count > 0 else 0.0
        results[combo_index, 12] = favorable_sum / trade_count if trade_count > 0 else 0.0
        results[combo_index, 13] = cagr
        results[combo_index, 14] = return_sum / closed_trades if closed_trades > 0 else 0.0
        results[combo_index, 15] = active_bars / trade_count if trade_count > 0 else 0.0

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backtest every PSI v9 combination for every ticker.")
    parser.add_argument("--data", type=Path, default=DEFAULT_DATA_PATH, help="Consolidated OHLCV CSV path.")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH, help="All-combinations CSV output path.")
    parser.add_argument("--best-output", type=Path, default=DEFAULT_BEST_OUTPUT_PATH, help="Best-combination summary CSV path.")
    parser.add_argument("--start-date", default="2020-01-01", help="Inclusive test start date.")
    parser.add_argument("--end-date", default=date.today().isoformat(), help="Inclusive test end date.")
    parser.add_argument("--tickers", help="Comma-separated ticker subset for smoke runs.")
    parser.add_argument("--threads", type=int, help="Numba worker threads for the per-ticker grid.")
    parser.add_argument("--append", action="store_true", help="Append to output files instead of replacing them.")
    parser.add_argument("--no-all-output", action="store_true", help="Only write the best-summary CSV.")
    parser.add_argument("--close-open-at-end", action="store_true", help="Force-close open positions on the final test bar.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.threads:
        nb.set_num_threads(args.threads)

    df = pd.read_csv(args.data, low_memory=False)
    required = {"ticker_symbol", "date", "open", "high", "low", "close", "volume"}
    missing = required.difference(df.columns)
    if missing:
        raise ValueError(f"Missing required columns in {args.data}: {', '.join(sorted(missing))}")

    df["date"] = pd.to_datetime(df["date"], errors="coerce").dt.tz_localize(None)
    for column in ["open", "high", "low", "close", "volume"]:
        df[column] = pd.to_numeric(df[column], errors="coerce")
    df = df.dropna(subset=["ticker_symbol", "date", "open", "high", "low", "close"])
    df = df[(df["open"] > 0) & (df["high"] > 0) & (df["low"] > 0) & (df["close"] > 0)]
    df["ticker_symbol"] = df["ticker_symbol"].astype(str).str.upper().str.replace(".CA", "", regex=False)

    requested = parse_ticker_subset(args.tickers)
    available = list(df["ticker_symbol"].drop_duplicates().sort_values())
    tickers = [ticker for ticker in available if requested is None or ticker in requested]
    if not tickers:
        raise ValueError("No requested tickers were found in the data file.")
    if requested is not None:
        missing_requested = sorted(requested.difference(available))
        if missing_requested:
            print(f"Requested tickers missing from price data: {', '.join(missing_requested)}")

    level_masks = np.arange(1, 32, dtype=np.int64)
    aym_pairs = [(float(value), float(limit)) for value in AYM_MULTIPLIERS for limit in AYM_LIMITS] + [(np.nan, np.nan)]
    aym_values = np.array([pair[0] for pair in aym_pairs], dtype=np.float64)
    aym_limits = np.array([pair[1] for pair in aym_pairs], dtype=np.float64)
    atr_values = np.array(ATR_DISTANCES, dtype=np.float64)
    stoploss_values = np.array(STOPLOSS_LEVELS, dtype=np.float64)
    grid_size = len(level_masks) * len(aym_values) * len(atr_values) * len(stoploss_values)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.best_output.parent.mkdir(parents=True, exist_ok=True)
    all_mode = "a" if args.append else "w"
    best_mode = "a" if args.append else "w"

    with maybe_open_all_output(args.output, all_mode, args.no_all_output) as all_file, args.best_output.open(best_mode, newline="", encoding="utf-8") as best_file:
        all_writer = csv.writer(all_file) if all_file is not None else None
        best_writer = csv.writer(best_file)
        if not args.append:
            if all_writer is not None:
                all_writer.writerow(RESULT_HEADERS)
            best_writer.writerow(RESULT_HEADERS)

        print(f"Loaded {len(tickers)} tickers. Grid size per ticker: {grid_size:,} combinations.")
        print(f"Testing from {args.start_date} through {args.end_date}. Smart exit and multi-slot are disabled.")

        for ticker_index, ticker in enumerate(tickers, start=1):
            started = time.time()
            prepared = prepare_ticker_arrays(df, ticker, args.start_date, args.end_date)
            if prepared is None:
                print(f"[{ticker_index}/{len(tickers)}] {ticker}: skipped, insufficient data.")
                continue

            results = backtest_grid(
                prepared["master_index"],
                prepared["master_index_adjusted"],
                prepared["close"],
                prepared["high"],
                prepared["low"],
                prepared["median_daily_move"],
                prepared["atr"],
                level_masks,
                aym_values,
                aym_limits,
                atr_values,
                stoploss_values,
                prepared["years"],
                args.close_open_at_end,
            )

            if all_writer is not None:
                for row in results:
                    all_writer.writerow(format_result_row(ticker, row))

            best_row = select_best_result(results)
            if best_row is not None:
                best_writer.writerow(format_result_row(ticker, best_row))
                print(
                    f"[{ticker_index}/{len(tickers)}] {ticker}: {len(results):,} combos, "
                    f"best margin {best_row[7]:.2f}%, {time.time() - started:.1f}s"
                )
            else:
                print(f"[{ticker_index}/{len(tickers)}] {ticker}: no trades in tested combinations.")

            if all_file is not None:
                all_file.flush()
            best_file.flush()


def maybe_open_all_output(path: Path, mode: str, disabled: bool):
    if disabled:
        return nullcontext()
    return path.open(mode, newline="", encoding="utf-8")


class nullcontext:
    def __enter__(self):
        return None

    def __exit__(self, exc_type, exc_value, traceback):
        return False


def parse_ticker_subset(raw: str | None) -> set[str] | None:
    if not raw:
        return None
    return {item.strip().upper().replace(".CA", "") for item in raw.split(",") if item.strip()}


def prepare_ticker_arrays(df: pd.DataFrame, ticker: str, start_date: str, end_date: str) -> dict[str, np.ndarray | float] | None:
    ticker_df = df.loc[df["ticker_symbol"] == ticker].copy()
    ticker_df = ticker_df.sort_values("date", kind="stable").reset_index(drop=True)
    ticker_df = ticker_df.loc[ticker_df["date"] <= pd.Timestamp(end_date)].copy()
    if len(ticker_df) < 260:
        return None

    close = ticker_df["close"].astype(float)
    high = ticker_df["high"].astype(float)
    low = ticker_df["low"].astype(float)

    np_high = close.rolling(14, min_periods=14).max()
    np_low = close.rolling(14, min_periods=14).min()
    ticker_df["np_score"] = np.where(np_high != np_low, ((close - np_low) / (np_high - np_low)) * 100.0, 50.0)
    ticker_df["rsi_score"] = ta.rsi(close, length=14)

    stoch_low = low.rolling(27, min_periods=27).min()
    stoch_high = high.rolling(27, min_periods=27).max()
    stoch_k = np.where(stoch_high != stoch_low, ((close - stoch_low) / (stoch_high - stoch_low)) * 100.0, 50.0)
    banker_1 = calc_weighted_simple_average(np.asarray(stoch_k, dtype=np.float64), 5, 1.0)
    banker_2 = calc_weighted_simple_average(banker_1, 3, 1.0)
    ticker_df["banker_score"] = np.clip((3.0 * banker_1 - 2.0 * banker_2 - 50.0) * 1.032 + 50.0, 0.0, 100.0)

    bb = ta.bbands(close, length=14, std=2.0)
    if bb is None or bb.empty:
        return None
    bb_lower = bb.iloc[:, 0]
    bb_upper = bb.iloc[:, 2]
    bb_diff = bb_upper - bb_lower
    ticker_df["bb_score"] = np.clip(np.where(bb_diff != 0, ((close - bb_lower) / bb_diff) * 100.0, 50.0), 0.0, 100.0)

    atr14 = ta.atr(high, low, close, length=14)
    ticker_df["atr_14"] = atr14
    supertrend = ta.supertrend(high, low, close, length=14, multiplier=3.0)
    if supertrend is None or supertrend.empty:
        return None
    st_value_col = next(column for column in supertrend.columns if column.startswith("SUPERT_"))
    st_value = supertrend[st_value_col]
    ticker_df["st_score"] = np.clip(np.where(atr14 > 0, 50.0 + (((close - st_value) / (atr14 * 3.0)) * 50.0), 50.0), 0.0, 100.0)

    adx = ta.adx(high, low, close, length=14)
    if adx is not None and not adx.empty:
        di_plus = adx["DMP_14"]
        di_minus = adx["DMN_14"]
        di_sum = di_plus + di_minus
        ticker_df["adx_score"] = np.clip(np.where(di_sum != 0, 50.0 + (((di_plus - di_minus) / di_sum) * 50.0), 50.0), 0.0, 100.0)
    else:
        ticker_df["adx_score"] = 50.0

    ma_fast = close.rolling(50, min_periods=50).mean()
    ma_slow = close.rolling(200, min_periods=200).mean()
    ma_diff = ma_fast - ma_slow
    ma_high = ma_diff.rolling(14, min_periods=14).max()
    ma_low = ma_diff.rolling(14, min_periods=14).min()
    ma_range = ma_high - ma_low
    ticker_df["ma_score"] = np.where(ma_range != 0, ((ma_diff - ma_low) / ma_range) * 100.0, 50.0)

    price_change = close - close.shift(14)
    raw_slope = np.where(atr14 > 0, price_change / (atr14 * 14.0), 0.0)
    angle = np.degrees(np.arctan(raw_slope))
    ticker_df["slope_score"] = np.clip(((angle + 90.0) / 180.0) * 100.0, 0.0, 100.0)

    total_weight = 99.0
    raw_calc = (
        ticker_df["np_score"] * 21.0
        + ticker_df["rsi_score"] * 10.0
        + ticker_df["banker_score"] * 5.0
        + ticker_df["bb_score"] * 4.0
        + ticker_df["st_score"] * 44.0
        + ticker_df["adx_score"] * 10.0
        + ticker_df["ma_score"] * 4.0
        + ticker_df["slope_score"]
    ) / total_weight
    master_raw = raw_calc.to_numpy(dtype=np.float64)
    ticker_df["master_index"] = dynamic_ema(master_raw, 1)
    ticker_df["master_index_adjusted"] = dynamic_ema(master_raw, 2)

    ticker_df["tr"] = true_range(ticker_df)
    ticker_df["median_daily_move"] = ((ticker_df["tr"] / close) * 100.0).rolling(252, min_periods=252).median()

    test = ticker_df.loc[ticker_df["date"].between(pd.Timestamp(start_date), pd.Timestamp(end_date))].copy()
    if len(test) < 2:
        return None

    years = max((test["date"].iloc[-1] - pd.Timestamp(start_date)).days / 365.25, 0.001)
    return {
        "master_index": test["master_index"].to_numpy(dtype=np.float64),
        "master_index_adjusted": test["master_index_adjusted"].to_numpy(dtype=np.float64),
        "close": test["close"].to_numpy(dtype=np.float64),
        "high": test["high"].to_numpy(dtype=np.float64),
        "low": test["low"].to_numpy(dtype=np.float64),
        "median_daily_move": test["median_daily_move"].to_numpy(dtype=np.float64),
        "atr": test["atr_14"].to_numpy(dtype=np.float64),
        "years": float(years),
    }


def true_range(df: pd.DataFrame) -> pd.Series:
    previous_close = df["close"].shift(1)
    tr1 = df["high"] - df["low"]
    tr2 = (df["high"] - previous_close).abs()
    tr3 = (df["low"] - previous_close).abs()
    return pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)


def select_best_result(results: np.ndarray) -> np.ndarray | None:
    traded = results[results[:, 8] > 0]
    if len(traded) == 0:
        return None
    order = np.lexsort((traded[:, 5], traded[:, 7]))
    return traded[order[-1]]


def format_result_row(ticker: str, result: np.ndarray) -> list[str]:
    level_mask = int(result[0])
    aym = result[1]
    aym_limit = result[2]
    atr_distance = result[3]
    stoploss = result[4]
    levels_enabled = [(level_mask & (1 << bit)) != 0 for bit in range(5)]

    return [
        ticker,
        "1",
        *[bool_text(enabled) for enabled in levels_enabled],
        *["1" if enabled else "null" for enabled in levels_enabled],
        "FALSE",
        "null",
        bool_text(not np.isnan(aym)),
        number_or_null(aym),
        number_or_null(aym_limit),
        bool_text(not np.isnan(atr_distance)),
        number_or_null(atr_distance),
        bool_text(not np.isnan(stoploss)),
        number_or_null(stoploss),
        f"{result[5]:.2f}",
        f"{result[6]:.2f}",
        f"{result[7]:.2f}",
        str(int(result[8])),
        f"{result[9]:.2f}",
        f"{result[10]:.2f}",
        f"{result[11]:.2f}",
        f"{result[12]:.2f}",
        f"{result[13]:.2f}",
        f"{result[14]:.2f}",
        f"{result[15]:.1f}",
    ]


def bool_text(value: bool) -> str:
    return "TRUE" if value else "FALSE"


def number_or_null(value: float) -> str:
    if np.isnan(value):
        return "null"
    if float(value).is_integer():
        return str(int(value))
    return f"{value:.1f}"


if __name__ == "__main__":
    main()
