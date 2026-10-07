import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, rollingStdDev, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    average = sma(source, n(p, "period")),
    deviation = rollingStdDev(source, n(p, "period"));
  return {
    z_score: source.map((value, i) =>
      average[i] === null || deviation[i] === null || deviation[i] === 0
        ? null
        : (value - average[i]!) / deviation[i]!,
    ),
  };
};

export default compute;
