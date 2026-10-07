import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const high = rollingMax(close, n(p, "period"));
  const drawdownSquared = close.map((value, i) =>
    high[i] === null || high[i] === 0
      ? null
      : (100 * (value / high[i]! - 1)) ** 2,
  );
  const mean = rollingSum(drawdownSquared, n(p, "period")).map((value) =>
    value === null ? null : value / n(p, "period"),
  );
  return {
    ulcer_index: mean.map((value) =>
      value === null ? null : Math.sqrt(value),
    ),
  };
};

export default compute;
