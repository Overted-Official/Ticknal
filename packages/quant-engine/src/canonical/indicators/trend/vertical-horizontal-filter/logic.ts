import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  difference,
  map2,
  n,
  rollingMax,
  rollingMin,
  rollingSum,
  values,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const close = values(frame, "close");
  const range = map2(
    rollingMax(close, period),
    rollingMin(close, period),
    (maximum, minimum) => maximum - minimum,
  );
  const movement = rollingSum(
    difference(close).map((value) => (value === null ? null : Math.abs(value))),
    period,
  );
  return { vhf: map2(range, movement, (a, b) => (b === 0 ? null : a / b)) };
};

export default compute;
