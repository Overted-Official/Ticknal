import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, field, map2, n, rma } from "../shared";
import type { Series } from "../shared";

type Parameters = Record<string, unknown>;

function rollingRsiFromChanges(changes: Series, period: number): Series {
  const gains = changes.map((value) =>
    value === null ? null : Math.max(value, 0),
  );
  const losses = changes.map((value) =>
    value === null ? null : Math.max(-value, 0),
  );
  return map2(rma(gains, period), rma(losses, period), (gain, loss) =>
    loss === 0 ? (gain === 0 ? 50 : 100) : 100 - 100 / (1 + gain / loss),
  );
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  rmi: rollingRsiFromChanges(
    change(field(frame, "close"), n(p, "momentum")),
    n(p, "period"),
  ),
});

export default compute;
