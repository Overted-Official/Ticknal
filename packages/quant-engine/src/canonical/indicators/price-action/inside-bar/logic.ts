import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { nullableEvents } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  inside_bar: nullableEvents(
    frame,
    1,
    (i) =>
      frame.bars[i].high <= frame.bars[i - 1].high &&
      frame.bars[i].low >= frame.bars[i - 1].low,
  ),
  mother_range: frame.bars.map((_, i) =>
    i === 0 ? null : frame.bars[i - 1].high - frame.bars[i - 1].low,
  ),
});

export default compute;
