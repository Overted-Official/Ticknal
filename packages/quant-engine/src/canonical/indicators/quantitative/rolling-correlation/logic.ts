import { alignNumericSeries } from "../../../core/alignment/align-series";
import { populationCovariance, rollingPairStatistic, simpleReturns } from "../../../core/contextual/pair-statistics";
import type { CategoryIndicatorSpec } from "../../shared/category-definition";
type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame,parameters,inputs) => {
  const comparison=inputs.seriesByRole.comparison;
  const paired=comparison===undefined?Array(frame.bars.length).fill(null):alignNumericSeries(frame.bars.map((bar)=>bar.time),comparison).values;
  return {correlation:rollingPairStatistic(simpleReturns(frame.bars.map((bar)=>bar.close)),simpleReturns(paired),parameters.period as number,(left,right)=>{
    const covariance=populationCovariance(left,right),leftVariance=populationCovariance(left,left),rightVariance=populationCovariance(right,right);
    return covariance===null||leftVariance===null||rightVariance===null||leftVariance<=0||rightVariance<=0?null:covariance/Math.sqrt(leftVariance*rightVariance);
  })};
};

export default compute;
