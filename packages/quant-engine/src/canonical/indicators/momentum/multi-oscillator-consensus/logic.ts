import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, meanDeviation, n, roc, rsi, sma, stochastic } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const period = n(p, "period");
  const close = field(frame, "close");
  const rsiValues = rsi(close, period);
  const stoch = stochastic(
    close,
    field(frame, "high"),
    field(frame, "low"),
    period,
    1,
    1,
  ).percentK;
  const typical = close.map(
    (value, i) =>
      (value + field(frame, "high")[i] + field(frame, "low")[i]) / 3,
  );
  const average = sma(typical, period);
  const deviation = meanDeviation(typical, average, period);
  const cci = typical.map((value, i) =>
    average[i] === null || deviation[i] === null || deviation[i] === 0
      ? null
      : (value - average[i]!) / (0.015 * deviation[i]!),
  );
  const rate = roc(close, period);
  const score = close.map((_, i) =>
    [
      rsiValues[i] === null ? null : rsiValues[i]! > 50 ? 1 : -1,
      stoch[i] === null ? null : stoch[i]! > 50 ? 1 : -1,
      cci[i] === null ? null : cci[i]! > 0 ? 1 : -1,
      rate[i] === null ? null : rate[i]! > 0 ? 1 : -1,
    ].some((v) => v === null)
      ? null
      : [
          rsiValues[i]! > 50 ? 1 : -1,
          stoch[i]! > 50 ? 1 : -1,
          cci[i]! > 0 ? 1 : -1,
          rate[i]! > 0 ? 1 : -1,
        ].reduce((a, b) => a + b, 0),
  );
  return {
    score,
    state: score.map((value) =>
      value === null
        ? null
        : value >= 3
          ? "bullish"
          : value <= -3
            ? "bearish"
            : "neutral",
    ),
  };
};

export default compute;
