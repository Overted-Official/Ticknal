import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, field, lowerWick, n, sma, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const average = sma(field(frame, "close"), n(p, "contextPeriod"));
  const shape = frame.bars.map(
    (_, i) =>
      upperWick(frame, i) >=
        n(p, "wickRatio") * Math.max(bodies(frame)[i], Number.EPSILON) &&
      lowerWick(frame, i) <= Math.max(bodies(frame)[i], Number.EPSILON),
  );
  return {
    inverted_hammer: shape.map((value, i) =>
      average[i] === null ? null : value && frame.bars[i].close < average[i]!,
    ),
    shooting_star: shape.map((value, i) =>
      average[i] === null ? null : value && frame.bars[i].close > average[i]!,
    ),
  };
};

export default compute;
