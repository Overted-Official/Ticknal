import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ATR } from 'technicalindicators';
import { atr, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const values = ATR.calculate({ high: frame.bars.map((bar) => bar.high), low: frame.bars.map((bar) => bar.low),
      close: frame.bars.map((bar) => bar.close), period: n(p, 'period') });
    return { atr: [...Array(frame.bars.length - values.length).fill(null), ...values] };
  }
  return { atr: atr(field(frame, "high"), field(frame, "low"), field(frame, "close"), n(p, "period")) };
};

export default compute;
