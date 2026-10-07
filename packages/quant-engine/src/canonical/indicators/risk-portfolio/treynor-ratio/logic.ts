import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,mean,priceReturns,rollingPair } from '../shared';
import { linearFit } from '../../../core/contextual/pair-statistics';
const compute: Compute=(frame,parameters,inputs)=>{
  const annualization=parameters.annualization as number,riskFree=(parameters.riskFreeAnnualPct as number)/100,asset=priceReturns(frame.bars.map((bar)=>bar.close)),benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark'));
  return {treynor:rollingPair(asset,benchmark,parameters.period as number,(left,right)=>{const beta=linearFit(left,right)?.slope??null;return beta===null||beta===0?null:(mean(left)*annualization-riskFree)/beta;})};
};
export default compute;
