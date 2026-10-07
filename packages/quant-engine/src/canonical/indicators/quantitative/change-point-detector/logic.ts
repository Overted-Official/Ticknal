import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { changePointScore, close, n, returns } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const score = changePointScore(returns(close(frame)), n(p, "period"));
  return {
    change_event: score.map((value) =>
      value === null ? null : value >= n(p, "threshold"),
    ),
    score,
    state: score.map((value) =>
      value === null ? null : value >= n(p, "threshold") ? "changed" : "stable",
    ),
  };
};

export default compute;
