import { alignNumericSeries } from "../../../core/alignment/align-series";
import { linearFit, rollingPairStatistic, simpleReturns } from "../../../core/contextual/pair-statistics";
import type { CategoryIndicatorSpec } from "../../shared/category-definition";
type Parameters = Record<string, unknown>;

const compute: CategoryIndicatorSpec<Parameters>["compute"] = (frame,parameters,inputs) => {
  const benchmark=inputs.seriesByRole.benchmark;
  const paired=benchmark===undefined?Array(frame.bars.length).fill(null):alignNumericSeries(frame.bars.map((bar)=>bar.time),benchmark).values;
  const assetReturns=simpleReturns(frame.bars.map((bar)=>bar.close)),benchmarkReturns=simpleReturns(paired),period=parameters.period as number,annualization=parameters.annualization as number;
  return {
    beta:rollingPairStatistic(assetReturns,benchmarkReturns,period,(asset,market)=>linearFit(asset,market)?.slope??null),
    alpha:rollingPairStatistic(assetReturns,benchmarkReturns,period,(asset,market)=>{const fit=linearFit(asset,market);return fit===null?null:fit.intercept*annualization*100;}),
  };
};

export default compute;
