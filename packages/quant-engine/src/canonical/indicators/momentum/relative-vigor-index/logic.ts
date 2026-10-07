import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, map2, n, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const body = field(frame, "close").map(
    (close, i) => close - field(frame, "open")[i],
  );
  const range = field(frame, "high").map(
    (high, i) => high - field(frame, "low")[i],
  );
  const rvi = map2(
    sma(body, n(p, "period")),
    sma(range, n(p, "period")),
    (a, b) => (b === 0 ? null : a / b),
  );
  return { rvi, signal: sma(rvi, n(p, "signal")) };
};

export default compute;
