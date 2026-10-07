import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, field, map2, n, rollingMax, rollingMin } from "../shared";
import type { Series } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const macd = map2(
    ema(close, n(p, "fast")),
    ema(close, n(p, "slow")),
    (a, b) => a - b,
  );
  const normalize = (series: Series) =>
    map2(
      map2(series, rollingMin(series, n(p, "cycle")), (a, b) => a - b),
      map2(
        rollingMax(series, n(p, "cycle")),
        rollingMin(series, n(p, "cycle")),
        (a, b) => a - b,
      ),
      (a, b) => (b === 0 ? 0 : (100 * a) / b),
    );
  const first = ema(normalize(macd), n(p, "smoothing"));
  return { stc: ema(normalize(first), n(p, "smoothing")) };
};

export default compute;
