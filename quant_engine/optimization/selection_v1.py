"""Hard-gated selection of deployable OOS champions."""

from __future__ import annotations

from typing import Iterable


def _gate_failures(
    report: dict,
    *,
    minimum_win_rate: float,
    minimum_trades: int,
    maximum_drawdown: float | None,
) -> list[str]:
    failures: list[str] = []
    if int(report.get("trade_count", 0)) < minimum_trades:
        failures.append("minimum_trades")
    if float(report.get("strategy_roi", float("-inf"))) <= float(report.get("buy_hold_roi", float("inf"))):
        failures.append("beat_buy_and_hold")
    if float(report.get("win_rate", 0.0)) < minimum_win_rate:
        failures.append("minimum_win_rate")
    if maximum_drawdown is not None and float(report.get("maximum_drawdown", float("inf"))) > maximum_drawdown:
        failures.append("maximum_drawdown")
    return failures


def rank_champions(
    reports: Iterable[dict],
    *,
    minimum_win_rate: float = 0.75,
    minimum_trades: int = 10,
    maximum_drawdown: float | None = 0.10,
) -> dict:
    """Rank only configurations that pass every hard OOS qualification gate."""
    evaluated = []
    for report in reports:
        item = dict(report)
        item["gate_failures"] = _gate_failures(
            item,
            minimum_win_rate=minimum_win_rate,
            minimum_trades=minimum_trades,
            maximum_drawdown=maximum_drawdown,
        )
        item["qualified"] = not item["gate_failures"]
        evaluated.append(item)

    qualified = [item for item in evaluated if item["qualified"]]
    qualified.sort(
        key=lambda item: (
            float(item["strategy_roi"]),
            float(item["win_rate"]),
            -float(item.get("average_holding_bars", float("inf"))),
        ),
        reverse=True,
    )
    return {
        "champion": qualified[0] if qualified else None,
        "qualified_count": len(qualified),
        "evaluated_count": len(evaluated),
        "qualified_ranking": qualified,
        "evaluations": evaluated,
    }
