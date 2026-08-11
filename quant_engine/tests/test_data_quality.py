import pandas as pd
import pytest

from quant_engine.data.quality import (
    DataQualityError,
    add_point_in_time_eligibility,
    annotate_discontinuities,
    normalize_prices,
    normalize_tickers,
    require_usable,
    validate_prices,
)


def _prices(closes):
    dates = pd.date_range("2020-01-01", periods=len(closes), freq="D")
    return pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "date": dates,
            "open": closes,
            "high": [value * 1.01 for value in closes],
            "low": [value * 0.99 for value in closes],
            "close": closes,
            "volume": 2_000_000,
        }
    )


def test_normalize_prices_accepts_legacy_ticker_column():
    raw = _prices([10, 11]).rename(columns={"ticker_symbol": "tickerSymbol"})
    normalized = normalize_prices(raw)
    assert list(normalized.columns) == ["ticker_symbol", "date", "open", "high", "low", "close", "volume"]
    assert normalized.loc[0, "ticker_symbol"] == "AAA"


def test_duplicate_grain_is_critical():
    prices = normalize_prices(pd.concat([_prices([10]), _prices([10])], ignore_index=True))
    report = validate_prices(prices)
    assert not report.is_usable
    with pytest.raises(DataQualityError):
        require_usable(report)


def test_discontinuity_starts_new_segment():
    marked = annotate_discontinuities(normalize_prices(_prices([10, 11, 30, 31])))
    assert marked["is_discontinuity"].tolist() == [False, False, True, False]
    assert marked["segment_id"].tolist() == ["AAA:0", "AAA:0", "AAA:1", "AAA:1"]


def test_point_in_time_eligibility_does_not_change_past_when_future_is_appended():
    base = annotate_discontinuities(normalize_prices(_prices([10 + i * 0.01 for i in range(260)])))
    tickers = normalize_tickers(pd.DataFrame({"symbol": ["AAA"], "sector": ["Banks"]}))
    before = add_point_in_time_eligibility(base, tickers)

    future = _prices([12.6] * 20)
    future["date"] = pd.date_range(base["date"].max() + pd.Timedelta(days=1), periods=20, freq="D")
    future["volume"] = 0
    combined = annotate_discontinuities(normalize_prices(pd.concat([base.iloc[:, :7], future], ignore_index=True)))
    after = add_point_in_time_eligibility(combined, tickers)

    pd.testing.assert_series_equal(
        before.set_index("date")["is_eligible"],
        after.loc[after["date"].isin(before["date"])].set_index("date")["is_eligible"],
        check_names=False,
    )
