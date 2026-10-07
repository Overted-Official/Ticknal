import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const body = field(frame, "close").map(
    (close, i) => close - field(frame, "open")[i],
  );
  const up = body.map((v) => Math.max(v, 0));
  const down = body.map((v) => Math.max(-v, 0));
  return {
    imi: map2(
      rollingSum(up, n(p, "period")),
      rollingSum(down, n(p, "period")),
      (a, b) => (a + b === 0 ? 50 : (100 * a) / (a + b)),
    ),
  };
};

export default compute;
