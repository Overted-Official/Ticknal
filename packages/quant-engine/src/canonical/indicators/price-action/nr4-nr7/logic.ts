import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ranges } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const range = ranges(frame);
  const narrowest = (period: number) =>
    range.map((value, i) =>
      i + 1 < period
        ? null
        : value <= Math.min(...range.slice(i - period + 1, i + 1)),
    );
  return { nr4: narrowest(4), nr7: narrowest(7) };
};

export default compute;
