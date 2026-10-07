import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, sampleEntropy } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => ({
  approximate_entropy: sampleEntropy(
    returns(close(frame)),
    n(p, "period"),
    n(p, "dimension"),
    n(p, "tolerance"),
    true,
  ),
});

export default compute;
