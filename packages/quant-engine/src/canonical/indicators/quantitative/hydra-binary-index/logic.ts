import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, ema, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    fast = ema(source, n(p, "fast")),
    slow = ema(source, n(p, "slow")),
    continuous = map2(fast, slow, (a, b) =>
      b === 0 ? null : 100 * (a / b - 1),
    ),
    signal = ema(continuous, n(p, "signal")),
    state = map2(continuous, signal, (a, b) => (a > b ? 1 : 0));
  return {
    continuous_value: continuous,
    binary_state: state.map((value) => (value === null ? null : value === 1)),
    cross_up: state.map((value, i) =>
      i === 0 || value === null || state[i - 1] === null
        ? null
        : value === 1 && state[i - 1] === 0,
    ),
    cross_down: state.map((value, i) =>
      i === 0 || value === null || state[i - 1] === null
        ? null
        : value === 0 && state[i - 1] === 1,
    ),
  };
};

export default compute;
