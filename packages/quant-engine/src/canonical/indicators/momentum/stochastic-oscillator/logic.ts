import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { SMA, Stochastic } from 'technicalindicators';
import { field, n, stochastic } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const smoothK = n(p, 'smoothK');
    const values = Stochastic.calculate({ high: frame.bars.map((bar) => bar.high), low: frame.bars.map((bar) => bar.low),
      close: frame.bars.map((bar) => bar.close), period: n(p, 'period'), signalPeriod: n(p, 'smoothD') });
    if (smoothK > 1) {
      const raw = values.map((value) => value.k);
      const smoothedK = SMA.calculate({ values: raw, period: smoothK });
      const smoothedD = SMA.calculate({ values: smoothedK, period: n(p, 'smoothD') });
      return { percent_k: [...Array(frame.bars.length - smoothedK.length).fill(null), ...smoothedK],
        percent_d: [...Array(frame.bars.length - smoothedD.length).fill(null), ...smoothedD] };
    }
    const padded = [...Array(frame.bars.length - values.length).fill(null), ...values];
    return { percent_k: padded.map((value) => value?.k ?? null), percent_d: padded.map((value) => value?.d ?? null) };
  }
  const result = stochastic(
    field(frame, "close"),
    field(frame, "high"),
    field(frame, "low"),
    n(p, "period"),
    n(p, "smoothK"),
    n(p, "smoothD"),
  );
  return { percent_k: result.percentK, percent_d: result.percentD };
};

export default compute;
