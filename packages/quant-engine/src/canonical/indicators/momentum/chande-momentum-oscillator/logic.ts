import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, field, map2, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const changes = change(field(frame, "close"));
  const gains = changes.map((v) => (v === null ? null : Math.max(v, 0)));
  const losses = changes.map((v) => (v === null ? null : Math.max(-v, 0)));
  return {
    cmo: map2(
      rollingSum(gains, n(p, "period")),
      rollingSum(losses, n(p, "period")),
      (gain, loss) =>
        gain + loss === 0 ? 0 : (100 * (gain - loss)) / (gain + loss),
    ),
  };
};

export default compute;
