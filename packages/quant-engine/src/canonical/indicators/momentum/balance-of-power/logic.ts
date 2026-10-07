import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const raw = field(frame, "close").map((close, i) => {
    const range = field(frame, "high")[i] - field(frame, "low")[i];
    return range === 0 ? null : (close - field(frame, "open")[i]) / range;
  });
  return { bop: sma(raw, n(p, "smoothing")) };
};

export default compute;
