import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { OBV } from 'technicalindicators';
import { field, n, sma, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const values = OBV.calculate({ close: frame.bars.map((bar) => bar.close), volume: frame.bars.map((bar) => bar.volume ?? 0) });
    const obv = [...Array(frame.bars.length - values.length).fill(null), ...values];
    return { obv, smoothed_obv: sma(obv, n(p, 'smoothing')) };
  }
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
