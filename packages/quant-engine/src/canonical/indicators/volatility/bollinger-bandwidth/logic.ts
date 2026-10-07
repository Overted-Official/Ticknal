import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bollinger, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const bands = bollinger(
    field(frame, "close"),
    n(p, "period"),
    n(p, "deviation"),
  );
  return {
    bandwidth_pct: bands.middle.map((middle, i) =>
      middle === null ||
      middle === 0 ||
      bands.upper[i] === null ||
      bands.lower[i] === null
        ? null
        : (100 * (bands.upper[i]! - bands.lower[i]!)) / middle,
    ),
  };
};

export default compute;
