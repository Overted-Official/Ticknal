import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, windowMap } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  dimension_1_2: windowMap(close(frame), n(p, "period"), (window) => {
    let length = 0;
    for (let i = 1; i < window.length; i += 1)
      length += Math.abs(window[i] - window[i - 1]);
    const diameter = Math.max(
      ...window.map((value) => Math.abs(value - window[0])),
    );
    return length === 0 || diameter === 0
      ? 1
      : Math.min(
          2,
          Math.max(
            1,
            Math.log10(window.length) /
              (Math.log10(window.length) + Math.log10(diameter / length)),
          ),
        );
  }),
});

export default compute;
