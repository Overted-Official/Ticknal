import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const result: (number | null)[] = Array(close.length).fill(null);
  let l0 = close[0] ?? 0;
  let l1 = l0;
  let l2 = l0;
  let l3 = l0;
  const gamma = n(p, "gamma");
  for (let i = 1; i < close.length; i += 1) {
    const old0 = l0,
      old1 = l1,
      old2 = l2;
    l0 = (1 - gamma) * close[i] + gamma * old0;
    l1 = -gamma * l0 + old0 + gamma * old1;
    l2 = -gamma * l1 + old1 + gamma * old2;
    l3 = -gamma * l2 + old2 + gamma * l3;
    const levels = [l0, l1, l2, l3];
    let up = 0,
      down = 0;
    for (let j = 0; j < 3; j += 1) {
      const delta = levels[j] - levels[j + 1];
      if (delta >= 0) up += delta;
      else down -= delta;
    }
    result[i] = up + down === 0 ? 50 : (100 * up) / (up + down);
  }
  return { laguerre_rsi: result };
};

export default compute;
