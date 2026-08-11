"""Causal target-before-stop labels for small, medium, and large swings."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class BarrierDefinition:
    name: str
    target_atr: float
    stop_atr: float
    maximum_holding_bars: int


DEFAULT_BARRIERS = (
    BarrierDefinition("small", target_atr=1.0, stop_atr=1.0, maximum_holding_bars=5),
    BarrierDefinition("medium", target_atr=2.0, stop_atr=1.5, maximum_holding_bars=20),
    BarrierDefinition("large", target_atr=4.0, stop_atr=2.0, maximum_holding_bars=60),
)


def net_return_after_costs(
    gross_return: float,
    *,
    commission_bps_per_side: float = 10.0,
    slippage_bps_per_side: float = 15.0,
) -> float:
    """Convert a raw-price return into the backtester's round-trip net return."""
    commission = commission_bps_per_side / 10_000.0
    slippage = slippage_bps_per_side / 10_000.0
    entry_cost_factor = (1.0 + slippage) * (1.0 + commission)
    exit_proceeds_factor = (1.0 - slippage) * (1.0 - commission)
    return (1.0 + float(gross_return)) * exit_proceeds_factor / entry_cost_factor - 1.0


def _label_one(
    group: pd.DataFrame,
    signal_index: int,
    definition: BarrierDefinition,
    atr_column: str,
) -> tuple[float, str | None, float, float]:
    entry_index = signal_index + 1
    if entry_index >= len(group):
        return np.nan, None, np.nan, np.nan
    signal = group.iloc[signal_index]
    entry = group.iloc[entry_index]
    if signal["segment_id"] != entry["segment_id"] or pd.isna(signal[atr_column]) or signal[atr_column] <= 0:
        return np.nan, None, np.nan, np.nan

    entry_price = float(entry["open"])
    atr = float(signal[atr_column])
    target = entry_price + definition.target_atr * atr
    stop = entry_price - definition.stop_atr * atr
    last_index = min(entry_index + definition.maximum_holding_bars - 1, len(group) - 1)

    for index in range(entry_index, last_index + 1):
        bar = group.iloc[index]
        if bar["segment_id"] != signal["segment_id"]:
            return np.nan, None, np.nan, np.nan
        open_price = float(bar["open"])
        if open_price <= stop:
            return 0.0, "stop", float(index - entry_index + 1), open_price / entry_price - 1.0
        if open_price >= target:
            return 1.0, "target", float(index - entry_index + 1), target / entry_price - 1.0
        stop_touched = float(bar["low"]) <= stop
        target_touched = float(bar["high"]) >= target
        if stop_touched:
            return 0.0, "stop", float(index - entry_index + 1), stop / entry_price - 1.0
        if target_touched:
            return 1.0, "target", float(index - entry_index + 1), target / entry_price - 1.0

    if last_index < entry_index + definition.maximum_holding_bars - 1:
        return np.nan, None, np.nan, np.nan
    terminal_close = float(group.iloc[last_index]["close"])
    return 0.0, "timeout", float(definition.maximum_holding_bars), terminal_close / entry_price - 1.0


def apply_triple_barrier_labels(
    frame: pd.DataFrame,
    *,
    candidate_column: str = "entry_signal",
    atr_column: str = "atr_14",
    definitions: tuple[BarrierDefinition, ...] = DEFAULT_BARRIERS,
    commission_bps_per_side: float = 10.0,
    slippage_bps_per_side: float = 15.0,
) -> pd.DataFrame:
    """Attach per-scale labels only to candidate rows.

    Entry is the next session open. A same-bar stop/target collision is labelled
    as a stop. Incomplete or cross-segment outcomes remain unknown rather than
    being silently treated as losses.
    """
    required = {"ticker_symbol", "date", "open", "high", "low", "close", "segment_id", candidate_column, atr_column}
    missing = required.difference(frame.columns)
    if missing:
        raise ValueError(f"Missing label columns: {', '.join(sorted(missing))}")

    output_groups: list[pd.DataFrame] = []
    for _, group in frame.sort_values(["ticker_symbol", "date"], kind="stable").groupby("ticker_symbol", sort=False):
        group = group.reset_index(drop=True).copy()
        for definition in definitions:
            labels = np.full(len(group), np.nan)
            outcomes: list[str | None] = [None] * len(group)
            holding = np.full(len(group), np.nan)
            returns = np.full(len(group), np.nan)
            for index in np.flatnonzero(group[candidate_column].fillna(False).to_numpy(dtype=bool)):
                label, outcome, bars, realized_return = _label_one(group, int(index), definition, atr_column)
                labels[index] = label
                outcomes[index] = outcome
                holding[index] = bars
                returns[index] = realized_return
            group[f"label_{definition.name}"] = labels
            group[f"outcome_{definition.name}"] = pd.Series(outcomes, dtype="string")
            group[f"holding_bars_{definition.name}"] = holding
            group[f"realized_return_{definition.name}"] = returns
            net_returns = pd.Series(returns, index=group.index).map(
                lambda value: net_return_after_costs(
                    value,
                    commission_bps_per_side=commission_bps_per_side,
                    slippage_bps_per_side=slippage_bps_per_side,
                )
                if pd.notna(value)
                else np.nan
            )
            group[f"net_return_{definition.name}"] = net_returns
            group[f"net_win_{definition.name}"] = net_returns.gt(0).where(net_returns.notna()).astype("Float64")
        output_groups.append(group)
    return pd.concat(output_groups, ignore_index=True) if output_groups else frame.copy()
