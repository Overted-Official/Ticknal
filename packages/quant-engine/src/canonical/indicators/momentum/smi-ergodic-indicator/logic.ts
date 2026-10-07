import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, doubleSmoothedRatio, ema, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const momentum = change(field(frame, "close"));
  const smi = doubleSmoothedRatio(
    momentum,
    momentum.map((v) => (v === null ? null : Math.abs(v))),
    n(p, "long"),
    n(p, "short"),
  );
  return { smi, signal: ema(smi, n(p, "signal")) };
};

export default compute;
