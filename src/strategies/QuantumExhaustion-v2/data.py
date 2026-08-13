from __future__ import annotations

import json
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import numpy as np
import pandas as pd

from .config import DYNAMIC_FEATURES, QEConfig
from .swings import add_hierarchical_exhaustion, causal_price_swing_features, trailing_median_daily_move


PRICE_COLUMNS = ("open", "high", "low", "close", "volume")
REQUIRED_COLUMNS = ("ticker", "date", *PRICE_COLUMNS)


def _ema(values: pd.Series, span: int) -> pd.Series:
    return values.ewm(span=span, adjust=False, min_periods=span).mean()


def _rsi(values: pd.Series, period: int) -> pd.Series:
    delta = values.diff()
    gain = delta.clip(lower=0).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    rs = gain / loss.replace(0, np.nan)
    return (100 - 100 / (1 + rs)).fillna(50.0)


def true_range(frame: pd.DataFrame) -> pd.Series:
    previous = frame["close"].shift(1)
    return pd.concat(
        [
            frame["high"] - frame["low"],
            (frame["high"] - previous).abs(),
            (frame["low"] - previous).abs(),
        ],
        axis=1,
    ).max(axis=1)


def _atr(frame: pd.DataFrame, period: int = 14) -> pd.Series:
    return true_range(frame).ewm(alpha=1 / period, adjust=False, min_periods=period).mean()


def _adx(frame: pd.DataFrame, period: int = 14) -> tuple[pd.Series, pd.Series, pd.Series]:
    up = frame["high"].diff()
    down = -frame["low"].diff()
    plus_dm = up.where((up > down) & (up > 0), 0.0)
    minus_dm = down.where((down > up) & (down > 0), 0.0)
    atr = _atr(frame, period).replace(0, np.nan)
    plus = 100 * plus_dm.ewm(alpha=1 / period, adjust=False, min_periods=period).mean() / atr
    minus = 100 * minus_dm.ewm(alpha=1 / period, adjust=False, min_periods=period).mean() / atr
    dx = 100 * (plus - minus).abs() / (plus + minus).replace(0, np.nan)
    adx = dx.ewm(alpha=1 / period, adjust=False, min_periods=period).mean()
    return adx.fillna(0), plus.fillna(0), minus.fillna(0)


