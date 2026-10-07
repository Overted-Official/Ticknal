import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, field, lowerWick, n, sma, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const average = sma(field(frame, "close"), n(p, "contextPeriod"));
  const shape = frame.bars.map(
    (_, i) =>
      lowerWick(frame, i) >=
        n(p, "wickRatio") * Math.max(bodies(frame)[i], Number.EPSILON) &&
      upperWick(frame, i) <= Math.max(bodies(frame)[i], Number.EPSILON),
  );
  return {
    hammer: shape.map((value, i) =>
      average[i] === null ? null : value && frame.bars[i].close < average[i]!,
    ),
    hanging_man: shape.map((value, i) =>
      average[i] === null ? null : value && frame.bars[i].close > average[i]!,
    ),
  };
};

export default compute;
