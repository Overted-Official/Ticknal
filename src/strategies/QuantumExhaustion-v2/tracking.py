"""Optional Comet telemetry; local manifests remain the source of truth."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any


def _flatten(payload: dict[str, Any], prefix: str = "") -> dict[str, Any]:
    flattened: dict[str, Any] = {}
    for key, value in payload.items():
        name = f"{prefix}.{key}" if prefix else str(key)
        if isinstance(value, dict):
            flattened.update(_flatten(value, name))
        elif isinstance(value, (str, int, float, bool)) or value is None:
            flattened[name] = value
    return flattened


class ExperimentTracker:
    def __init__(self, experiment: Any | None = None) -> None:
        self.experiment = experiment

    @property
    def enabled(self) -> bool:
        return self.experiment is not None

    def log_parameters(self, parameters: dict[str, Any]) -> None:
        if self.experiment is not None:
            self.experiment.log_parameters(_flatten(parameters))

    def log_metrics(self, metrics: dict[str, Any], step: int | None = None, prefix: str = "") -> None:
        if self.experiment is None:
            return
        values = {
            f"{prefix}.{key}" if prefix else key: value
            for key, value in _flatten(metrics).items()
            if isinstance(value, (int, float)) and value is not None
        }
        if values:
            self.experiment.log_metrics(values, step=step)

    def log_asset(self, path: Path, logical_path: str | None = None) -> None:
        if self.experiment is not None and path.exists():
            self.experiment.log_asset(str(path), logical_path=logical_path)

    def end(self, status: str = "completed") -> None:
        if self.experiment is not None:
            self.experiment.log_other("qe_run_status", status)
            self.experiment.end()


def start_experiment(
    name: str,
    parameters: dict[str, Any],
    tags: list[str] | None = None,
    enabled: bool | None = None,
) -> ExperimentTracker:
    api_key = os.environ.get("COMET_API_KEY")
    should_enable = bool(api_key) if enabled is None else enabled
    if not should_enable:
        return ExperimentTracker()
    if not api_key:
        raise ValueError("Comet tracking was requested but COMET_API_KEY is not configured")
    import comet_ml

    experiment = comet_ml.start(
        api_key=api_key,
        workspace=os.environ.get("COMET_WORKSPACE"),
        project_name=os.environ.get("COMET_PROJECT_NAME", "quantum-exhaustion-v2"),
    )
    experiment.set_name(name)
    if tags:
        experiment.add_tags(tags)
    tracker = ExperimentTracker(experiment)
    tracker.log_parameters(parameters)
    return tracker