def compute_psi40(frame: pd.DataFrame) -> pd.Series:
    """Causal Python implementation of the platform's forty-condition PSI score."""

    close = frame["close"].astype(float)
    high = frame["high"].astype(float)
    low = frame["low"].astype(float)
    volume = frame["volume"].astype(float)
    rsi14, rsi7, rsi21 = _rsi(close, 14), _rsi(close, 7), _rsi(close, 21)
    ema12, ema26 = _ema(close, 12), _ema(close, 26)
    macd = ema12 - ema26
    macd_signal = _ema(macd, 9)
    low14 = low.rolling(14, min_periods=14).min()
    high14 = high.rolling(14, min_periods=14).max()
    stoch_k = 100 * (close - low14) / (high14 - low14).replace(0, np.nan)
    stoch_d = stoch_k.rolling(3, min_periods=3).mean()
    typical = (high + low + close) / 3
    typical_sma = typical.rolling(20, min_periods=20).mean()
    mean_dev = typical.rolling(20, min_periods=20).apply(
        lambda x: float(np.mean(np.abs(x - np.mean(x)))), raw=True
    )
    cci20 = (typical - typical_sma) / (0.015 * mean_dev.replace(0, np.nan))
    raw_money = typical * volume
    typical_delta = typical.diff()
    positive_money = raw_money.where(typical_delta > 0, 0).rolling(14, min_periods=14).sum()
    negative_money = raw_money.where(typical_delta < 0, 0).rolling(14, min_periods=14).sum()
    money_ratio = positive_money / negative_money.replace(0, np.nan)
    mfi14 = 100 - 100 / (1 + money_ratio)
    roc10 = close.pct_change(10) * 100
    williams14 = -100 * (high14 - close) / (high14 - low14).replace(0, np.nan)
    trix18 = _ema(_ema(_ema(close, 18), 18), 18).pct_change() * 100
    sma20 = close.rolling(20, min_periods=20).mean()
    sma50 = close.rolling(50, min_periods=50).mean()
    sma200 = close.rolling(200, min_periods=200).mean()
    ema20, ema50 = _ema(close, 20), _ema(close, 50)
    adx14, plus_di, minus_di = _adx(frame, 14)
    std20 = close.rolling(20, min_periods=20).std(ddof=0)
    bb20_mid, bb20_upper, bb20_lower = sma20, sma20 + 2 * std20, sma20 - 2 * std20
    bb50_mid = sma50
    atr14 = _atr(frame, 14)
    signed_volume = np.sign(close.diff()).fillna(0) * volume
    obv = signed_volume.cumsum()
    force13 = (close.diff() * volume).ewm(span=13, adjust=False, min_periods=13).mean()
    previous_hh20 = high.shift(1).rolling(20, min_periods=20).max()
    previous_ll20 = low.shift(1).rolling(20, min_periods=20).min()

    conditions = [
        rsi14 > 50,
        rsi7 > rsi14,
        rsi14 > rsi21,
        (macd - macd_signal) > 0,
        macd > 0,
        stoch_k > stoch_d,
        stoch_k > 50,
        cci20 > 0,
        mfi14 > 50,
        roc10 > 0,
        williams14 > -50,
        trix18 > 0,
        close > sma20,
        close > sma50,
        close > sma200,
        sma20 > sma50,
        sma50 > sma200,
        close > ema20,
        close > ema50,
        ema20 > ema50,
        plus_di > minus_di,
        (adx14 > 25) & (plus_di > minus_di),
        close > close.shift(1),
        close > close.shift(5),
        close > bb20_mid,
        close > bb20_upper,
        close > bb50_mid,
        close >= bb20_lower,
        atr14 > atr14.shift(5),
        atr14 > atr14.shift(20),
        (high - low) > atr14,
        close > (high + low) / 2,
        obv > obv.shift(1),
        obv > obv.shift(5),
        force13 > 0,
        force13 > force13.shift(1),
        close > (previous_hh20 + previous_ll20) / 2,
        close >= previous_hh20,
        close > previous_ll20 + (previous_hh20 - previous_ll20) * 0.75,
        close > previous_ll20 + (previous_hh20 - previous_ll20) * 0.25,
    ]
    score = sum(condition.fillna(False).astype(np.int16) for condition in conditions)
    return score.astype(float) * 2.5


@dataclass
class AuditResult:
    rows: int
    tickers: int
    start: str
    end: str
    duplicates: int
    invalid_ohlc: int
    null_values: int
    extreme_jumps: int
    eligible_tickers: int
    history_eligible_tickers: int
    clean_eligible_rows: int
    history_eligible_rows: int
    eligible_symbols: list[str]
    short_history_tickers: list[str]
    unresolved_tickers: list[str]

    def to_dict(self) -> dict[str, object]:
        return self.__dict__.copy()


def normalize_prices(frame: pd.DataFrame) -> pd.DataFrame:
    data = frame.copy()
    data.columns = [str(column).strip().lower() for column in data.columns]
    aliases = {"ticker_symbol": "ticker"}
    data = data.rename(columns=aliases)
    missing = [column for column in REQUIRED_COLUMNS if column not in data.columns]
    if missing:
        raise ValueError(f"Missing required price columns: {', '.join(missing)}")
    data["ticker"] = data["ticker"].astype(str).str.strip().str.upper().str.replace(".CA", "", regex=False)
    data["date"] = pd.to_datetime(data["date"], errors="coerce").dt.normalize()
    for column in PRICE_COLUMNS:
        data[column] = pd.to_numeric(data[column], errors="coerce")
    if "sector" not in data:
        data["sector"] = "Unknown"
    data["sector"] = data["sector"].fillna("Unknown").astype(str)
    return data.sort_values(["ticker", "date"]).reset_index(drop=True)


