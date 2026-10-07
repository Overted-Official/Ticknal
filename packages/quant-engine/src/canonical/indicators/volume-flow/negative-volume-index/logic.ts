import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, n, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close"),
    volume = volumes(frame);
  const nvi: (number | null)[] = Array(close.length).fill(null);
  if (close.length > 0) nvi[0] = 1000;
  for (let i = 1; i < close.length; i += 1)
    nvi[i] =
      volume[i] === null || volume[i - 1] === null || close[i - 1] === 0
        ? null
        : volume[i]! < volume[i - 1]!
          ? nvi[i - 1]! * (1 + (close[i] / close[i - 1] - 1))
          : nvi[i - 1];
  return { nvi, signal: ema(nvi, n(p, "signalPeriod")) };
};

export default compute;
