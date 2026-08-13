"""Versioned, hash-checked QE-v2 export contract consumed by Next.js."""

from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

from .backtest import PolicyConfig
from .validation import evaluate_promotion_gates


SCHEMA_VERSION = 2


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _json_safe(value: Any) -> Any:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if not np.isfinite(value) else float(value)
    if isinstance(value, (pd.Timestamp, datetime)):
        return value.isoformat()
    return value


def export_deployment_bundle(
    output_dir: Path,
    scores: pd.DataFrame,
    model_dirs: list[Path],
    feature_schema: dict[str, Any],
    validation_summary: dict[str, Any],
    policy: PolicyConfig,
    model_version: str,
    data_path: Path,
    max_staleness_days: int = 10,
) -> dict[str, Any]:
    output_dir.mkdir(parents=True, exist_ok=True)
    model_output = output_dir / "models"
    model_output.mkdir(exist_ok=True)
    model_hashes: dict[str, str] = {}
    for model_dir in model_dirs:
        destination = model_output / model_dir.name
        resolved_output = model_output.resolve()
        resolved_destination = destination.resolve()
        if resolved_destination == resolved_output or not resolved_destination.is_relative_to(resolved_output):
            raise ValueError(f"Unsafe model export destination: {resolved_destination}")
        if destination.exists():
            shutil.rmtree(destination)
        shutil.copytree(model_dir, destination)
        for path in destination.rglob("*"):
            if path.is_file():
                model_hashes[str(path.relative_to(output_dir)).replace("\\", "/")] = sha256_file(path)

    ordered = scores.sort_values(["ticker", "date"]).copy()
    latest = ordered.groupby("ticker", as_index=False).tail(1)
    score_columns = [
        "ticker", "date", "psi40", "psi_direction", "exhaustion_percentile",
        "psi_at_last_pivot", "running_delta", "price_swing_return",
        "price_swing_median_multiple", "median_daily_move", "swing_threshold",
        "reversal_probability_3", "reversal_probability_5", "reversal_probability_10",
        "expected_return_5", "expected_return_10", "expected_return_20",
        "barrier_probability", "expected_mfe_10", "expected_mae_10",
        "prediction_uncertainty", "target_position", "reason",
    ]
    available = [column for column in score_columns if column in latest.columns]
    score_records = [
        {key: _json_safe(value) for key, value in record.items()}
        for record in latest[available].to_dict(orient="records")
    ]
    (output_dir / "latest_scores.json").write_text(json.dumps(score_records, indent=2), encoding="utf-8")
    scores_output = output_dir / "scores"
    scores_output.mkdir(exist_ok=True)
    score_hashes: dict[str, str] = {}
    for ticker, ticker_scores in ordered.groupby("ticker", sort=True):
        history_records = [
            {key: _json_safe(value) for key, value in record.items()}
            for record in ticker_scores[available].to_dict(orient="records")
        ]
        score_path = scores_output / f"{ticker}.json"
        score_path.write_text(json.dumps(history_records, separators=(",", ":")), encoding="utf-8")
        score_hashes[str(score_path.relative_to(output_dir)).replace("\\", "/")] = sha256_file(score_path)
    (output_dir / "feature_schema.json").write_text(json.dumps(feature_schema, indent=2), encoding="utf-8")
    (output_dir / "policy.json").write_text(json.dumps(policy.to_dict(), indent=2), encoding="utf-8")

    promotion = evaluate_promotion_gates(validation_summary)
    generated_at = datetime.now(timezone.utc).isoformat()
    as_of = str(pd.to_datetime(latest["date"]).max().date()) if not latest.empty else None
    manifest = {
        "schemaVersion": SCHEMA_VERSION,
        "modelVersion": model_version,
        "status": "promoted" if promotion["promoted"] else "research",
        "generatedAt": generated_at,
        "asOfDate": as_of,
        "maxStalenessDays": max_staleness_days,
        "scoreCount": len(score_records),
        "dataHash": sha256_file(data_path),
        "modelHashes": model_hashes,
        "scoreHashes": score_hashes,
        "featureSchemaHash": sha256_file(output_dir / "feature_schema.json"),
        "policyHash": sha256_file(output_dir / "policy.json"),
        "scoreHash": sha256_file(output_dir / "latest_scores.json"),
        "validation": validation_summary,
        "promotion": promotion,
    }
    (output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2, default=_json_safe), encoding="utf-8")
    return manifest