def load_prices(path: str | Path) -> pd.DataFrame:
    source = Path(path)
    if source.is_dir():
        pieces: list[pd.DataFrame] = []
        for csv_path in sorted(source.glob("*.csv")):
            piece = pd.read_csv(csv_path)
            if "ticker" not in piece.columns and "ticker_symbol" not in piece.columns:
                piece["ticker"] = csv_path.stem
            piece["source_file"] = csv_path.name
            pieces.append(piece)
        if not pieces:
            raise ValueError(f"No CSV price files found in {source}")
        return normalize_prices(pd.concat(pieces, ignore_index=True))
    if source.suffix.lower() == ".parquet":
        return normalize_prices(pd.read_parquet(source))
    return normalize_prices(pd.read_csv(source))


def load_database_prices(database_url: str | None = None) -> pd.DataFrame:
    import psycopg2

    connection_url = database_url or os.environ.get("DATABASE_URL")
    if not connection_url:
        raise ValueError("DATABASE_URL is required when --input is not supplied")
    query = """
        SELECT p.ticker_symbol AS ticker, p.date, p.open, p.high, p.low, p.close,
               p.volume, COALESCE(t.sector, 'Unknown') AS sector
        FROM daily_prices p
        LEFT JOIN tickers t ON t.symbol = p.ticker_symbol
        ORDER BY p.ticker_symbol, p.date
    """
    with psycopg2.connect(connection_url) as connection:
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [description.name for description in cursor.description]
            rows = cursor.fetchall()
    return normalize_prices(pd.DataFrame.from_records(rows, columns=columns))


def apply_adjustment_ledger(frame: pd.DataFrame, ledger_path: str | Path | None) -> tuple[pd.DataFrame, set[str]]:
    data = frame.copy()
    unresolved: set[str] = set()
    if ledger_path is None or not Path(ledger_path).exists():
        return data, unresolved
    entries = json.loads(Path(ledger_path).read_text(encoding="utf-8"))
    for entry in entries:
        ticker = str(entry["ticker"]).strip().upper().replace(".CA", "")
        if not entry.get("verified", False):
            unresolved.add(ticker)
            continue
        ex_date = pd.Timestamp(entry["effectiveDate"]).normalize()
        factor = float(entry["backAdjustmentFactor"])
        if factor <= 0:
            raise ValueError(f"Invalid adjustment factor for {ticker} on {ex_date.date()}")
        mask = (data["ticker"] == ticker) & (data["date"] < ex_date)
        data.loc[mask, ["open", "high", "low", "close"]] *= factor
        data.loc[mask, "volume"] /= factor
    return data, unresolved


def audit_prices(frame: pd.DataFrame, config: QEConfig, unresolved: Iterable[str] = ()) -> AuditResult:
    data = normalize_prices(frame)
    duplicate_count = int(data.duplicated(["ticker", "date"]).sum())
    invalid = (
        (data[["open", "high", "low", "close"]] <= 0).any(axis=1)
        | (data["high"] < data[["open", "close", "low"]].max(axis=1))
        | (data["low"] > data[["open", "close", "high"]].min(axis=1))
    )
    returns = data.groupby("ticker", sort=False)["close"].pct_change(fill_method=None)
    clean_rows = (~data.duplicated(["ticker", "date"])) & (~invalid) & (~data[list(REQUIRED_COLUMNS)].isna().any(axis=1))
    history = data.loc[clean_rows].groupby("ticker", sort=False).size()
    unresolved_set = set(unresolved)
    unresolved_set.update(data.loc[returns.abs() >= config.extreme_jump_threshold, "ticker"].unique())
    eligible = history[(history >= config.minimum_history) & ~history.index.isin(unresolved_set)]
    history_eligible = history[history >= config.minimum_history]
    return AuditResult(
        rows=len(data),
        tickers=int(data["ticker"].nunique()),
        start=str(data["date"].min().date()),
        end=str(data["date"].max().date()),
        duplicates=duplicate_count,
        invalid_ohlc=int(invalid.sum()),
        null_values=int(data[list(REQUIRED_COLUMNS)].isna().any(axis=1).sum()),
        extreme_jumps=int((returns.abs() >= config.extreme_jump_threshold).sum()),
        eligible_tickers=len(eligible),
        history_eligible_tickers=len(history_eligible),
        clean_eligible_rows=int(eligible.sum()),
        history_eligible_rows=int(history_eligible.sum()),
        eligible_symbols=sorted(eligible.index.astype(str).tolist()),
        short_history_tickers=sorted(history[history < config.minimum_history].index.astype(str).tolist()),
        unresolved_tickers=sorted(unresolved_set),
    )


