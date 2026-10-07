import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { directionalMovement, map2, n } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function shift(series: NumberSeries, periods: number): (number | null)[] {
  return series.map((_, index) => series[index - periods] ?? null);
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const adx = directionalMovement(frame, period).adx;
  return { adxr: map2(adx, shift(adx, period), (a, b) => (a + b) / 2) };
};

export default compute;
