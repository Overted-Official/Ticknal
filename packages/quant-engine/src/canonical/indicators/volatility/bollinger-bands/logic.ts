import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { BollingerBands } from 'technicalindicators';
import { bollinger, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const result = BollingerBands.calculate({ values: frame.bars.map((bar) => bar.close), period: n(p, 'period'), stdDev: n(p, 'deviation') });
    const padded = [...Array(frame.bars.length - result.length).fill(null), ...result];
    return { middle: padded.map((value) => value?.middle ?? null), upper: padded.map((value) => value?.upper ?? null),
      lower: padded.map((value) => value?.lower ?? null) };
  }
  return bollinger(field(frame, "close"), n(p, "period"), n(p, "deviation"));
};

export default compute;
