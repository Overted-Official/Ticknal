import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, rollingMax, rollingMin } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const high = rollingMax(field(frame, "high"), n(p, "period")),
    low = rollingMin(field(frame, "low"), n(p, "period")),
    close = field(frame, "close");
  const bullish = close.map((value, i) =>
    i === 0 || high[i - 1] === null ? null : value > high[i - 1]!,
  );
  const bearish = close.map((value, i) =>
    i === 0 || low[i - 1] === null ? null : value < low[i - 1]!,
  );
  return {
    bullish_bos: bullish,
    bearish_bos: bearish,
    level: close.map((_, i) =>
      bullish[i] ? high[i - 1]! : bearish[i] ? low[i - 1]! : null,
    ),
  };
};

export default compute;
