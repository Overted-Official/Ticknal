import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { annualized, field, logReturns, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  volatility_pct: annualized(
    logReturns(field(frame, "close")),
    n(p, "period"),
    n(p, "annualization"),
  ),
});

export default compute;
