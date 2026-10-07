import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, sma, trades, typical, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const turnover = map2(typical(frame), volumes(frame), (a, b) => a * b);
  const ats = map2(turnover, trades(frame), (a, b) => (b === 0 ? null : a / b));
  const average = sma(ats, n(p, "period"));
  return {
    ats,
    average_ats: average,
    ratio: map2(ats, average, (a, b) => (b === 0 ? null : a / b)),
  };
};

export default compute;
