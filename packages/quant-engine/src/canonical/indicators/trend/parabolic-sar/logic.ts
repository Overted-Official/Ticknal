import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, parabolicSar } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  parabolicSar(frame, n(p, "stepPct") / 100, n(p, "maximumPct") / 100);

export default compute;
