import numpy as np
import pandas as pd

from quant_engine.data.quality import annotate_discontinuities, normalize_prices, normalize_tickers
from quant_engine.features import FEATURE_COLUMNS, build_causal_features, model_matrix


def _history(periods=280):
    index = np.arange(periods)
    close = 10 + index * 0.02 + np.sin(index / 10) * 0.2
    frame = pd.DataFrame(
        {
            "ticker_symbol": "AAA",
            "date": pd.bdate_range("2020-01-01", periods=periods),
            "open": close * 0.998,
            "high": close * 1.01,
            "low": close * 0.99,
            "close": close,
            "volume": 2_000_000 + index * 100,
        }
    )
    return annotate_discontinuities(normalize_prices(frame))


def test_appending_future_rows_does_not_change_past_features():
    complete = _history(300)
    truncated = complete.iloc[:270].copy()
    tickers = normalize_tickers(pd.DataFrame({"symbol": ["AAA"], "sector": ["Banks"]}))
    before = build_causal_features(truncated, tickers).set_index(["ticker_symbol", "date"])
    after = build_causal_features(complete, tickers).set_index(["ticker_symbol", "date"]).loc[before.index]
    pd.testing.assert_frame_equal(before[list(FEATURE_COLUMNS)], after[list(FEATURE_COLUMNS)])


def test_model_matrix_excludes_identity_and_raw_ohlcv():
    frame = build_causal_features(_history(), normalize_tickers(pd.DataFrame({"symbol": ["AAA"], "sector": ["Banks"]})))
    frame["entry_signal"] = True
    matrix = model_matrix(frame)
    assert "close" not in matrix.columns
    assert "volume" not in matrix.columns
    assert "sector" not in matrix.columns
    assert set(FEATURE_COLUMNS).issubset(matrix.columns)
