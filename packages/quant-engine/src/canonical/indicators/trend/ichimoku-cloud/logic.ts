import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingMax, rollingMin, values } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function midpoint(
  high: NumberSeries,
  low: NumberSeries,
  period: number,
): NumberSeries {
  return map2(
    rollingMax(high, period),
    rollingMin(low, period),
    (maximum, minimum) => (maximum + minimum) / 2,
  );
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = values(frame, "high");
  const low = values(frame, "low");
  const close = values(frame, "close");
  const tenkan = midpoint(high, low, n(p, "conversion"));
  const kijun = midpoint(high, low, n(p, "base"));
  const spanARaw = map2(tenkan, kijun, (a, b) => (a + b) / 2);
  const spanBRaw = midpoint(high, low, n(p, "span"));
  const displacement = n(p, "displacement");
  const spanA: (number | null)[] = Array(close.length).fill(null);
  const spanB: (number | null)[] = Array(close.length).fill(null);
  const chikou: (number | null)[] = Array(close.length).fill(null);
  for (let i = 0; i < close.length; i += 1) {
    if (i + displacement < close.length) {
      spanA[i + displacement] = spanARaw[i];
      spanB[i + displacement] = spanBRaw[i];
    }
    if (i - displacement >= 0) chikou[i - displacement] = close[i];
  }
  return { tenkan, kijun, span_a: spanA, span_b: spanB, chikou };
};

export default compute;
