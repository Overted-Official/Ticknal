import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  doubleSmoothedRatio,
  ema,
  field,
  map2,
  n,
  rollingMax,
  rollingMin,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const highest = rollingMax(field(frame, "high"), n(p, "period"));
  const lowest = rollingMin(field(frame, "low"), n(p, "period"));
  const distance = field(frame, "close").map((value, i) =>
    highest[i] === null || lowest[i] === null
      ? null
      : value - (highest[i]! + lowest[i]!) / 2,
  );
  const range = map2(highest, lowest, (a, b) => a - b);
  const smi = doubleSmoothedRatio(
    distance,
    range,
    n(p, "smooth1"),
    n(p, "smooth2"),
    200,
  );
  return { smi, signal: ema(smi, n(p, "signal")) };
};

export default compute;
