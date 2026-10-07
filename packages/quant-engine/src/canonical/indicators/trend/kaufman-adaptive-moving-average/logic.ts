import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, values } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function adaptiveKama(
  series: NumberSeries,
  efficiencyPeriod: number,
  fast: number,
  slow: number,
): NumberSeries {
  const output: (number | null)[] = Array(series.length).fill(null);
  const fastConstant = 2 / (fast + 1);
  const slowConstant = 2 / (slow + 1);
  for (let index = efficiencyPeriod; index < series.length; index += 1) {
    const current = series[index];
    const past = series[index - efficiencyPeriod];
    if (current === null || past === null) continue;
    let volatility = 0;
    let valid = true;
    for (
      let cursor = index - efficiencyPeriod + 1;
      cursor <= index;
      cursor += 1
    ) {
      const now = series[cursor];
      const prior = series[cursor - 1];
      if (now === null || prior === null) {
        valid = false;
        break;
      }
      volatility += Math.abs(now - prior);
    }
    if (!valid) continue;
    const efficiency =
      volatility === 0 ? 0 : Math.abs(current - past) / volatility;
    const smoothing =
      (efficiency * (fastConstant - slowConstant) + slowConstant) ** 2;
    const previous = output[index - 1] ?? past;
    output[index] = previous + smoothing * (current - previous);
  }
  return output;
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  kama: adaptiveKama(
    values(frame, "close"),
    n(p, "efficiencyPeriod"),
    n(p, "fast"),
    n(p, "slow"),
  ),
});

export default compute;
