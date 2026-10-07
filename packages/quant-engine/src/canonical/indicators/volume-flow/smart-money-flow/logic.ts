import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { map2, n, sma, trades, typical, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const turnover = map2(typical(frame), volumes(frame), (a, b) => a * b);
  const ats = map2(turnover, trades(frame), (a, b) => (b === 0 ? null : a / b));
  const atsRatio = map2(ats, sma(ats, n(p, "period")), (a, b) =>
    b === 0 ? null : a / b,
  );
  const ranges = frame.bars.map((bar) => bar.high - bar.low);
  const absorption = map2(
    map2(volumes(frame), sma(volumes(frame), n(p, "period")), (a, b) =>
      b === 0 ? null : a / b,
    ),
    map2(ranges, sma(ranges, n(p, "period")), (a, b) =>
      b === 0 ? null : a / b,
    ),
    (a, b) => (b === 0 ? null : a / b),
  );
  const state = absorption.map((value, i) =>
    value === null || atsRatio[i] === null
      ? null
      : value > 1.5 && atsRatio[i]! > 1.2
        ? frame.bars[i].close >= (frame.bars[i].high + frame.bars[i].low) / 2
          ? "accumulation"
          : "distribution"
        : "neutral",
  );
  return {
    ats_ratio: atsRatio,
    absorption,
    state,
    marker: state.map((value) => (value === null ? null : value !== "neutral")),
  };
};

export default compute;
