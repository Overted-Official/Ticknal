import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, values } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function framaSeries(
  high: NumberSeries,
  low: NumberSeries,
  period: number,
): NumberSeries {
  const output: (number | null)[] = Array(high.length).fill(null);
  const evenPeriod = period % 2 === 0 ? period : period + 1;
  const half = evenPeriod / 2;
  for (let index = evenPeriod - 1; index < high.length; index += 1) {
    const ranges = (
      start: number,
      end: number,
      divisor: number,
    ): number | null => {
      const highs = high.slice(start, end + 1);
      const lows = low.slice(start, end + 1);
      if (
        highs.some((value) => value === null) ||
        lows.some((value) => value === null)
      )
        return null;
      return (
        (Math.max(...(highs as number[])) - Math.min(...(lows as number[]))) /
        divisor
      );
    };
    const n1 = ranges(index - evenPeriod + 1, index - half, half);
    const n2 = ranges(index - half + 1, index, half);
    const n3 = ranges(index - evenPeriod + 1, index, evenPeriod);
    const price =
      high[index] === null || low[index] === null
        ? null
        : (high[index]! + low[index]!) / 2;
    if (n1 === null || n2 === null || n3 === null || price === null) continue;
    const dimension =
      n1 + n2 > 0 && n3 > 0
        ? (Math.log(n1 + n2) - Math.log(n3)) / Math.log(2)
        : 1;
    const alpha = Math.max(0.01, Math.min(1, Math.exp(-4.6 * (dimension - 1))));
    const previous = output[index - 1] ?? price;
    output[index] = alpha * price + (1 - alpha) * previous;
  }
  return output;
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  frama: framaSeries(
    values(frame, "high"),
    values(frame, "low"),
    n(p, "period"),
  ),
});

export default compute;
