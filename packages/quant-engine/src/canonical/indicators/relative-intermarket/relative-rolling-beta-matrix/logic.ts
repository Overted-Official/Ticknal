import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { betaAlpha,contextualSeries,priceReturns,rollingPair } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,betas=rollingPair(priceReturns(frame.bars.map((bar)=>bar.close)),priceReturns(contextualSeries(frame,inputs,'benchmark')),period,(asset,benchmark)=>betaAlpha(asset,benchmark)?.beta??null);
  return {betas,period:Array(frame.bars.length).fill(period)};
};
export default compute;
