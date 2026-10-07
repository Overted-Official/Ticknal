import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, shannonEntropy } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const entropy = shannonEntropy(
    returns(close(frame)),
    n(p, "period"),
    n(p, "bins"),
  );
  return {
    entropy: entropy.map((value) =>
      value === null ? null : value * Math.log(n(p, "bins")),
    ),
    normalized_entropy: entropy,
  };
};

export default compute;
