import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingSum, sma, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const close = values(frame, "close");
  const average = sma(close, period);
  const positive = map2(close, average, (price, mean) =>
    Math.max(price - mean, 0),
  );
  const negative = map2(close, average, (price, mean) =>
    Math.max(mean - price, 0),
  );
  const half = Math.max(1, Math.floor(period / 2));
  return {
    tii_0_100: map2(
      rollingSum(positive, half),
      rollingSum(negative, half),
      (up, down) => (up + down === 0 ? 50 : (100 * up) / (up + down)),
    ),
  };
};

export default compute;