def _ticker_features(group: pd.DataFrame, config: QEConfig) -> pd.DataFrame:
    data = group.sort_values("date").copy()
    data["psi40"] = compute_psi40(data)
    close = data["close"]
    data["median_daily_move"] = trailing_median_daily_move(close, config)
    data["swing_threshold"] = (
        config.swing_threshold_multiplier * data["median_daily_move"]
    ).clip(lower=config.swing_threshold_floor)
    swings = causal_price_swing_features(data, config)
    data = pd.concat([data, swings], axis=1)
    data["psi_delta_1"] = data["psi40"].diff()
    data["psi_delta_5"] = data["psi40"].diff(5)
    data["psi_acceleration"] = data["psi_delta_1"].diff()
    for period in (1, 5, 10, 20):
        data[f"return_{period}"] = close.pct_change(period, fill_method=None)
    data["atr14"] = _atr(data, 14)
    data["atr_pct"] = data["atr14"] / close.replace(0, np.nan)
    data["volatility_20"] = data["return_1"].rolling(20, min_periods=20).std(ddof=0)
    data["volatility_60"] = data["return_1"].rolling(60, min_periods=60).std(ddof=0)
    mean_volume = data["volume"].shift(1).rolling(20, min_periods=5).mean()
    data["volume_ratio_20"] = data["volume"] / mean_volume.replace(0, np.nan)
    data["log_turnover"] = np.log1p((data["close"] * data["volume"]).clip(lower=0))
    data["price_to_ema20"] = close / _ema(close, 20) - 1
    data["price_to_ema50"] = close / _ema(close, 50) - 1
    data["price_to_sma200"] = close / close.rolling(200, min_periods=200).mean() - 1
    data["psi_hook"] = np.sign(data["psi_delta_1"]).fillna(0)
    return data


def _add_labels(group: pd.DataFrame, config: QEConfig) -> pd.DataFrame:
    data = group.sort_values("date").reset_index(drop=True).copy()
    direction = data["psi_direction"].to_numpy(dtype=int)
    close = data["close"].to_numpy(dtype=float)
    high = data["high"].to_numpy(dtype=float)
    low = data["low"].to_numpy(dtype=float)
    median_move = data["median_daily_move"].to_numpy(dtype=float)
    n = len(data)
    event_time = np.full(n, config.max_horizon, dtype=np.int16)
    observed = np.zeros(n, dtype=np.int8)
    survival_available = np.zeros(n, dtype=np.int8)
    barrier = np.full(n, np.nan, dtype=np.float32)
    mfe = np.full(n, np.nan, dtype=np.float32)
    mae = np.full(n, np.nan, dtype=np.float32)
    target_event_type = np.full(n, "none", dtype=object)
    target_pivot_date = np.full(n, np.datetime64("NaT"), dtype="datetime64[ns]")

    pivot_events: dict[int, list[tuple[int, int, pd.Timestamp]]] = {1: [], -1: []}
    for confirmation_index, row in data[data["pivot_confirmation"] == 1].iterrows():
        pivot_index = int(row["confirmed_pivot_index"])
        pivot_type = int(row["confirmed_pivot_type"])
        pivot_events[pivot_type].append(
            (pivot_index, int(confirmation_index), pd.Timestamp(data.at[pivot_index, "date"]))
        )
    pivot_arrays = {
        pivot_type: (
            np.asarray([event[0] for event in events], dtype=np.int32),
            np.asarray([event[1] for event in events], dtype=np.int32),
            [event[2] for event in events],
        )
        for pivot_type, events in pivot_events.items()
    }

    for index in range(n):
        current_direction = direction[index]
        if current_direction == 0 or index + 1 >= n:
            continue
        target_type = 1 if current_direction > 0 else -1
        target_event_type[index] = "top" if target_type > 0 else "bottom"
        pivot_indices, confirmation_indices, pivot_dates = pivot_arrays[target_type]
        position = int(np.searchsorted(confirmation_indices, index, side="left"))
        while position < len(pivot_indices) and pivot_indices[position] < index - config.pivot_label_tolerance:
            position += 1
        candidate = (
            (int(pivot_indices[position]), int(confirmation_indices[position]), pivot_dates[position])
            if position < len(pivot_indices) else None
        )
        if (
            candidate is not None
            and candidate[0] <= index + config.max_horizon
            and candidate[1] <= index + config.max_horizon
        ):
            event_time[index] = max(1, int(candidate[0] - index))
            observed[index] = 1
            survival_available[index] = 1
            target_pivot_date[index] = np.datetime64(candidate[2])
        elif index + config.max_horizon < n:
            survival_available[index] = 1
        end = min(n, index + config.max_horizon + 1)
        future_high = high[index + 1 : end]
        future_low = low[index + 1 : end]
        if (
            index + config.max_horizon >= n
            or future_high.size == 0
            or not np.isfinite(median_move[index])
            or median_move[index] <= 0
        ):
            continue
        mfe[index] = float(np.nanmax(future_high / close[index] - 1.0))
        mae[index] = float(np.nanmin(future_low / close[index] - 1.0))
        action_side = -current_direction
        barrier_distance = close[index] * max(
            config.swing_threshold_floor,
            config.swing_threshold_multiplier * median_move[index],
        )
        for step in range(len(future_high)):
            favorable_move = (
                future_high[step] - close[index] if action_side > 0 else close[index] - future_low[step]
            )
            adverse_move = (
                close[index] - future_low[step] if action_side > 0 else future_high[step] - close[index]
            )
            if adverse_move >= barrier_distance:
                barrier[index] = 0.0
                break
            if favorable_move >= barrier_distance:
                barrier[index] = 1.0
                break

    data["event_time"] = event_time
    data["event_observed"] = observed
    data["survival_label_available"] = survival_available
    data["target_event_type"] = target_event_type
    data["target_pivot_date"] = target_pivot_date
    data["barrier_success"] = barrier
    data["mfe_10"] = mfe
    data["mae_10"] = mae
    for horizon in config.return_horizons:
        data[f"target_return_{horizon}"] = data["close"].shift(-horizon) / data["close"] - 1
    return data


