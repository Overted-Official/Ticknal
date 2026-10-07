import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, n, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = values(frame, "close");
  const lines = ["short", "medium", "long", "anchor"].map((key) =>
    ema(close, n(p, key)),
  );
  return {
    compression_pct: close.map((_, i) => {
      const observed = lines.map((line) => line[i]);
      if (observed.some((value) => value === null)) return null;
      const nums = observed as number[];
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      return mean === 0
        ? null
        : ((Math.max(...nums) - Math.min(...nums)) / mean) * 100;
    }),
  };
};

export default compute;
