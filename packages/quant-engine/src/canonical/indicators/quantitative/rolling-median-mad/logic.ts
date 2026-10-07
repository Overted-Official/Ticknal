import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, median, n, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    med = windowMap(source, n(p, "period"), (window) => median(window)),
    mad = source.map((_, i) =>
      med[i] === null || i + 1 < n(p, "period")
        ? null
        : median(
            source
              .slice(i - n(p, "period") + 1, i + 1)
              .map((value) => Math.abs(value - med[i]!)),
          ),
    );
  return {
    median: med,
    mad,
    robust_z: source.map((value, i) =>
      med[i] === null || mad[i] === null || mad[i] === 0
        ? null
        : (0.6745 * (value - med[i]!)) / mad[i]!,
    ),
  };
};

export default compute;
