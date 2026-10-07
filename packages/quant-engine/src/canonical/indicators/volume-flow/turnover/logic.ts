import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingSum, typical, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const turnover = map2(typical(frame), volumes(frame), (a, b) => a * b);
  return { turnover, rolling_turnover: rollingSum(turnover, n(p, "period")) };
};

export default compute;