def build_causal_dataset(frame: pd.DataFrame, config: QEConfig) -> pd.DataFrame:
    data = normalize_prices(frame).drop_duplicates(["ticker", "date"], keep="last")
    valid = (
        (data[["open", "high", "low", "close"]] > 0).all(axis=1)
        & (data["high"] >= data[["open", "close", "low"]].max(axis=1))
        & (data["low"] <= data[["open", "close", "high"]].min(axis=1))
    )
    data = data.loc[valid].copy()
    counts = data.groupby("ticker").size()
    data = data[data["ticker"].isin(counts[counts >= config.minimum_history].index)]
    pieces = [_ticker_features(group, config) for _, group in data.groupby("ticker", sort=False)]
    featured = pd.concat(pieces, ignore_index=True)
    daily = featured.groupby("date")["return_1"]
    context = pd.DataFrame(
        {
            "market_breadth": daily.apply(lambda values: float((values > 0).mean())),
            "market_median_return": daily.median(),
            "market_volatility": daily.std(ddof=0),
        }
    ).reset_index()
    featured = featured.merge(context, on="date", how="left", validate="many_to_one")
    volatility_cutoff = featured["market_volatility"].expanding(min_periods=60).median()
    featured["market_regime"] = np.select(
        [
            (featured["market_breadth"] < 0.40) & (featured["market_volatility"] > volatility_cutoff),
            featured["market_breadth"] > 0.60,
        ],
        ["risk_off", "risk_on"],
        default="neutral",
    )
    featured = add_hierarchical_exhaustion(featured, config)
    labeled = pd.concat(
        [_add_labels(group, config) for _, group in featured.groupby("ticker", sort=False)], ignore_index=True
    )
    labeled.replace([np.inf, -np.inf], np.nan, inplace=True)
    labeled[list(DYNAMIC_FEATURES)] = labeled[list(DYNAMIC_FEATURES)].fillna(0.0)
    return labeled.sort_values(["ticker", "date"]).reset_index(drop=True)
