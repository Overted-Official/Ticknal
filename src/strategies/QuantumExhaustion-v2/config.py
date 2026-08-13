from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any


PACKAGE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = PACKAGE_DIR.parents[2]
DEFAULT_SUPPORT_DIR = PROJECT_ROOT / "_technical_support" / "quantum_exhaustion_v2"
DEFAULT_DEPLOY_DIR = PACKAGE_DIR / "deploy"


@dataclass(frozen=True)
class QEConfig:
    """All research constants that can affect labels, models, or replay."""

    model_version: str = "QE-v2.1-price-swing-research"
    minimum_history: int = 500
    swing_median_window: int = 64
    swing_median_min_periods: int = 20
    swing_threshold_multiplier: float = 2.0
    swing_threshold_floor: float = 0.005
    pivot_label_tolerance: int = 1
    cdf_ticker_prior: float = 12.0
    cdf_sector_prior: float = 30.0
    max_horizon: int = 10
    return_horizons: tuple[int, ...] = (5, 10, 20)
    sequence_lengths: tuple[int, ...] = (32, 64, 128)
    purge_sessions: int = 20
    embargo_sessions: int = 5
    sealed_test_start: str = "2025-01-01"
    sealed_test_end: str = "2026-08-12"
    favorable_atr: float = 2.0
    adverse_atr: float = 1.5
    extreme_jump_threshold: float = 0.50
    seeds: tuple[int, ...] = (17, 41, 73)
    hidden_channels: int = 32
    embedding_dim: int = 8
    dropout: float = 0.20
    batch_size: int = 1024
    max_train_sequences: int | None = None
    max_calibration_sequences: int | None = None
    epochs: int = 20
    learning_rate: float = 3e-4
    weight_decay: float = 1e-4
    patience: int = 4
    hazard_loss_weight: float = 1.0
    return_loss_weight: float = 1.0
    excursion_loss_weight: float = 0.5
    barrier_loss_weight: float = 1.0
    ranking_loss_weight: float = 0.10
    default_sequence_length: int = 64
    exit_probability: float = 0.68
    entry_probability: float = 0.62
    hysteresis: float = 0.05
    cooldown_sessions: int = 3
    initial_stop_atr: float = 2.5
    trailing_stop_atr: float = 3.0
    max_holding_sessions: int = 120
    initial_capital: float = 100_000.0
    support_dir: Path = field(default=DEFAULT_SUPPORT_DIR)
    deploy_dir: Path = field(default=DEFAULT_DEPLOY_DIR)

    def to_dict(self) -> dict[str, Any]:
        payload = asdict(self)
        payload["support_dir"] = str(self.support_dir)
        payload["deploy_dir"] = str(self.deploy_dir)
        return payload


DYNAMIC_FEATURES = (
    "psi40",
    "psi_delta_1",
    "psi_delta_5",
    "psi_acceleration",
    "psi_direction",
    "leg_age",
    "running_delta",
    "exhaustion_percentile",
    "median_daily_move",
    "swing_threshold",
    "price_swing_return",
    "price_swing_median_multiple",
    "psi_at_last_pivot",
    "cdf_ticker_count",
    "cdf_sector_count",
    "cdf_market_count",
    "return_1",
    "return_5",
    "return_10",
    "return_20",
    "atr_pct",
    "volatility_20",
    "volatility_60",
    "volume_ratio_20",
    "log_turnover",
    "price_to_ema20",
    "price_to_ema50",
    "price_to_sma200",
    "market_breadth",
    "market_median_return",
    "market_volatility",
)

RETURN_TARGETS = ("target_return_5", "target_return_10", "target_return_20")
