import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, stochastic } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const result = stochastic(
    field(frame, "close"),
    field(frame, "high"),
    field(frame, "low"),
    n(p, "period"),
    n(p, "smoothK"),
    n(p, "smoothD"),
  );
  return { percent_k: result.percentK, percent_d: result.percentD };
};

export default compute;
