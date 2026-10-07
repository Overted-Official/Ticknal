import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, ema, n, returns, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    smooth = ema(source, n(p, "smoothing")),
    velocity = smooth.map((value, i) =>
      value === null || smooth[i - 1] === null || smooth[i - 1] === undefined
        ? null
        : value - smooth[i - 1]!,
    );
  const noise = rollingStdDev(returns(source), n(p, "smoothing"));
  const confidence = velocity.map((value, i) =>
    value === null || noise[i] === null || source[i] === 0
      ? null
      : Math.min(1, Math.abs(value / source[i]) / Math.max(noise[i]!, 1e-12)),
  );
  return {
    direction: velocity.map((value) =>
      value === null
        ? null
        : value > 0
          ? "bullish"
          : value < 0
            ? "bearish"
            : "neutral",
    ),
    confidence,
    velocity,
  };
};

export default compute;
