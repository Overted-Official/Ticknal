import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, map2, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const first = ema(values(frame, "close"), n(p, "period"));
  const second = ema(first, n(p, "period"));
  return { dema: map2(first, second, (a, b) => 2 * a - b) };
};

export default compute;
