import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, values } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function macdSeries(
  series: NumberSeries,
  fast: number,
  slow: number,
  signalPeriod: number,
) {
  const macd = map2(
    ema(series, fast),
    ema(series, slow),
    (fastValue, slowValue) => fastValue - slowValue,
  );
  const signal = ema(macd, signalPeriod);
  return {
    macd,
    signal,
    histogram: map2(macd, signal, (value, signalValue) => value - signalValue),
  };
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  macdSeries(
    values(frame, "close"),
    n(p, "fast"),
    n(p, "slow"),
    n(p, "signal"),
  );

export default compute;
