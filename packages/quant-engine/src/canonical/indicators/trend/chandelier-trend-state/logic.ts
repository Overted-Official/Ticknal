import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, map2, n, rollingMax, rollingMin, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const range = atr(
    values(frame, "high"),
    values(frame, "low"),
    values(frame, "close"),
    period,
  );
  const multiplier = n(p, "multiplier");
  return {
    long_stop: map2(
      rollingMax(values(frame, "high"), period),
      range,
      (extreme, value) => extreme - multiplier * value,
    ),
    short_stop: map2(
      rollingMin(values(frame, "low"), period),
      range,
      (extreme, value) => extreme + multiplier * value,
    ),
  };
};

export default compute;
