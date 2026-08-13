from __future__ import annotations

import copy
import json
import math
import os
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable, Literal

import joblib
import numpy as np
import pandas as pd
import torch
from sklearn.linear_model import LogisticRegression
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader, Dataset

from .config import DYNAMIC_FEATURES, QEConfig


def set_deterministic_seed(seed: int) -> None:
    os.environ.setdefault("CUBLAS_WORKSPACE_CONFIG", ":4096:8")
    random.seed(seed)
    np.random.seed(seed)
    torch.manual_seed(seed)
    if torch.cuda.is_available():
        torch.cuda.manual_seed_all(seed)
    torch.use_deterministic_algorithms(True, warn_only=True)


@dataclass
class FeatureScaler:
    columns: tuple[str, ...]
    mean: np.ndarray
    scale: np.ndarray

    @classmethod
    def fit(cls, frame: pd.DataFrame, columns: tuple[str, ...] = DYNAMIC_FEATURES) -> "FeatureScaler":
        values = frame.loc[:, columns].to_numpy(dtype=np.float64)
        mean = np.nanmean(values, axis=0)
        scale = np.nanstd(values, axis=0)
        scale[~np.isfinite(scale) | (scale < 1e-8)] = 1.0
        mean[~np.isfinite(mean)] = 0.0
        return cls(columns=columns, mean=mean.astype(np.float32), scale=scale.astype(np.float32))

    def transform(self, frame: pd.DataFrame) -> np.ndarray:
        values = frame.loc[:, self.columns].to_numpy(dtype=np.float32)
        values = np.nan_to_num(values, nan=0.0, posinf=0.0, neginf=0.0)
        return (values - self.mean) / self.scale

    def to_dict(self) -> dict[str, Any]:
        return {"columns": list(self.columns), "mean": self.mean.tolist(), "scale": self.scale.tolist()}

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "FeatureScaler":
        return cls(
            columns=tuple(payload["columns"]),
            mean=np.asarray(payload["mean"], dtype=np.float32),
            scale=np.asarray(payload["scale"], dtype=np.float32),
        )


@dataclass(frozen=True)
class LossScales:
    """Training-fold-only robust scales put heterogeneous targets on comparable units."""

    returns: tuple[float, float, float]
    excursions: tuple[float, float]

    @classmethod
    def fit(cls, frame: pd.DataFrame) -> "LossScales":
        def robust(column: str) -> float:
            values = frame[column].to_numpy(dtype=float)
            values = values[np.isfinite(values)]
            if not len(values):
                return 1.0
            scale = float(np.quantile(np.abs(values - np.median(values)), 0.75))
            return max(scale, 1e-4)
        return cls(
            tuple(robust(f"target_return_{horizon}") for horizon in (5, 10, 20)),
            (robust("mfe_10"), robust("mae_10")),
        )

    def to_dict(self) -> dict[str, list[float]]:
        return {"returns": list(self.returns), "excursions": list(self.excursions)}


@dataclass(frozen=True)
class CategoryMaps:
    ticker: dict[str, int]
    sector: dict[str, int]

    @classmethod
    def fit(cls, frame: pd.DataFrame) -> "CategoryMaps":
        ticker = {value: index + 1 for index, value in enumerate(sorted(frame["ticker"].astype(str).unique()))}
        sector = {value: index + 1 for index, value in enumerate(sorted(frame["sector"].astype(str).unique()))}
        return cls(ticker=ticker, sector=sector)

    def encode_ticker(self, value: str) -> int:
        return self.ticker.get(str(value), 0)

    def encode_sector(self, value: str) -> int:
        return self.sector.get(str(value), 0)


