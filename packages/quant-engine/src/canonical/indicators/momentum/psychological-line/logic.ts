import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, field, n, rollingSum } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const rises = change(field(frame, "close")).map((v) =>
    v === null ? null : v > 0 ? 1 : 0,
  );
  return {
    psy_0_100: rollingSum(rises, n(p, "period")).map((value) =>
      value === null ? null : (100 * value) / n(p, "period"),
    ),
  };
};

export default compute;
