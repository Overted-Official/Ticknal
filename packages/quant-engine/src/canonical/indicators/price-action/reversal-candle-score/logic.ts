import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { lowerWick, n, ranges, sma, upperWick } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const range = ranges(frame);
  const volume = frame.bars.map((bar) => bar.volume);
  const volumeMean = sma(volume, n(p, "period"));
  const wick = range.map((value, i) =>
    value === 0
      ? 0
      : (100 * (lowerWick(frame, i) - upperWick(frame, i))) / value,
  );
  const volumeComponent = volume.map((value, i) =>
    value === null || volumeMean[i] === null || volumeMean[i] === 0
      ? null
      : Math.min(2, value / volumeMean[i]!) * 50,
  );
  return {
    score: wick.map((value, i) =>
      volumeComponent[i] === null
        ? null
        : Math.max(
            -100,
            Math.min(100, value * (0.5 + volumeComponent[i]! / 100)),
          ),
    ),
    wick_component: wick,
    volume_component: volumeComponent,
  };
};

export default compute;
