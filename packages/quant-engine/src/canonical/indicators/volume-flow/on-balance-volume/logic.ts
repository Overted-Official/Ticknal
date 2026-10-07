import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close"),
    volume = volumes(frame);
  let total = 0;
  const obv = close.map((value, i) => {
    if (volume[i] === null) return null;
    if (i === 0 || value > close[i - 1]) total += volume[i]!;
    else if (value < close[i - 1]) total -= volume[i]!;
    return total;
  });
  return { obv, smoothed_obv: sma(obv, n(p, "smoothing")) };
};

export default compute;
