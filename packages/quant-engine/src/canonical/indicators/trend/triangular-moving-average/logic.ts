import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, sma, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  return {
    tma: sma(
      sma(values(frame, "close"), Math.ceil((period + 1) / 2)),
      Math.floor((period + 1) / 2),
    ),
  };
};

export default compute;
