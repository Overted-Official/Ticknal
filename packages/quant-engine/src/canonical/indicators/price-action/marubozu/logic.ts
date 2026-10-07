import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { direction, lowerWick, n, ranges, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const shape = ranges(frame).map(
    (range, i) =>
      range > 0 &&
      (100 * (upperWick(frame, i) + lowerWick(frame, i))) / range <=
        n(p, "wickTolerancePct"),
  );
  return {
    bullish: shape.map((value, i) => value && direction(frame, i) > 0),
    bearish: shape.map((value, i) => value && direction(frame, i) < 0),
  };
};

export default compute;
