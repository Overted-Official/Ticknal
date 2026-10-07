import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => ({
  volume: volumes(frame),
});

export default compute;
