import { alignNumericSeries } from "../../../core/alignment/align-series";
import { linearFit, rollingPairStatistic, simpleReturns } from "../../../core/contextual/pair-statistics";
import type { CategoryIndicatorSpec } from "../../shared/category-definition";
type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame,parameters,inputs) => {
  const benchmark=inputs.seriesByRole.benchmark;
  const paired=benchmark===undefined?Array(frame.bars.length).fill(null):alignNumericSeries(frame.bars.map((bar)=>bar.time),benchmark).values;
  return {alpha_pct:rollingPairStatistic(simpleReturns(frame.bars.map((bar)=>bar.close)),simpleReturns(paired),parameters.period as number,(asset,market)=>{const fit=linearFit(asset,market);return fit===null?null:fit.intercept*(parameters.annualization as number)*100;})};
};

export default compute;
