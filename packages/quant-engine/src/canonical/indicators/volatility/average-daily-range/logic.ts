import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const adr = sma(
    field(frame, "high").map((high, i) => high - field(frame, "low")[i]),
    n(p, "period"),
  );
  return {
    adr,
    adr_pct: map2(adr, field(frame, "close"), (a, b) =>
      b === 0 ? null : (100 * a) / b,
    ),
  };
};

export default compute;
