import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, sma, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  sma: sma(values(frame, "close"), n(p, "period")),
});

export default compute;
