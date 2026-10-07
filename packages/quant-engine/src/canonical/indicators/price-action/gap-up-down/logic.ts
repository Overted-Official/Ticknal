import type { CategoryIndicatorSpec } from "../../shared/category-definition";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const gapDirection = frame.bars.map((bar, i) =>
    i === 0
      ? null
      : bar.low > frame.bars[i - 1].high
        ? "up"
        : bar.high < frame.bars[i - 1].low
          ? "down"
          : bar.open > frame.bars[i - 1].close
            ? "partial-up"
            : bar.open < frame.bars[i - 1].close
              ? "partial-down"
              : "none",
  );
  return {
    full_gap: gapDirection.map((value) =>
      value === null ? null : value === "up" || value === "down",
    ),
    partial_gap: gapDirection.map((value) =>
      value === null
        ? null
        : value === "partial-up" || value === "partial-down",
    ),
    direction: gapDirection,
  };
};

export default compute;
