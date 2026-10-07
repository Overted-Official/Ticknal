import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import {
  atr,
  bollinger,
  ema,
  field,
  linearRegressionEnd,
  map2,
  n,
  rollingMax,
  rollingMin,
  sma,
} from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const period = n(p, "period");
  const bands = bollinger(close, period, n(p, "bollingerDeviation"));
  const middle = ema(close, period);
  const range = atr(field(frame, "high"), field(frame, "low"), close, period);
  const kUpper = map2(
    middle,
    range,
    (a, b) => a + n(p, "keltnerMultiplier") * b,
  );
  const kLower = map2(
    middle,
    range,
    (a, b) => a - n(p, "keltnerMultiplier") * b,
  );
  const on = close.map((_, i) =>
    bands.upper[i] === null ||
    bands.lower[i] === null ||
    kUpper[i] === null ||
    kLower[i] === null
      ? null
      : bands.upper[i]! < kUpper[i]! && bands.lower[i]! > kLower[i]!,
  );
  const basis = map2(
    map2(
      rollingMax(field(frame, "high"), period),
      rollingMin(field(frame, "low"), period),
      (a, b) => (a + b) / 2,
    ),
    sma(close, period),
    (a, b) => (a + b) / 2,
  );
  const momentum = linearRegressionEnd(
    map2(close, basis, (a, b) => a - b),
    period,
  );
  return {
    squeeze_on: on,
    squeeze_off: on.map((value) => (value === null ? null : !value)),
    momentum,
  };
};

export default compute;
