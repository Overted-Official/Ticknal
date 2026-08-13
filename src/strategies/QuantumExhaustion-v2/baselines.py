"""Mandatory causal and boosted-tree benchmarks for QE-v2.

The deep sequence model is never evaluated in isolation.  These estimators use
the same rows, causal features, labels, and walk-forward boundaries as the TCN.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable

import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier, DummyRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression, Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from .config import DYNAMIC_FEATURES


REVERSAL_HORIZONS = (3, 5, 10)
RETURN_HORIZONS = (5, 10, 20)


def _numeric_matrix(frame: pd.DataFrame, features: Iterable[str]) -> np.ndarray:
    return frame.reindex(columns=list(features)).replace([np.inf, -np.inf], np.nan).to_numpy(dtype=np.float32)


def _binary_target(frame: pd.DataFrame, horizon: int) -> np.ndarray:
    return ((frame["event_observed"].astype(bool)) & (frame["event_time"] <= horizon)).astype(np.int8).to_numpy()


def _fit_classifier(model: Any, x: np.ndarray, y: np.ndarray) -> Any:
    if not y.size:
        return DummyClassifier(strategy="constant", constant=0).fit(np.zeros((1, x.shape[1])), [0])
    if np.unique(y).size < 2:
        model = DummyClassifier(strategy="constant", constant=int(y[0]) if y.size else 0)
    return model.fit(x, y)


def _fit_regressor(model: Any, x: np.ndarray, y: np.ndarray) -> Any:
    valid = np.isfinite(y)
    if not valid.any():
        return DummyRegressor(strategy="constant", constant=0.0).fit(np.zeros((1, x.shape[1])), [0.0])
    return model.fit(x[valid], y[valid])


def _positive_probability(model: Any, x: np.ndarray) -> np.ndarray:
    probabilities = model.predict_proba(x)
    classes = np.asarray(model.classes_)
    positive = np.flatnonzero(classes == 1)
    return probabilities[:, int(positive[0])] if positive.size else np.zeros(len(x), dtype=float)


@dataclass
class EmpiricalExhaustionBaseline:
    """Original-QE benchmark: price-pivot PSI-delta CDF plus direction-aware hook."""

    def fit(self, frame: pd.DataFrame) -> "EmpiricalExhaustionBaseline":
        return self

    def predict(self, frame: pd.DataFrame) -> pd.DataFrame:
        exhaustion = frame["exhaustion_percentile"].clip(0, 100).fillna(50).to_numpy() / 100.0
        hook = frame["psi_delta_1"].fillna(0).to_numpy()
        direction = frame["psi_direction"].fillna(0).to_numpy()
        alignment = np.where(direction > 0, -hook, hook)
        p5 = np.clip(0.65 * exhaustion + 0.35 / (1.0 + np.exp(-alignment / 2.0)), 0.01, 0.99)
        out = pd.DataFrame(index=frame.index)
        out["p_reversal_3"] = np.clip(p5 * 0.68, 0.005, 0.99)
        out["p_reversal_5"] = p5
        out["p_reversal_10"] = np.clip(p5 + (1.0 - p5) * 0.45, 0.01, 0.995)
        for horizon in RETURN_HORIZONS:
            out[f"expected_return_{horizon}"] = 0.0
        out["p_barrier"] = 0.5
        out["expected_mfe_10"] = 0.0
        out["expected_mae_10"] = 0.0
        return out


@dataclass
class LogisticHazardBaseline:
    """Regularized person-period discrete-time hazard and ridge return baseline."""

    features: tuple[str, ...] = DYNAMIC_FEATURES
    hazard_model: Any | None = None
    regressors: dict[int, Any] = field(default_factory=dict)
    barrier: Any | None = None
    excursions: dict[str, Any] = field(default_factory=dict)

    def fit(self, frame: pd.DataFrame) -> "LogisticHazardBaseline":
        x = _numeric_matrix(frame, self.features)
        event_time = frame["event_time"].clip(1, 10).to_numpy(dtype=int)
        observed = frame["event_observed"].astype(bool).to_numpy()
        repeats = event_time
        expanded = np.repeat(x, repeats, axis=0)
        steps = np.concatenate([np.arange(1, time + 1) for time in event_time]).astype(np.float32)
        expanded = np.column_stack([expanded, steps / 10.0, (steps / 10.0) ** 2])
        target = np.concatenate([
            np.asarray([0] * (time - 1) + [int(event)], dtype=np.int8)
            for time, event in zip(event_time, observed)
        ])
        if len(target) > 750_000:
            rng = np.random.default_rng(17)
            selected = np.sort(rng.choice(len(target), size=750_000, replace=False))
            expanded, target = expanded[selected], target[selected]
        hazard_pipe = Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
            ("model", LogisticRegression(C=0.2, max_iter=1_000, class_weight="balanced")),
        ])
        self.hazard_model = _fit_classifier(hazard_pipe, expanded, target)
        for horizon in RETURN_HORIZONS:
            pipe = Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
                ("model", Ridge(alpha=10.0)),
            ])
            y = frame[f"target_return_{horizon}"].to_numpy(dtype=np.float32)
            self.regressors[horizon] = _fit_regressor(pipe, x, y)
        barrier_valid = frame["barrier_success"].notna().to_numpy()
        barrier_y = frame.loc[barrier_valid, "barrier_success"].astype(int).to_numpy()
        barrier_pipe = Pipeline([
            ("impute", SimpleImputer(strategy="median")),
            ("scale", StandardScaler()),
            ("model", LogisticRegression(C=0.2, max_iter=1_000, class_weight="balanced")),
        ])
        self.barrier = _fit_classifier(barrier_pipe, x[barrier_valid], barrier_y)
        for name in ("mfe_10", "mae_10"):
            pipe = Pipeline([
                ("impute", SimpleImputer(strategy="median")),
                ("scale", StandardScaler()),
                ("model", Ridge(alpha=10.0)),
            ])
            self.excursions[name] = _fit_regressor(pipe, x, frame[name].to_numpy(dtype=np.float32))
        return self

    def predict(self, frame: pd.DataFrame) -> pd.DataFrame:
        x = _numeric_matrix(frame, self.features)
        out = pd.DataFrame(index=frame.index)
        steps = np.tile(np.arange(1, 11, dtype=np.float32), len(x))
        expanded = np.repeat(x, 10, axis=0)
        expanded = np.column_stack([expanded, steps / 10.0, (steps / 10.0) ** 2])
        daily_hazard = _positive_probability(self.hazard_model, expanded).reshape(len(x), 10)
        cumulative = 1 - np.cumprod(1 - daily_hazard, axis=1)
        for day in range(10):
            out[f"hazard_probability_{day + 1}"] = daily_hazard[:, day]
        for horizon in REVERSAL_HORIZONS:
            out[f"p_reversal_{horizon}"] = cumulative[:, horizon - 1]
        for horizon, model in self.regressors.items():
            out[f"expected_return_{horizon}"] = model.predict(x)
        out["p_barrier"] = _positive_probability(self.barrier, x)
        out["expected_mfe_10"] = self.excursions["mfe_10"].predict(x)
        out["expected_mae_10"] = self.excursions["mae_10"].predict(x)
        return out


@dataclass
class BoostedTreeBaseline:
    """CatBoost or XGBoost benchmark trained on the causal tabular snapshot."""

    engine: str = "catboost"
    features: tuple[str, ...] = DYNAMIC_FEATURES
    random_state: int = 17
    classifiers: dict[int, Any] = field(default_factory=dict)
    regressors: dict[int, Any] = field(default_factory=dict)
    barrier: Any | None = None
    excursions: dict[str, Any] = field(default_factory=dict)

    def _classifier(self) -> Any:
        if self.engine == "catboost":
            from catboost import CatBoostClassifier
            return CatBoostClassifier(iterations=350, depth=6, learning_rate=0.04, loss_function="Logloss",
                                      verbose=False, random_seed=self.random_state, allow_writing_files=False)
        if self.engine == "xgboost":
            from xgboost import XGBClassifier
            return XGBClassifier(n_estimators=350, max_depth=5, learning_rate=0.04, subsample=0.8,
                                 colsample_bytree=0.8, objective="binary:logistic", eval_metric="logloss",
                                 random_state=self.random_state, n_jobs=-1)
        raise ValueError(f"Unsupported boosted-tree engine: {self.engine}")

    def _regressor(self) -> Any:
        if self.engine == "catboost":
            from catboost import CatBoostRegressor
            return CatBoostRegressor(iterations=350, depth=6, learning_rate=0.04, loss_function="Huber:delta=1.0",
                                     verbose=False, random_seed=self.random_state, allow_writing_files=False)
        from xgboost import XGBRegressor
        return XGBRegressor(n_estimators=350, max_depth=5, learning_rate=0.04, subsample=0.8,
                            colsample_bytree=0.8, objective="reg:squarederror", random_state=self.random_state,
                            n_jobs=-1)

    def fit(self, frame: pd.DataFrame) -> "BoostedTreeBaseline":
        x = _numeric_matrix(frame, self.features)
        # Tree libraries handle NaNs directly; constant labels still need a safe fallback.
        for horizon in REVERSAL_HORIZONS:
            self.classifiers[horizon] = _fit_classifier(self._classifier(), x, _binary_target(frame, horizon))
        for horizon in RETURN_HORIZONS:
            self.regressors[horizon] = _fit_regressor(
                self._regressor(), x, frame[f"target_return_{horizon}"].to_numpy(dtype=np.float32)
            )
        valid = frame["barrier_success"].notna().to_numpy()
        self.barrier = _fit_classifier(self._classifier(), x[valid], frame.loc[valid, "barrier_success"].astype(int).to_numpy())
        for name in ("mfe_10", "mae_10"):
            self.excursions[name] = _fit_regressor(self._regressor(), x, frame[name].to_numpy(dtype=np.float32))
        return self

    def predict(self, frame: pd.DataFrame) -> pd.DataFrame:
        x = _numeric_matrix(frame, self.features)
        out = pd.DataFrame(index=frame.index)
        for horizon, model in self.classifiers.items():
            out[f"p_reversal_{horizon}"] = _positive_probability(model, x)
        probs = np.maximum.accumulate(out[[f"p_reversal_{h}" for h in REVERSAL_HORIZONS]].to_numpy(), axis=1)
        out[[f"p_reversal_{h}" for h in REVERSAL_HORIZONS]] = probs
        for horizon, model in self.regressors.items():
            out[f"expected_return_{horizon}"] = model.predict(x)
        out["p_barrier"] = _positive_probability(self.barrier, x)
        out["expected_mfe_10"] = self.excursions["mfe_10"].predict(x)
        out["expected_mae_10"] = self.excursions["mae_10"].predict(x)
        return out
