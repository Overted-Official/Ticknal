import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const midpoint = frame.bars.map((bar) => (bar.high + bar.low) / 2);
  const eom = midpoint.map((value, i) => {
    const bar = frame.bars[i];
    if (i === 0 || bar.volume === null || bar.volume === 0) return null;
    return (
      ((value - midpoint[i - 1]) * (bar.high - bar.low)) /
      (bar.volume / n(p, "volumeScale"))
    );
  });
  return { eom, smoothed_eom: sma(eom, n(p, "period")) };
};

export default compute;
