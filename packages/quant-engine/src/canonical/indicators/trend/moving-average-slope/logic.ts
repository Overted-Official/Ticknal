import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { difference, ema, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const average = ema(values(frame, "close"), n(p, "period"));
  const slope = difference(average);
  return {
    slope,
    normalized_slope: average.map((value, i) =>
      value === null ||
      average[i - 1] === null ||
      average[i - 1] === undefined ||
      average[i - 1] === 0
        ? null
        : ((value - average[i - 1]!) / average[i - 1]!) * 100,
    ),
  };
};

export default compute;
