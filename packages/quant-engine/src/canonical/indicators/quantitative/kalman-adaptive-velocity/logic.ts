import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, map2, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const source = close(frame),
    estimate: (number | null)[] = Array(source.length).fill(null),
    velocity: (number | null)[] = Array(source.length).fill(null),
    uncertainty: (number | null)[] = Array(source.length).fill(null),
    shock: (number | null)[] = Array(source.length).fill(null);
  let x = source[0] ?? 0,
    v = 0,
    varianceState = 1;
  for (let i = 0; i < source.length; i += 1) {
    const predicted = x + v;
    varianceState += n(p, "processNoise");
    const innovation = source[i] - predicted;
    const innovationVariance = varianceState + n(p, "measurementNoise");
    const gain = varianceState / innovationVariance;
    const updated = predicted + gain * innovation;
    v = 0.8 * v + 0.2 * (updated - x);
    x = updated;
    varianceState = (1 - gain) * varianceState;
    estimate[i] = x;
    velocity[i] = v;
    uncertainty[i] = Math.sqrt(varianceState);
    shock[i] = innovation / Math.sqrt(innovationVariance);
  }
  return {
    mean: estimate,
    velocity,
    upper: map2(estimate, uncertainty, (a, b) => a + n(p, "bandMultiple") * b),
    lower: map2(estimate, uncertainty, (a, b) => a - n(p, "bandMultiple") * b),
    shock_z: shock,
  };
};

export default compute;
