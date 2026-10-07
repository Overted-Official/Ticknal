import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, n } from "../shared";
import type { Series } from "../shared";

type Parameters = Record<string, unknown>;

function roc(series: Series, period: number): (number | null)[] {
  return series.map((value, i) => {
    const previous = series[i - period];
    return value === null ||
      previous === null ||
      previous === undefined ||
      previous === 0
      ? null
      : (value / previous - 1) * 100;
  });
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  chaikin_volatility: roc(
    ema(
      field(frame, "high").map((high, i) => high - field(frame, "low")[i]),
      n(p, "emaPeriod"),
    ),
    n(p, "rocPeriod"),
  ),
});

export default compute;
