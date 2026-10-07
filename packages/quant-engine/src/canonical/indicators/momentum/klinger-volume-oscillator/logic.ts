import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const typical = field(frame, "high").map(
    (high, i) => high + field(frame, "low")[i] + field(frame, "close")[i],
  );
  const force = typical.map((value, i) =>
    i === 0 || frame.bars[i].volume === null
      ? null
      : (value >= typical[i - 1] ? 1 : -1) * frame.bars[i].volume!,
  );
  const kvo = map2(
    ema(force, n(p, "fast")),
    ema(force, n(p, "slow")),
    (a, b) => a - b,
  );
  return { kvo, signal: ema(kvo, n(p, "signal")) };
};

export default compute;
