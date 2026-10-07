import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const close = field(frame, "close");
  const average = sma(close, period);
  const shift = Math.floor(period / 2) + 1;
  return {
    dpo: close.map((_, i) =>
      close[i - shift] === undefined || average[i] === null
        ? null
        : close[i - shift] - average[i]!,
    ),
  };
};

export default compute;
