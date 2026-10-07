import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { directionalMovement, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const { adx, plusDi, minusDi } = directionalMovement(frame, n(p, "period"));
  return { adx, plus_di: plusDi, minus_di: minusDi };
};

export default compute;
