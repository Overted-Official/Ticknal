import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, field, map2, n, rma, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const deviation = rollingStdDev(close, n(p, "period"));
  const direction = change(close);
  const up = deviation.map((value, i) =>
    value === null || direction[i] === null
      ? null
      : direction[i]! > 0
        ? value
        : 0,
  );
  const down = deviation.map((value, i) =>
    value === null || direction[i] === null
      ? null
      : direction[i]! <= 0
        ? value
        : 0,
  );
  return {
    rvi_0_100: map2(
      rma(up, n(p, "smoothing")),
      rma(down, n(p, "smoothing")),
      (a, b) => (a + b === 0 ? 50 : (100 * a) / (a + b)),
    ),
  };
};

export default compute;
