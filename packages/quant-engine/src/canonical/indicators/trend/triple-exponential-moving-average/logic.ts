import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { ema, n, values } from "../shared";
import type { NumberSeries } from "../shared";

type Parameters = Record<string, unknown>;

function map3(
  first: NumberSeries,
  second: NumberSeries,
  third: NumberSeries,
  calculate: (
    first: number,
    second: number,
    third: number,
    index: number,
  ) => number | null,
): (number | null)[] {
  return first.map((firstValue, index) => {
    const secondValue = second[index];
    const thirdValue = third[index];
    if (firstValue === null || secondValue === null || thirdValue === null)
      return null;
    const result = calculate(firstValue, secondValue, thirdValue, index);
    return result !== null && Number.isFinite(result) ? result : null;
  });
}

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const first = ema(values(frame, "close"), n(p, "period"));
  const second = ema(first, n(p, "period"));
  const third = ema(second, n(p, "period"));
  return { tema: map3(first, second, third, (a, b, c) => 3 * a - 3 * b + c) };
};

export default compute;
