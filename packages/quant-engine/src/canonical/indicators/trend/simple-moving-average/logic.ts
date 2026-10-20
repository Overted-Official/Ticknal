import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { SMA } from 'technicalindicators';
import { n, sma, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const result = SMA.calculate({ values: frame.bars.map((bar) => bar.close), period: n(p, 'period') });
    return { sma: [...Array(frame.bars.length - result.length).fill(null), ...result] };
  }
  return { sma: sma(values(frame, "close"), n(p, "period")) };
};

export default compute;
