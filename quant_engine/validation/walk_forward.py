"""Annual walk-forward folds with session-based purge and embargo gaps."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

import pandas as pd


@dataclass(frozen=True)
class WalkForwardFold:
    test_year: int
    train_dates: pd.DatetimeIndex
    calibration_dates: pd.DatetimeIndex
    test_dates: pd.DatetimeIndex

    def masks(self, dates: pd.Series) -> tuple[pd.Series, pd.Series, pd.Series]:
        normalized = pd.to_datetime(dates).dt.normalize()
        return (
            normalized.isin(self.train_dates),
            normalized.isin(self.calibration_dates),
            normalized.isin(self.test_dates),
        )


def _drop_boundary_sessions(dates: pd.DatetimeIndex, count: int) -> pd.DatetimeIndex:
    if count <= 0:
        return dates
    if len(dates) <= count:
        return dates[:0]
    return dates[:-count]


def annual_walk_forward_folds(
    dates: Iterable,
    *,
    first_test_year: int = 2021,
    train_years: int = 5,
    calibration_years: int = 1,
    label_horizon_bars: int = 64,
    embargo_bars: int = 5,
) -> list[WalkForwardFold]:
    """Return locked annual test folds using only observations available before each test year."""
    sessions = pd.DatetimeIndex(pd.to_datetime(pd.Series(dates)).dropna().dt.normalize().unique()).sort_values()
    if sessions.empty:
        return []
    if train_years <= 0 or calibration_years <= 0:
        raise ValueError("train_years and calibration_years must be positive")
    boundary_gap = label_horizon_bars + embargo_bars
    folds: list[WalkForwardFold] = []

    for test_year in range(first_test_year, int(sessions.max().year) + 1):
        test_start = pd.Timestamp(test_year, 1, 1)
        test_end = pd.Timestamp(test_year + 1, 1, 1)
        calibration_start = test_start - pd.DateOffset(years=calibration_years)
        train_start = calibration_start - pd.DateOffset(years=train_years)

        train = sessions[(sessions >= train_start) & (sessions < calibration_start)]
        calibration = sessions[(sessions >= calibration_start) & (sessions < test_start)]
        test = sessions[(sessions >= test_start) & (sessions < test_end)]
        train = _drop_boundary_sessions(train, boundary_gap)
        calibration = _drop_boundary_sessions(calibration, boundary_gap)
        if train.empty or calibration.empty or test.empty:
            continue
        folds.append(
            WalkForwardFold(
                test_year=test_year,
                train_dates=train,
                calibration_dates=calibration,
                test_dates=test,
            )
        )
    return folds
