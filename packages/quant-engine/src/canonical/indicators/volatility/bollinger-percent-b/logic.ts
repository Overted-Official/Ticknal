import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bollinger, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const bands = bollinger(close, n(p, "period"), n(p, "deviation"));
  return {
    percent_b: close.map((value, i) =>
      bands.upper[i] === null ||
      bands.lower[i] === null ||
      bands.upper[i] === bands.lower[i]
        ? null
        : (100 * (value - bands.lower[i]!)) /
          (bands.upper[i]! - bands.lower[i]!),
    ),
  };
};

export default compute;
