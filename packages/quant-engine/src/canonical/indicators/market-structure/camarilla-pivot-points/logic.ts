import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { field, previous } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame) => {
  const high = previous(field(frame, "high")),
    low = previous(field(frame, "low")),
    close = previous(field(frame, "close"));
  const factors = [1.1 / 12, 1.1 / 6, 1.1 / 4, 1.1 / 2, 1.1, 1.65];
  return Object.fromEntries(
    factors.flatMap((factor, i) => [
      [
        `h${i + 1}`,
        close.map((value, j) =>
          value === null || high[j] === null || low[j] === null
            ? null
            : value + factor * (high[j]! - low[j]!),
        ),
      ],
      [
        `l${i + 1}`,
        close.map((value, j) =>
          value === null || high[j] === null || low[j] === null
            ? null
            : value - factor * (high[j]! - low[j]!),
        ),
      ],
    ]),
  );
};

export default compute;
