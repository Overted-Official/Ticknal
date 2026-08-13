from __future__ import annotations

import numpy as np
import pandas as pd
import pytest


@pytest.fixture
def price_frame() -> pd.DataFrame:
    rng = np.random.default_rng(17)
    dates = pd.bdate_range("2020-01-01", periods=330)
    frames = []
    for number, ticker in enumerate(("AAA", "BBB")):
        returns = rng.normal(0.0005 + number * 0.0001, 0.012, len(dates))
        close = (50 + number * 20) * np.exp(np.cumsum(returns))
        open_price = close * (1 + rng.normal(0, 0.002, len(dates)))
        high = np.maximum(open_price, close) * (1 + rng.uniform(0.001, 0.012, len(dates)))
        low = np.minimum(open_price, close) * (1 - rng.uniform(0.001, 0.012, len(dates)))
        frames.append(pd.DataFrame({
            "ticker": ticker, "date": dates, "open": open_price, "high": high,
            "low": low, "close": close, "volume": rng.integers(50_000, 500_000, len(dates)),
            "sector": "Test Sector",
        }))
    return pd.concat(frames, ignore_index=True)
