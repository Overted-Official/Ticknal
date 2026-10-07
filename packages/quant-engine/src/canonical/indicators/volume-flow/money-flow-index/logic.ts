import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, rollingSum, typical, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const price = typical(frame),
    volume = volumes(frame);
  const positive = price.map((value, i) =>
    i === 0 || volume[i] === null
      ? null
      : value > price[i - 1]
        ? value * volume[i]!
        : 0,
  );
  const negative = price.map((value, i) =>
    i === 0 || volume[i] === null
      ? null
      : value < price[i - 1]
        ? value * volume[i]!
        : 0,
  );
  return {
    mfi_0_100: map2(
      rollingSum(positive, n(p, "period")),
      rollingSum(negative, n(p, "period")),
      (a, b) => (b === 0 ? (a === 0 ? 50 : 100) : 100 - 100 / (1 + a / b)),
    ),
  };
};

export default compute;
