import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, sma, trades } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const rate = trades(frame);
  return {
    trades_rate: rate,
    relative_rate: map2(rate, sma(rate, n(p, "period")), (a, b) =>
      b === 0 ? null : a / b,
    ),
  };
};

export default compute;
