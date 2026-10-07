import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const close = values(frame, "close");
  const lag = Math.floor((period - 1) / 2);
  const adjusted = close.map((value, i) =>
    i < lag ? null : 2 * value - close[i - lag],
  );
  return { zlema: ema(adjusted, period) };
};

export default compute;
