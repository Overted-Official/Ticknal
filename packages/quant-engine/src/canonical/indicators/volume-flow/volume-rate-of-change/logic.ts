import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, roc, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  volume_roc_pct: roc(volumes(frame), n(p, "period")),
});

export default compute;
