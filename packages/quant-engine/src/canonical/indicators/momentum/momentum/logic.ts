import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  momentum: change(field(frame, "close"), n(p, "period")),
});

export default compute;
