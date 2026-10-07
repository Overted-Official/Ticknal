import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { bollinger, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  bollinger(field(frame, "close"), n(p, "period"), n(p, "deviation"));

export default compute;
