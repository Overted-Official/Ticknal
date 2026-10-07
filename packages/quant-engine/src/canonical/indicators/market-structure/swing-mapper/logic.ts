import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { atr, field, n } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const close = field(frame, "close");
  const range = atr(
    field(frame, "high"),
    field(frame, "low"),
    close,
    n(p, "atrPeriod"),
  );
  const highs: (number | null)[] = Array(close.length).fill(null),
    lows: (number | null)[] = Array(close.length).fill(null),
    direction: (string | null)[] = Array(close.length).fill(null);
  let bullish = true,
    extreme = close[0] ?? 0;
  for (let i = 0; i < close.length; i += 1) {
    if (range[i] === null) continue;
    if (bullish) {
      if (close[i] >= extreme) extreme = close[i];
      else if (extreme - close[i] >= n(p, "multiplier") * range[i]!) {
        highs[i] = extreme;
        bullish = false;
        extreme = close[i];
      }
    } else {
      if (close[i] <= extreme) extreme = close[i];
      else if (close[i] - extreme >= n(p, "multiplier") * range[i]!) {
        lows[i] = extreme;
        bullish = true;
        extreme = close[i];
      }
    }
    direction[i] = bullish ? "bullish" : "bearish";
  }
  return { swing_high: highs, swing_low: lows, direction };
};

export default compute;
