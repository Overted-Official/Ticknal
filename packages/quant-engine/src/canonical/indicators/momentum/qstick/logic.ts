import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  qstick: sma(
    field(frame, "close").map((close, i) => close - field(frame, "open")[i]),
    n(p, "period"),
  ),
});

export default compute;
