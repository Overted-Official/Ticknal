import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n, roc, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const parts = [1, 2, 3, 4].map((index) =>
    sma(roc(close, n(p, `roc${index}`)), n(p, `smooth${index}`)),
  );
  const kst = close.map((_, i) =>
    parts.some((part) => part[i] === null)
      ? null
      : parts.reduce((sum, part, index) => sum + part[i]! * (index + 1), 0),
  );
  return { kst, signal: sma(kst, n(p, "signal")) };
};

export default compute;
