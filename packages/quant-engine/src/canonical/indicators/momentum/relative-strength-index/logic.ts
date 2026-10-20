import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { RSI } from 'technicalindicators';
import { field, n, rsi } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const values = RSI.calculate({ values: frame.bars.map((bar) => bar.close), period: n(p, 'period') });
    return { rsi: [...Array(frame.bars.length - values.length).fill(null), ...values] };
  }
  return { rsi: rsi(field(frame, "close"), n(p, "period")) };
};

export default compute;
