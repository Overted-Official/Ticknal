import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { n, supertrend, upperSeededSupertrend } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) =>
  p.seedMode === 'upper-band-first'
    ? upperSeededSupertrend(frame, n(p, 'period'), n(p, 'multiplier'))
    : supertrend(frame, n(p, 'period'), n(p, 'multiplier'));

export default compute;
