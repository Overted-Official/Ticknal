import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, rma, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  rma: rma(values(frame, "close"), n(p, "period")),
});

export default compute;
