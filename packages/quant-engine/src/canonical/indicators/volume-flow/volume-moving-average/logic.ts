import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, sma, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  volume_ma: sma(volumes(frame), n(p, "period")),
});

export default compute;
