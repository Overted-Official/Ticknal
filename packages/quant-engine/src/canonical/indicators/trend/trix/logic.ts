import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, n, values } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function roc(series: NumberSeries, lookback = 1): (number | null)[] {
  return series.map((value, index) => {
    const previous = series[index - lookback];
    return value === null ||
      previous === null ||
      previous === undefined ||
      previous === 0
      ? null
      : (value / previous - 1) * 100;
  });
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const triple = ema(ema(ema(values(frame, "close"), period), period), period);
  const trix = roc(triple);
  return { trix, signal: ema(trix, n(p, "signal")) };
};

export default compute;
