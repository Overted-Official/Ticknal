import type { CategoryIndicatorSpec } from "../../shared/category-definition";
import { change, field, map2, n, rollingSum, volumes } from "../shared";

type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame, p) => {
  const signed = map2(
    change(field(frame, "close")),
    volumes(frame),
    (a, b) => Math.sign(a) * b,
  );
  return {
    vpin_proxy: map2(
      rollingSum(signed, n(p, "bucketBars")).map((v) =>
        v === null ? null : Math.abs(v),
      ),
      rollingSum(volumes(frame), n(p, "bucketBars")),
      (a, b) => (b === 0 ? null : a / b),
    ),
  };
};

export default compute;
