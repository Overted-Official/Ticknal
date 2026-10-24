import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, meanDeviation, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = field(frame, "high");
  const low = field(frame, "low");
  const close = field(frame, "close");
  const typical = close.map((value, i) => (high[i] + low[i] + value) / 3);
  const average = sma(typical, n(p, "period"));
  const deviation = meanDeviation(typical, average, n(p, "period"));
  return {
    cci: typical.map((value, i) =>
      average[i] === null || deviation[i] === null || deviation[i] === 0
        ? null
        : (value - average[i]!) / (n(p, "constant") * deviation[i]!),
    ),
  };
};

export default compute;
