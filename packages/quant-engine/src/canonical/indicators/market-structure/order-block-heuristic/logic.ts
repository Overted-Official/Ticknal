import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const range = atr(
    field(frame, "high"),
    field(frame, "low"),
    field(frame, "close"),
    n(p, "atrPeriod"),
  );
  const upper: (number | null)[] = Array(frame.bars.length).fill(null),
    lower: (number | null)[] = Array(frame.bars.length).fill(null),
    invalidation: (number | null)[] = Array(frame.bars.length).fill(null),
    direction: (string | null)[] = Array(frame.bars.length).fill(null);
  for (let i = 1; i < frame.bars.length; i += 1) {
    if (range[i] === null) continue;
    const move = frame.bars[i].close - frame.bars[i - 1].close;
    const priorDirection = frame.bars[i - 1].close - frame.bars[i - 1].open;
    if (
      Math.abs(move) >= n(p, "impulseMultiple") * range[i]! &&
      move * priorDirection < 0
    ) {
      upper[i] = frame.bars[i - 1].high;
      lower[i] = frame.bars[i - 1].low;
      direction[i] = move > 0 ? "bullish" : "bearish";
      invalidation[i] =
        move > 0 ? frame.bars[i - 1].low : frame.bars[i - 1].high;
    }
  }
  return { zone_upper: upper, zone_lower: lower, direction, invalidation };
};

export default compute;
