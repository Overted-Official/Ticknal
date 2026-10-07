import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, sma, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const volumeRatio = map2(
    volumes(frame),
    sma(volumes(frame), n(p, "period")),
    (a, b) => (b === 0 ? null : a / b),
  );
  const ranges = frame.bars.map((bar) => bar.high - bar.low);
  const rangeRatio = map2(ranges, sma(ranges, n(p, "period")), (a, b) =>
    b === 0 ? null : a / b,
  );
  const absorption = map2(volumeRatio, rangeRatio, (a, b) =>
    b === 0 ? null : a / b,
  );
  return {
    absorption,
    state: absorption.map((value, i) =>
      value === null
        ? null
        : value > 1.5
          ? frame.bars[i].close >= frame.bars[i].open
            ? "bullish-absorption"
            : "bearish-absorption"
          : "normal",
    ),
  };
};

export default compute;
