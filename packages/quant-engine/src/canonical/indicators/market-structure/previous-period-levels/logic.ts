import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, previous } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  prior_open: previous(field(frame, "open")),
  prior_high: previous(field(frame, "high")),
  prior_low: previous(field(frame, "low")),
  prior_close: previous(field(frame, "close")),
});

export default compute;
