"""Purged expanding walk-forward folds and QE-v2 validation metrics."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Iterable

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, precision_recall_fscore_support


@dataclass(frozen=True)
class WalkForwardFold:
    test_year: int
    train_start: str
    train_end: str
    calibration_start: str
    calibration_end: str
    test_start: str
    test_end: str

    def to_dict(self) -> dict[str, str | int]:
        return asdict(self)


def _shift_session(sessions: pd.DatetimeIndex, date: pd.Timestamp, offset: int) -> pd.Timestamp:
    pos = sessions.searchsorted(date)
    pos = min(max(pos + offset, 0), len(sessions) - 1)
    return sessions[pos]


def make_walk_forward_folds(
    dates: Iterable[pd.Timestamp],
    first_test_year: int | None = None,
    last_test_year: int = 2024,
    purge_sessions: int = 20,
    embargo_sessions: int = 5,
) -> list[WalkForwardFold]:
    sessions = pd.DatetimeIndex(pd.to_datetime(pd.Series(dates).dropna().unique())).sort_values()
    years = sorted(set(sessions.year))
    if not years:
        return []
    start_year = first_test_year or max(min(years) + 2, 2016)
    folds: list[WalkForwardFold] = []
    for year in range(start_year, min(last_test_year, max(years)) + 1):
        train_candidates = sessions[sessions.year <= year - 2]
        calibration_candidates = sessions[sessions.year == year - 1]
        test_candidates = sessions[sessions.year == year]
        if len(train_candidates) <= purge_sessions or len(calibration_candidates) <= purge_sessions + embargo_sessions or not len(test_candidates):
            continue
        train_end = train_candidates[-(purge_sessions + 1)]
        calibration_start = calibration_candidates[min(embargo_sessions, len(calibration_candidates) - 1)]
        calibration_end = calibration_candidates[-(purge_sessions + 1)]
        test_start = test_candidates[min(embargo_sessions, len(test_candidates) - 1)]
        folds.append(WalkForwardFold(
            test_year=year,
            train_start=str(sessions[0].date()),
            train_end=str(train_end.date()),
            calibration_start=str(calibration_start.date()),
            calibration_end=str(calibration_end.date()),
            test_start=str(test_start.date()),
            test_end=str(test_candidates[-1].date()),
        ))
    return folds


def split_fold(frame: pd.DataFrame, fold: WalkForwardFold) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    dates = pd.to_datetime(frame["date"])
    train = frame[(dates >= fold.train_start) & (dates <= fold.train_end)].copy()
    calibration = frame[(dates >= fold.calibration_start) & (dates <= fold.calibration_end)].copy()
    test = frame[(dates >= fold.test_start) & (dates <= fold.test_end)].copy()
    return train, calibration, test


def reversal_metrics(frame: pd.DataFrame, prediction: pd.DataFrame, threshold: float = 0.5) -> dict[str, float]:
    metrics: dict[str, float] = {}
    for horizon in (3, 5, 10):
        actual = ((frame["event_observed"].astype(bool)) & (frame["event_time"] <= horizon)).astype(int).to_numpy()
        prob = prediction[f"p_reversal_{horizon}"].clip(1e-6, 1 - 1e-6).to_numpy()
        valid = np.isfinite(prob)
        if not valid.any():
            continue
        precision, recall, f1, _ = precision_recall_fscore_support(
            actual[valid], prob[valid] >= threshold, average="binary", zero_division=0
        )
        metrics[f"brier_{horizon}"] = float(brier_score_loss(actual[valid], prob[valid]))
        probability_error = prob[valid] - actual[valid]
        metrics[f"probability_mae_{horizon}"] = float(np.mean(np.abs(probability_error)))
        metrics[f"probability_rmse_{horizon}"] = float(np.sqrt(np.mean(probability_error ** 2)))
        metrics[f"precision_{horizon}"] = float(precision)
        metrics[f"recall_{horizon}"] = float(recall)
        metrics[f"f1_{horizon}"] = float(f1)
        metrics[f"calibration_gap_{horizon}"] = float(abs(prob[valid].mean() - actual[valid].mean()))
        if "target_event_type" in frame:
            event_types = frame["target_event_type"].astype(str).to_numpy()[valid]
            for event_type in ("bottom", "top"):
                event_mask = event_types == event_type
                if event_mask.any():
                    event_error = probability_error[event_mask]
                    metrics[f"{event_type}_probability_mae_{horizon}"] = float(np.mean(np.abs(event_error)))
                    metrics[f"{event_type}_probability_rmse_{horizon}"] = float(np.sqrt(np.mean(event_error ** 2)))
                    metrics[f"{event_type}_base_rate_{horizon}"] = float(actual[valid][event_mask].mean())
    for horizon in (5, 10, 20):
        actual = frame[f"target_return_{horizon}"].to_numpy(dtype=float)
        predicted = prediction[f"expected_return_{horizon}"].to_numpy(dtype=float)
        valid = np.isfinite(actual) & np.isfinite(predicted)
        if valid.any():
            error = predicted[valid] - actual[valid]
            metrics[f"return_mae_{horizon}"] = float(np.mean(np.abs(error)))
            metrics[f"return_rmse_{horizon}"] = float(np.sqrt(np.mean(error ** 2)))
    return metrics


def metric_dispersion(frame: pd.DataFrame, prediction: pd.DataFrame, group_column: str) -> dict[str, float]:
    if group_column not in frame or frame.empty:
        return {}
    values: list[float] = []
    for _, positions in frame.reset_index(drop=True).groupby(group_column).groups.items():
        position = np.asarray(list(positions), dtype=int)
        actual = ((frame.reset_index(drop=True).iloc[position]["event_observed"].astype(bool)) &
                  (frame.reset_index(drop=True).iloc[position]["event_time"] <= 5)).astype(int).to_numpy()
        probability = prediction.reset_index(drop=True).iloc[position]["p_reversal_5"].to_numpy(dtype=float)
        valid = np.isfinite(probability)
        if valid.any():
            values.append(float(np.mean((probability[valid] - actual[valid]) ** 2)))
    if not values:
        return {}
    return {
        "groups": float(len(values)), "mean_brier_5": float(np.mean(values)),
        "std_brier_5": float(np.std(values)), "p10_brier_5": float(np.quantile(values, 0.10)),
        "p90_brier_5": float(np.quantile(values, 0.90)),
    }


def ticker_diagnostics(frame: pd.DataFrame, prediction: pd.DataFrame) -> pd.DataFrame:
    """Per-ticker prediction errors used alongside economic backtest metrics."""
    truth = frame.reset_index(drop=True)
    predicted = prediction.reset_index(drop=True)
    rows: list[dict[str, float | str]] = []
    for ticker, positions in truth.groupby("ticker").groups.items():
        indices = np.asarray(list(positions), dtype=int)
        row: dict[str, float | str] = {"ticker": str(ticker)}
        actual_reversal = (
            truth.iloc[indices]["event_observed"].astype(bool)
            & (truth.iloc[indices]["event_time"] <= 5)
        ).astype(int).to_numpy()
        probability = predicted.iloc[indices]["p_reversal_5"].to_numpy(dtype=float)
        valid = np.isfinite(probability)
        row["brier_5"] = float(np.mean((probability[valid] - actual_reversal[valid]) ** 2)) if valid.any() else np.nan
        if valid.any():
            probability_error = probability[valid] - actual_reversal[valid]
            row["probability_mae_5"] = float(np.mean(np.abs(probability_error)))
            row["probability_rmse_5"] = float(np.sqrt(np.mean(probability_error ** 2)))
        else:
            row["probability_mae_5"] = np.nan
            row["probability_rmse_5"] = np.nan
        for horizon in (5, 10, 20):
            actual = truth.iloc[indices][f"target_return_{horizon}"].to_numpy(dtype=float)
            estimate = predicted.iloc[indices][f"expected_return_{horizon}"].to_numpy(dtype=float)
            valid = np.isfinite(actual) & np.isfinite(estimate)
            error = estimate[valid] - actual[valid]
            row[f"return_mae_{horizon}"] = float(np.mean(np.abs(error))) if len(error) else np.nan
            row[f"return_rmse_{horizon}"] = float(np.sqrt(np.mean(error ** 2))) if len(error) else np.nan
        for target, estimate in (("mfe_10", "expected_mfe_10"), ("mae_10", "expected_mae_10")):
            actual = truth.iloc[indices][target].to_numpy(dtype=float)
            values = predicted.iloc[indices][estimate].to_numpy(dtype=float)
            valid = np.isfinite(actual) & np.isfinite(values)
            error = values[valid] - actual[valid]
            row[f"{target}_prediction_mae"] = float(np.mean(np.abs(error))) if len(error) else np.nan
            row[f"{target}_prediction_rmse"] = float(np.sqrt(np.mean(error ** 2))) if len(error) else np.nan
        barrier_column = "p_barrier" if "p_barrier" in predicted else "barrier_probability"
        barrier_actual = truth.iloc[indices]["barrier_success"].to_numpy(dtype=float)
        barrier_probability = predicted.iloc[indices][barrier_column].to_numpy(dtype=float)
        valid = np.isfinite(barrier_actual) & np.isfinite(barrier_probability)
        row["barrier_accuracy"] = float(np.mean((barrier_probability[valid] >= 0.5) == barrier_actual[valid])) if valid.any() else np.nan
        rows.append(row)
    return pd.DataFrame(rows)


def discrete_survival_nll(frame: pd.DataFrame, daily_hazards: np.ndarray) -> float:
    """Negative log likelihood for a ten-session discrete survival head."""
    hazards = np.clip(np.asarray(daily_hazards, dtype=float), 1e-7, 1 - 1e-7)
    times = frame["event_time"].clip(1, hazards.shape[1]).to_numpy(dtype=int)
    observed = frame["event_observed"].astype(bool).to_numpy()
    losses = np.zeros(len(frame), dtype=float)
    for index, (time, event) in enumerate(zip(times, observed)):
        losses[index] = -np.log(1 - hazards[index, : time - int(event)]).sum()
        if event:
            losses[index] -= np.log(hazards[index, time - 1])
    return float(losses.mean()) if len(losses) else float("nan")


def paired_bootstrap_advantage(
    champion_loss: np.ndarray,
    benchmark_loss: np.ndarray,
    samples: int = 2_000,
    seed: int = 17,
) -> dict[str, float]:
    valid = np.isfinite(champion_loss) & np.isfinite(benchmark_loss)
    delta = benchmark_loss[valid] - champion_loss[valid]
    if not delta.size:
        return {"mean_advantage": float("nan"), "probability_positive": float("nan"), "ci_low": float("nan"), "ci_high": float("nan")}
    rng = np.random.default_rng(seed)
    draws = np.empty(samples)
    for index in range(samples):
        draws[index] = rng.choice(delta, size=len(delta), replace=True).mean()
    return {
        "mean_advantage": float(delta.mean()),
        "probability_positive": float((draws > 0).mean()),
        "ci_low": float(np.quantile(draws, 0.025)),
        "ci_high": float(np.quantile(draws, 0.975)),
    }


def evaluate_promotion_gates(summary: dict[str, float | int | bool]) -> dict[str, object]:
    gates = {
        "coverage": float(summary.get("coverage", 0)) >= 0.90,
        "beats_causal": bool(summary.get("beats_causal", False)),
        "beats_boosted_tree": bool(summary.get("beats_boosted_tree", False)),
        "multi_year_stability": int(summary.get("winning_years", 0)) >= 3,
        "positive_winsorized_excess": float(summary.get("winsorized_equal_weight_excess", -np.inf)) > 0,
        "breadth_improved": float(summary.get("b_and_h_beat_rate", 0)) > 0.50,
        "swing_capture_improved": bool(summary.get("swing_capture_improved", False)),
        "drawdown_guardrail": bool(summary.get("drawdown_guardrail", False)),
        "concentration_guardrail": float(summary.get("largest_ticker_gain_share", 1)) <= 0.25,
        "sealed_test_passed": bool(summary.get("sealed_test_passed", False)),
        "shadow_sessions": int(summary.get("shadow_sessions", 0)) >= 60,
    }
    return {"promoted": all(gates.values()), "gates": gates}
