import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingSum, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const flow = frame.bars.map((bar) =>
    bar.volume === null
      ? null
      : bar.high === bar.low
        ? 0
        : ((bar.close - bar.low - (bar.high - bar.close)) /
            (bar.high - bar.low)) *
          bar.volume,
  );
  return {
    cmf: map2(
      rollingSum(flow, n(p, "period")),
      rollingSum(volumes(frame), n(p, "period")),
      (a, b) => (b === 0 ? null : a / b),
    ),
  };
};

export default compute;
