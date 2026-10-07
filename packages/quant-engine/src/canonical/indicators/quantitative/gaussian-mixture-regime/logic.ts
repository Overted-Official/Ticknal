import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    sd = rollingStdDev(ret, n(p, "period"));
  const probabilities = ret.map((value, i) => {
    if (value === null || sd[i] === null || sd[i] === 0) return null;
    const z = Math.abs(value / sd[i]!);
    const raw = [
        Math.exp(-(z ** 2) / 0.5),
        Math.exp(-((z - 1) ** 2) / 0.5),
        Math.exp(-((z - 2.5) ** 2) / 1.5),
      ],
      total = raw.reduce((a, b) => a + b, 0);
    return raw.map((item) => item / total);
  });
  return {
    cluster: probabilities.map((value) =>
      value === null
        ? null
        : ["calm", "trend", "volatile"][value.indexOf(Math.max(...value))],
    ),
    calm_probability: probabilities.map((v) => v?.[0] ?? null),
    trend_probability: probabilities.map((v) => v?.[1] ?? null),
    volatile_probability: probabilities.map((v) => v?.[2] ?? null),
  };
};

export default compute;
