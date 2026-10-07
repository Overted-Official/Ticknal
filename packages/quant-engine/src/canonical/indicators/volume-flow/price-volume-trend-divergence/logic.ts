import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { divergence, field, n, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close"),
    volume = volumes(frame);
  let total = 0;
  const vpt = close.map((value, i) => {
    if (i === 0 || volume[i] === null || close[i - 1] === 0)
      return i === 0 ? 0 : null;
    total += volume[i]! * (value / close[i - 1] - 1);
    return total;
  });
  return divergence(close, vpt, n(p, "left"), n(p, "right"));
};

export default compute;
