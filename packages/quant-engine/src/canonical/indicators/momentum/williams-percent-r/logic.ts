import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { WilliamsR } from 'technicalindicators';
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const values = WilliamsR.calculate({ high: frame.bars.map((bar) => bar.high), low: frame.bars.map((bar) => bar.low),
      close: frame.bars.map((bar) => bar.close), period: n(p, 'period') });
    return { williams_r: [...Array(frame.bars.length - values.length).fill(null), ...values] };
  }
  const high = rollingMax(field(frame, "high"), n(p, "period"));
  const low = rollingMin(field(frame, "low"), n(p, "period"));
  return {
    williams_r: field(frame, "close").map((close, i) =>
      high[i] === null || low[i] === null || high[i] === low[i]
        ? null
        : (-100 * (high[i]! - close)) / (high[i]! - low[i]!),
    ),
  };
};

export default compute;
