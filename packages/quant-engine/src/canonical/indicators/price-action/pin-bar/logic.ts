import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, lowerWick, n, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  bullish: frame.bars.map(
    (_, i) =>
      lowerWick(frame, i) >=
        n(p, "wickRatio") * Math.max(bodies(frame)[i], Number.EPSILON) &&
      lowerWick(frame, i) >= n(p, "wickRatio") * upperWick(frame, i),
  ),
  bearish: frame.bars.map(
    (_, i) =>
      upperWick(frame, i) >=
        n(p, "wickRatio") * Math.max(bodies(frame)[i], Number.EPSILON) &&
      upperWick(frame, i) >= n(p, "wickRatio") * lowerWick(frame, i),
  ),
});

export default compute;
