import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, variance } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    one = returns(source);
  return {
    variance_ratio: source.map((_, i) => {
      const period = n(p, "period"),
        horizon = n(p, "horizon");
      if (i + 1 < period + horizon) return null;
      const oneWindow = one.slice(i - period + 1, i + 1);
      if (oneWindow.some((v) => v === null)) return null;
      const multi: number[] = [];
      for (let j = i - period + horizon; j <= i; j += 1)
        multi.push(source[j] / source[j - horizon] - 1);
      const denominator = horizon * variance(oneWindow as number[]);
      return denominator === 0 ? null : variance(multi) / denominator;
    }),
  };
};

export default compute;