class SequenceDataset(Dataset):
    """Ticker-safe causal sequences whose target is the final row."""

    def __init__(
        self,
        frame: pd.DataFrame,
        scaler: FeatureScaler,
        categories: CategoryMaps,
        sequence_length: int,
        eligible_dates: set[pd.Timestamp] | None = None,
        require_labels: bool = False,
    ) -> None:
        ordered = frame.sort_values(["ticker", "date"]).reset_index(drop=True).copy()
        self.frame = ordered
        self.features = scaler.transform(ordered)
        self.ticker_ids = ordered["ticker"].map(categories.encode_ticker).to_numpy(dtype=np.int64)
        self.sector_ids = ordered["sector"].map(categories.encode_sector).to_numpy(dtype=np.int64)
        self.event_times = ordered["event_time"].fillna(10).to_numpy(dtype=np.int64)
        self.event_observed = ordered["event_observed"].fillna(0).to_numpy(dtype=np.float32)
        self.return_values = ordered[[f"target_return_{horizon}" for horizon in (5, 10, 20)]].to_numpy(dtype=np.float32)
        self.return_masks = np.isfinite(self.return_values)
        self.return_values = np.nan_to_num(self.return_values, nan=0.0)
        self.excursion_values = ordered[["mfe_10", "mae_10"]].to_numpy(dtype=np.float32)
        self.excursion_masks = np.isfinite(self.excursion_values)
        self.excursion_values = np.nan_to_num(self.excursion_values, nan=0.0)
        self.barrier_values = ordered["barrier_success"].to_numpy(dtype=np.float32)
        self.barrier_masks = np.isfinite(self.barrier_values)
        self.barrier_values = np.nan_to_num(self.barrier_values, nan=0.0)
        self.rank_targets = ordered["target_return_10"].fillna(0).to_numpy(dtype=np.float32)
        self.date_ids = (pd.to_datetime(ordered["date"]).astype("int64") // 86_400_000_000_000).to_numpy(dtype=np.int64)
        self.sequence_length = sequence_length
        self.ends: list[int] = []
        for _, group in ordered.groupby("ticker", sort=False):
            indices = group.index.to_numpy()
            for offset in range(sequence_length - 1, len(indices)):
                end = int(indices[offset])
                if eligible_dates is not None and pd.Timestamp(ordered.at[end, "date"]) not in eligible_dates:
                    continue
                if require_labels and not bool(ordered.at[end, "survival_label_available"]):
                    continue
                self.ends.append(end)

    def __len__(self) -> int:
        return len(self.ends)

    def __getitem__(self, item: int) -> dict[str, torch.Tensor]:
        end = self.ends[item]
        start = end - self.sequence_length + 1
        return {
            "x": torch.from_numpy(self.features[start : end + 1]).float(),
            "ticker": torch.tensor(self.ticker_ids[end], dtype=torch.long),
            "sector": torch.tensor(self.sector_ids[end], dtype=torch.long),
            "event_time": torch.tensor(self.event_times[end], dtype=torch.long),
            "event_observed": torch.tensor(self.event_observed[end], dtype=torch.float32),
            "returns": torch.from_numpy(self.return_values[end]),
            "return_mask": torch.from_numpy(self.return_masks[end]),
            "excursions": torch.from_numpy(self.excursion_values[end]),
            "excursion_mask": torch.from_numpy(self.excursion_masks[end]),
            "barrier": torch.tensor(self.barrier_values[end], dtype=torch.float32),
            "barrier_mask": torch.tensor(bool(self.barrier_masks[end]), dtype=torch.bool),
            "rank_target": torch.tensor(self.rank_targets[end], dtype=torch.float32),
            "date_id": torch.tensor(self.date_ids[end], dtype=torch.long),
            "row_index": torch.tensor(end, dtype=torch.long),
        }


def sequence_batch(dataset: SequenceDataset, ends: np.ndarray) -> dict[str, torch.Tensor]:
    """Vectorized batch materialization; avoids Python work per sequence."""
    ends = np.asarray(ends, dtype=np.int64)
    offsets = np.arange(dataset.sequence_length - 1, -1, -1, dtype=np.int64)
    sequence_indices = ends[:, None] - offsets[None, :]
    return {
        "x": torch.from_numpy(dataset.features[sequence_indices]).float(),
        "ticker": torch.from_numpy(dataset.ticker_ids[ends]),
        "sector": torch.from_numpy(dataset.sector_ids[ends]),
        "event_time": torch.from_numpy(dataset.event_times[ends]),
        "event_observed": torch.from_numpy(dataset.event_observed[ends]),
        "returns": torch.from_numpy(dataset.return_values[ends]),
        "return_mask": torch.from_numpy(dataset.return_masks[ends]),
        "excursions": torch.from_numpy(dataset.excursion_values[ends]),
        "excursion_mask": torch.from_numpy(dataset.excursion_masks[ends]),
        "barrier": torch.from_numpy(dataset.barrier_values[ends]),
        "barrier_mask": torch.from_numpy(dataset.barrier_masks[ends]),
        "rank_target": torch.from_numpy(dataset.rank_targets[ends]),
        "date_id": torch.from_numpy(dataset.date_ids[ends]),
        "row_index": torch.from_numpy(ends),
    }


class CausalConv1d(nn.Conv1d):
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.left_padding = self.dilation[0] * (self.kernel_size[0] - 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return super().forward(F.pad(x, (self.left_padding, 0)))


class TemporalResidualBlock(nn.Module):
    def __init__(self, input_channels: int, output_channels: int, dilation: int, dropout: float) -> None:
        super().__init__()
        self.conv1 = CausalConv1d(input_channels, output_channels, kernel_size=3, dilation=dilation)
        self.conv2 = CausalConv1d(output_channels, output_channels, kernel_size=3, dilation=dilation)
        self.norm1 = nn.GroupNorm(1, output_channels)
        self.norm2 = nn.GroupNorm(1, output_channels)
        self.dropout = nn.Dropout(dropout)
        self.project = nn.Conv1d(input_channels, output_channels, 1) if input_channels != output_channels else nn.Identity()

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = self.project(x)
        x = self.dropout(F.gelu(self.norm1(self.conv1(x))))
        x = self.dropout(F.gelu(self.norm2(self.conv2(x))))
        return F.gelu(x + residual)


class MultiTaskHeads(nn.Module):
    def __init__(self, input_dim: int, horizon: int) -> None:
        super().__init__()
        self.hazard = nn.Linear(input_dim, horizon)
        self.returns = nn.Linear(input_dim, 3)
        self.excursions = nn.Linear(input_dim, 2)
        self.barrier = nn.Linear(input_dim, 1)
        self.rank = nn.Linear(input_dim, 1)

    def forward(self, representation: torch.Tensor) -> dict[str, torch.Tensor]:
        return {
            "hazard_logits": self.hazard(representation),
            "returns": self.returns(representation),
            "excursions": self.excursions(representation),
            "barrier_logit": self.barrier(representation).squeeze(-1),
            "rank_score": self.rank(representation).squeeze(-1),
        }


class HazardTCN(nn.Module):
    def __init__(
        self,
        feature_count: int,
        ticker_count: int,
        sector_count: int,
        config: QEConfig,
    ) -> None:
        super().__init__()
        width = config.hidden_channels
        blocks: list[nn.Module] = []
        channels = feature_count
        for dilation in (1, 2, 4, 8):
            blocks.append(TemporalResidualBlock(channels, width, dilation, config.dropout))
            channels = width
        self.temporal = nn.Sequential(*blocks)
        self.ticker_embedding = nn.Embedding(ticker_count + 1, config.embedding_dim, padding_idx=0)
        self.sector_embedding = nn.Embedding(sector_count + 1, config.embedding_dim, padding_idx=0)
        representation_dim = width + config.embedding_dim * 2
        self.projection = nn.Sequential(
            nn.Linear(representation_dim, width), nn.GELU(), nn.Dropout(config.dropout)
        )
        self.heads = MultiTaskHeads(width, config.max_horizon)

    def forward(self, x: torch.Tensor, ticker: torch.Tensor, sector: torch.Tensor) -> dict[str, torch.Tensor]:
        temporal = self.temporal(x.transpose(1, 2))[:, :, -1]
        representation = torch.cat(
            [temporal, self.ticker_embedding(ticker), self.sector_embedding(sector)], dim=1
        )
        return self.heads(self.projection(representation))


class CompactTFT(nn.Module):
    """Bounded multi-horizon transformer with static context and variable gating."""

    def __init__(
        self,
        feature_count: int,
        ticker_count: int,
        sector_count: int,
        config: QEConfig,
    ) -> None:
        super().__init__()
        width = config.hidden_channels
        self.feature_gate = nn.Sequential(
            nn.Linear(feature_count, feature_count), nn.Softmax(dim=-1)
        )
        self.input_projection = nn.Linear(feature_count, width)
        self.ticker_embedding = nn.Embedding(ticker_count + 1, config.embedding_dim, padding_idx=0)
        self.sector_embedding = nn.Embedding(sector_count + 1, config.embedding_dim, padding_idx=0)
        self.static_projection = nn.Linear(config.embedding_dim * 2, width)
        layer = nn.TransformerEncoderLayer(
            d_model=width,
            nhead=4,
            dim_feedforward=width * 2,
            dropout=config.dropout,
            activation="gelu",
            batch_first=True,
            norm_first=True,
        )
        self.encoder = nn.TransformerEncoder(layer, num_layers=2)
        self.heads = MultiTaskHeads(width, config.max_horizon)

    def forward(self, x: torch.Tensor, ticker: torch.Tensor, sector: torch.Tensor) -> dict[str, torch.Tensor]:
        weights = self.feature_gate(x)
        sequence = self.input_projection(x * weights)
        static = self.static_projection(
            torch.cat([self.ticker_embedding(ticker), self.sector_embedding(sector)], dim=1)
        )
        sequence = sequence + static.unsqueeze(1)
        length = sequence.shape[1]
        causal_mask = torch.triu(
            torch.full((length, length), float("-inf"), device=sequence.device), diagonal=1
        )
        encoded = self.encoder(sequence, mask=causal_mask)
        return self.heads(encoded[:, -1])


def hazard_probabilities(hazard_logits: torch.Tensor) -> torch.Tensor:
    hazard = torch.sigmoid(hazard_logits)
    return 1 - torch.cumprod(1 - hazard, dim=1)


def multi_task_loss(
    outputs: dict[str, torch.Tensor],
    batch: dict[str, torch.Tensor],
    scales: LossScales | None = None,
    config: QEConfig | None = None,
) -> dict[str, torch.Tensor]:
    logits = outputs["hazard_logits"]
    horizon = logits.shape[1]
    steps = torch.arange(1, horizon + 1, device=logits.device).unsqueeze(0)
    event_time = batch["event_time"].unsqueeze(1).clamp(1, horizon)
    observed = batch["event_observed"].unsqueeze(1)
    at_risk = steps <= event_time
    hazard_target = ((steps == event_time) & (observed > 0.5)).float()
    hazard_raw = F.binary_cross_entropy_with_logits(logits, hazard_target, reduction="none")
    hazard_loss = hazard_raw[at_risk].mean()

    scales = scales or LossScales((1.0, 1.0, 1.0), (1.0, 1.0))
    return_scale = torch.tensor(scales.returns, device=logits.device, dtype=logits.dtype).unsqueeze(0)
    excursion_scale = torch.tensor(scales.excursions, device=logits.device, dtype=logits.dtype).unsqueeze(0)
    return_mask = batch["return_mask"]
    return_raw = F.huber_loss(
        outputs["returns"] / return_scale, batch["returns"] / return_scale, delta=1.0, reduction="none"
    )
    return_loss = (
        return_raw[return_mask].mean()
        if return_mask.any()
        else logits.sum() * 0
    )
    excursion_mask = batch["excursion_mask"]
    excursion_raw = F.huber_loss(
        outputs["excursions"] / excursion_scale,
        batch["excursions"] / excursion_scale,
        delta=1.0,
        reduction="none",
    )
    excursion_loss = (
        excursion_raw[excursion_mask].mean()
        if excursion_mask.any()
        else logits.sum() * 0
    )
    barrier_mask = batch["barrier_mask"]
    barrier_loss = (
        F.binary_cross_entropy_with_logits(
            outputs["barrier_logit"][barrier_mask], batch["barrier"][barrier_mask]
        )
        if barrier_mask.any()
        else logits.sum() * 0
    )
    rank_target = batch["rank_target"]
    rank_score = outputs["rank_score"]
    # Adjacent rows after a date sort form bounded, simultaneous cross-sectional pairs.
    order = torch.argsort(batch["date_id"])
    left, right = order[:-1], order[1:]
    target_difference = rank_target[left] - rank_target[right]
    valid = (batch["date_id"][left] == batch["date_id"][right]) & (target_difference.abs() > 1e-6)
    if valid.any():
        score_difference = rank_score[left] - rank_score[right]
        rank_loss = F.softplus(-score_difference[valid] * target_difference[valid].sign()).mean()
    else:
        rank_loss = logits.sum() * 0
    weights = config or QEConfig()
    total = (
        weights.hazard_loss_weight * hazard_loss
        + weights.return_loss_weight * return_loss
        + weights.excursion_loss_weight * excursion_loss
        + weights.barrier_loss_weight * barrier_loss
        + weights.ranking_loss_weight * rank_loss
    )
    return {
        "total": total,
        "hazard": hazard_loss,
        "return": return_loss,
        "excursion": excursion_loss,
        "barrier": barrier_loss,
        "rank": rank_loss,
    }


@dataclass
class TrainingResult:
    model: nn.Module
    best_validation_loss: float
    epochs_completed: int
    history: list[dict[str, float]]
    loss_scales: LossScales


def train_model(
    model: nn.Module,
    train_dataset: SequenceDataset,
    validation_dataset: SequenceDataset,
    config: QEConfig,
    seed: int,
    device: torch.device,
    metric_callback: Callable[[dict[str, float]], None] | None = None,
) -> TrainingResult:
    set_deterministic_seed(seed)
    model.to(device)
    rng = np.random.default_rng(seed)
    train_ends = np.asarray(train_dataset.ends, dtype=np.int64)
    validation_ends = np.asarray(validation_dataset.ends, dtype=np.int64)
    if config.max_train_sequences and len(train_ends) > config.max_train_sequences:
        positions = np.linspace(0, len(train_ends) - 1, config.max_train_sequences, dtype=np.int64)
        train_ends = train_ends[positions]
    if config.max_calibration_sequences and len(validation_ends) > config.max_calibration_sequences:
        positions = np.linspace(0, len(validation_ends) - 1, config.max_calibration_sequences, dtype=np.int64)
        validation_ends = validation_ends[positions]
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay
    )
    best_loss = math.inf
    best_state = copy.deepcopy(model.state_dict())
    stale_epochs = 0
    history: list[dict[str, float]] = []
    loss_scales = LossScales.fit(train_dataset.frame)

    for epoch in range(config.epochs):
        model.train()
        train_total = 0.0
        train_rows = 0
        shuffled = rng.permutation(train_ends)
        for start in range(0, len(shuffled), config.batch_size):
            batch = sequence_batch(train_dataset, shuffled[start : start + config.batch_size])
            batch = {key: value.to(device) for key, value in batch.items()}
            optimizer.zero_grad(set_to_none=True)
            outputs = model(batch["x"], batch["ticker"], batch["sector"])
            loss = multi_task_loss(outputs, batch, loss_scales, config)["total"]
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            train_total += float(loss.detach()) * len(batch["x"])
            train_rows += len(batch["x"])

        model.eval()
        validation_total = 0.0
        validation_rows = 0
        with torch.no_grad():
            for start in range(0, len(validation_ends), config.batch_size):
                batch = sequence_batch(validation_dataset, validation_ends[start : start + config.batch_size])
                batch = {key: value.to(device) for key, value in batch.items()}
                outputs = model(batch["x"], batch["ticker"], batch["sector"])
                loss = multi_task_loss(outputs, batch, loss_scales, config)["total"]
                validation_total += float(loss) * len(batch["x"])
                validation_rows += len(batch["x"])
        validation_loss = validation_total / max(validation_rows, 1)
        record = {
            "epoch": float(epoch + 1),
            "train_loss": train_total / max(train_rows, 1),
            "validation_loss": validation_loss,
        }
        history.append(record)
        if metric_callback is not None:
            metric_callback(record)
        if validation_loss < best_loss - 1e-6:
            best_loss = validation_loss
            best_state = copy.deepcopy(model.state_dict())
            stale_epochs = 0
        else:
            stale_epochs += 1
            if stale_epochs >= config.patience:
                break
    model.load_state_dict(best_state)
    return TrainingResult(model, best_loss, len(history), history, loss_scales)


def predict_model(
    model: nn.Module,
    dataset: SequenceDataset,
    device: torch.device,
    batch_size: int = 1024,
) -> pd.DataFrame:
    ends = np.asarray(dataset.ends, dtype=np.int64)
    model.to(device).eval()
    records: list[dict[str, float | int]] = []
    with torch.no_grad():
        for start in range(0, len(ends), batch_size):
            batch = sequence_batch(dataset, ends[start : start + batch_size])
            outputs = model(
                batch["x"].to(device), batch["ticker"].to(device), batch["sector"].to(device)
            )
            daily_hazard = torch.sigmoid(outputs["hazard_logits"]).cpu().numpy()
            cumulative = hazard_probabilities(outputs["hazard_logits"]).cpu().numpy()
            returns = outputs["returns"].cpu().numpy()
            excursions = outputs["excursions"].cpu().numpy()
            barrier = torch.sigmoid(outputs["barrier_logit"]).cpu().numpy()
            ranks = outputs["rank_score"].cpu().numpy()
            for row_index, hazards, probabilities, predicted_returns, predicted_excursions, barrier_value, rank in zip(
                batch["row_index"].numpy(), daily_hazard, cumulative, returns, excursions, barrier, ranks
            ):
                record = {
                        "row_index": int(row_index),
                        "reversal_probability_3": float(probabilities[2]),
                        "reversal_probability_5": float(probabilities[4]),
                        "reversal_probability_10": float(probabilities[9]),
                        "expected_return_5": float(predicted_returns[0]),
                        "expected_return_10": float(predicted_returns[1]),
                        "expected_return_20": float(predicted_returns[2]),
                        "expected_mfe_10": float(predicted_excursions[0]),
                        "expected_mae_10": float(predicted_excursions[1]),
                        "barrier_probability": float(barrier_value),
                        "rank_score": float(rank),
                    }
                record.update({f"hazard_probability_{day + 1}": float(value) for day, value in enumerate(hazards)})
                records.append(record)
    return pd.DataFrame.from_records(records)


class HorizonCalibrator:
    def __init__(self) -> None:
        self.models: dict[int, LogisticRegression] = {}

    def fit(self, predictions: pd.DataFrame, truth: pd.DataFrame) -> "HorizonCalibrator":
        for horizon in (3, 5, 10):
            probability = predictions[f"reversal_probability_{horizon}"].to_numpy(dtype=float)
            target = ((truth["event_observed"] == 1) & (truth["event_time"] <= horizon)).astype(int).to_numpy()
            if len(np.unique(target)) < 2:
                continue
            clipped = np.clip(probability, 1e-6, 1 - 1e-6)
            logit = np.log(clipped / (1 - clipped)).reshape(-1, 1)
            model = LogisticRegression(C=1.0, solver="lbfgs", random_state=17)
            model.fit(logit, target)
            self.models[horizon] = model
        return self

    def transform(self, predictions: pd.DataFrame) -> pd.DataFrame:
        calibrated = predictions.copy()
        for horizon, model in self.models.items():
            column = f"reversal_probability_{horizon}"
            clipped = np.clip(calibrated[column].to_numpy(dtype=float), 1e-6, 1 - 1e-6)
            logit = np.log(clipped / (1 - clipped)).reshape(-1, 1)
            calibrated[column] = model.predict_proba(logit)[:, 1]
        columns = [f"reversal_probability_{horizon}" for horizon in (3, 5, 10)]
        calibrated[columns] = np.maximum.accumulate(calibrated[columns].to_numpy(dtype=float), axis=1)
        return calibrated


def build_model(
    model_type: Literal["tcn", "tft"],
    feature_count: int,
    categories: CategoryMaps,
    config: QEConfig,
) -> nn.Module:
    model_class = HazardTCN if model_type == "tcn" else CompactTFT
    model = model_class(feature_count, len(categories.ticker), len(categories.sector), config)
    if model_type == "tft":
        reference = HazardTCN(feature_count, len(categories.ticker), len(categories.sector), config)
        challenger_parameters = sum(parameter.numel() for parameter in model.parameters())
        reference_parameters = sum(parameter.numel() for parameter in reference.parameters())
        if challenger_parameters > reference_parameters:
            raise ValueError(
                f"Compact TFT exceeds the TCN parameter ceiling ({challenger_parameters} > {reference_parameters})"
            )
    return model


def save_model_bundle(
    output_dir: Path,
    model: nn.Module,
    model_type: str,
    scaler: FeatureScaler,
    categories: CategoryMaps,
    config: QEConfig,
    calibrator: HorizonCalibrator | None,
    metadata: dict[str, Any],
) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    torch.save(model.state_dict(), output_dir / "model.pt")
    payload = {
        "modelType": model_type,
        "config": config.to_dict(),
        "scaler": scaler.to_dict(),
        "categories": asdict(categories),
        "metadata": metadata,
    }
    (output_dir / "model.json").write_text(json.dumps(payload, indent=2), encoding="utf-8")
    if calibrator is not None:
        joblib.dump(calibrator, output_dir / "calibrator.joblib")


def load_model_bundle(
    bundle_dir: Path, device: torch.device
) -> tuple[nn.Module, FeatureScaler, CategoryMaps, QEConfig, HorizonCalibrator | None, dict[str, Any]]:
    payload = json.loads((bundle_dir / "model.json").read_text(encoding="utf-8"))
    config_payload = payload["config"].copy()
    config_payload["support_dir"] = Path(config_payload["support_dir"])
    config_payload["deploy_dir"] = Path(config_payload["deploy_dir"])
    for key in ("return_horizons", "sequence_lengths", "seeds"):
        config_payload[key] = tuple(config_payload[key])
    config = QEConfig(**config_payload)
    categories = CategoryMaps(**payload["categories"])
    scaler = FeatureScaler.from_dict(payload["scaler"])
    model = build_model(payload["modelType"], len(scaler.columns), categories, config)
    state = torch.load(bundle_dir / "model.pt", map_location=device, weights_only=True)
    model.load_state_dict(state)
    calibrator_path = bundle_dir / "calibrator.joblib"
    calibrator = joblib.load(calibrator_path) if calibrator_path.exists() else None
    return model, scaler, categories, config, calibrator, payload.get("metadata", {})
