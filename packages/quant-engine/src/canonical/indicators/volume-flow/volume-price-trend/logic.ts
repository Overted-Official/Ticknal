import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const close = field(frame, "close"),
    volume = volumes(frame);
  let total = 0;
  return {
    vpt: close.map((value, i) => {
      if (i === 0 || volume[i] === null || close[i - 1] === 0)
        return i === 0 ? 0 : null;
      total += volume[i]! * (value / close[i - 1] - 1);
      return total;
    }),
  };
};

export default compute;
