import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, roc, sma, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const returns = roc(close, 1).map((value) =>
    value === null ? null : Math.abs(value / 100),
  );
  const turnover = map2(close, volumes(frame), (a, b) => a * b);
  const raw = map2(returns, turnover, (a, b) => (b === 0 ? null : a / b));
  return { illiquidity: sma(raw, n(p, "period")) };
};

export default compute;
