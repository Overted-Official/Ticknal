import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, mean, n, regression, returns, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  scaling_exponent: windowMap(
    returns(close(frame)),
    n(p, "period"),
    (window) => {
      const fluctuation = (size: number) => {
        const chunks: number[] = [];
        for (let start = 0; start + size <= window.length; start += size) {
          const segment = window.slice(start, start + size);
          const fit = regression(segment, size).residual.at(-1);
          const residuals = segment.map(
            (value, i) =>
              value -
              (segment[0] +
                ((segment.at(-1)! - segment[0]) * i) / Math.max(1, size - 1)),
          );
          chunks.push(mean(residuals.map((value) => value ** 2)));
        }
        return Math.sqrt(mean(chunks));
      };
      const small = Math.max(4, Math.floor(window.length / 8)),
        large = Math.max(small + 1, Math.floor(window.length / 4)),
        f1 = fluctuation(small),
        f2 = fluctuation(large);
      return f1 <= 0 || f2 <= 0
        ? null
        : Math.log(f2 / f1) / Math.log(large / small);
    },
  ),
});

export default compute;
