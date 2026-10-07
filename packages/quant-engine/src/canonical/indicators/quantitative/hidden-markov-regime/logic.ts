import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, rollingStdDev } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    sd = rollingStdDev(ret, n(p, "period"));
  let probabilities = [0.25, 0.25, 0.25, 0.25];
  const outputs = [[], [], [], []] as (number | null)[][];
  const state: (string | null)[] = [];
  for (let i = 0; i < ret.length; i += 1) {
    if (ret[i] === null || sd[i] === null || sd[i] === 0) {
      outputs.forEach((series) => series.push(null));
      state.push(null);
      continue;
    }
    const z = ret[i]! / sd[i]!,
      emissions = [
        Math.exp(-0.5 * (z - 0.75) ** 2),
        Math.exp(-0.5 * (z + 0.75) ** 2),
        Math.exp((-0.5 * z ** 2) / 0.25),
        Math.exp((-0.5 * z ** 2) / 4),
      ];
    const predicted = probabilities.map(
      (value, index) => 0.85 * value + (0.15 * (1 - value)) / 3,
    );
    const raw = predicted.map((value, index) => value * emissions[index]);
    const total = raw.reduce((a, b) => a + b, 0);
    probabilities = raw.map((value) => value / total);
    outputs.forEach((series, index) => series.push(probabilities[index]));
    state.push(
      ["bull", "bear", "calm", "volatile"][
        probabilities.indexOf(Math.max(...probabilities))
      ],
    );
  }
  return {
    bull_probability: outputs[0],
    bear_probability: outputs[1],
    calm_probability: outputs[2],
    volatile_probability: outputs[3],
    active_state: state,
  };
};

export default compute;
