import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bodies, direction, n, ranges } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const length = n(p, "length");
  const match = frame.bars.map((_, i) => {
    if (i + 1 < length) return null;
    const signs = Array.from({ length }, (__, offset) =>
      direction(frame, i - offset),
    );
    const strong = Array.from({ length }, (__, offset) => {
      const j = i - offset;
      return (
        ranges(frame)[j] > 0 &&
        (100 * bodies(frame)[j]) / ranges(frame)[j] >= n(p, "minimumBodyPct")
      );
    });
    return (
      strong.every(Boolean) &&
      (signs.every((value) => value > 0) || signs.every((value) => value < 0))
    );
  });
  return {
    sequence_match: match,
    direction: match.map((value, i) =>
      value === null
        ? null
        : value
          ? direction(frame, i) > 0
            ? "bullish"
            : "bearish"
          : "none",
    ),
  };
};

export default compute;
