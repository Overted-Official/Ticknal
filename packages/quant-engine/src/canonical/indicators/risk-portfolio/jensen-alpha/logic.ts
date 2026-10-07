import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,priceReturns,rollingPair } from '../shared';
import { linearFit } from '../../../core/contextual/pair-statistics';
const compute: Compute=(frame,parameters,inputs)=>{
  const annualization=parameters.annualization as number,riskFreeDaily=(parameters.riskFreeAnnualPct as number)/100/annualization,asset=priceReturns(frame.bars.map((bar)=>bar.close)),benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark'));
  return {
    alpha_pct:rollingPair(asset,benchmark,parameters.period as number,(left,right)=>{const excessAsset=left.map((value)=>value-riskFreeDaily),excessBenchmark=right.map((value)=>value-riskFreeDaily),fit=linearFit(excessAsset,excessBenchmark);return fit===null?null:fit.intercept*annualization*100;}),
    beta:rollingPair(asset,benchmark,parameters.period as number,(left,right)=>linearFit(left,right)?.slope??null),
  };
};
export default compute;
