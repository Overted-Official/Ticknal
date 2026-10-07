import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, rollingStdDev, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame);
  return {
    mean: sma(source, n(p, "period")),
    variance: rollingStdDev(source, n(p, "period")).map((value) =>
      value === null ? null : value ** 2,
    ),
  };
};

export default compute;
