import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, values } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) =>
  Object.fromEntries(
    [3, 5, 8, 10, 12, 15, 30, 35, 40, 45, 50, 60].map((period) => [
      `ema_${period}`,
      ema(values(frame, "close"), period),
    ]),
  );

export default compute;
