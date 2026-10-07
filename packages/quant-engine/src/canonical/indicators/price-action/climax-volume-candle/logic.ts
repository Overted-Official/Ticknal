import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { direction, n, ranges, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const range = ranges(frame);
  const rangeMean = sma(range, n(p, "period"));
  const volume = frame.bars.map((bar) => bar.volume);
  const volumeMean = sma(volume, n(p, "period"));
  const climax = frame.bars.map((bar, i) =>
    rangeMean[i] === null ||
    volumeMean[i] === null ||
    bar.volume === null ||
    rangeMean[i] === 0 ||
    volumeMean[i] === 0
      ? null
      : range[i] / rangeMean[i]! >= n(p, "rangeRatio") &&
        bar.volume / volumeMean[i]! >= n(p, "volumeRatio"),
  );
  return {
    bullish: climax.map((value, i) =>
      value === null ? null : value && direction(frame, i) > 0,
    ),
    bearish: climax.map((value, i) =>
      value === null ? null : value && direction(frame, i) < 0,
    ),
    exhaustion: climax,
  };
};

export default compute;
