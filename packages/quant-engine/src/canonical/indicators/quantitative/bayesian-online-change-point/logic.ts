import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { close, n, returns, rollingStdDev, sma } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const ret = returns(close(frame)),
    average = sma(ret, n(p, "period")),
    deviation = rollingStdDev(ret, n(p, "period"));
  const probability = ret.map((value, i) =>
    value === null ||
    average[i] === null ||
    deviation[i] === null ||
    deviation[i] === 0
      ? null
      : Math.min(
          1,
          n(p, "hazardPct") / 100 +
            (1 - n(p, "hazardPct") / 100) *
              (1 -
                Math.exp(-0.5 * ((value - average[i]!) / deviation[i]!) ** 2)),
        ),
  );
  let run = 0;
  return {
    change_probability: probability,
    run_length: probability.map((value) => {
      if (value === null) return null;
      run = value > 0.5 ? 0 : run + 1;
      return run;
    }),
  };
};

export default compute;
