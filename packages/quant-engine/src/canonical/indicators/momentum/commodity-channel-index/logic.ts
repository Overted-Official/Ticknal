import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, meanDeviation, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const typical = field(frame, "close").map(
    (close, i) =>
      (field(frame, "high")[i] + field(frame, "low")[i] + close) / 3,
  );
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
