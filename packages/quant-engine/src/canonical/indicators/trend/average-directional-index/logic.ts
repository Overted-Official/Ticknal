import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ADX } from 'technicalindicators';
import { directionalMovement, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  if (p.mode === 'legacy-technicalindicators') {
    const values = ADX.calculate({ high: frame.bars.map((bar) => bar.high), low: frame.bars.map((bar) => bar.low),
      close: frame.bars.map((bar) => bar.close), period: n(p, 'period') });
    const padded = [...Array(frame.bars.length - values.length).fill(null), ...values];
    return { adx: padded.map((value) => value?.adx ?? null), plus_di: padded.map((value) => value?.pdi ?? null),
      minus_di: padded.map((value) => value?.mdi ?? null) };
  }
  const { adx, plusDi, minusDi } = directionalMovement(frame, n(p, "period"));
  return { adx, plus_di: plusDi, minus_di: minusDi };
};

export default compute;
