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
    direction: (string | null)[] = Array(frame.bars.length).fill(null),
    strength: (number | null)[] = Array(frame.bars.length).fill(null);
  for (let i = n(p, "baseBars"); i < frame.bars.length; i += 1) {
    if (range[i] === null) continue;
    const start = i - n(p, "baseBars");
    const baseHigh = Math.max(...field(frame, "high").slice(start, i));
    const baseLow = Math.min(...field(frame, "low").slice(start, i));
    const move = frame.bars[i].close - frame.bars[i - 1].close;
    if (Math.abs(move) >= n(p, "impulseMultiple") * range[i]!) {
      upper[i] = baseHigh;
      lower[i] = baseLow;
      direction[i] = move > 0 ? "demand" : "supply";
      strength[i] = Math.abs(move) / range[i]!;
    }
  }
  return { zone_upper: upper, zone_lower: lower, direction, strength };
};

export default compute;
