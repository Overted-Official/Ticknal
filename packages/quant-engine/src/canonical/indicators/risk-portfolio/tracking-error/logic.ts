import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,deviation,priceReturns,rollingPair } from '../shared';
const compute: Compute=(frame,parameters,inputs)=>{
  const asset=priceReturns(frame.bars.map((bar)=>bar.close)),benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark'));
  return {tracking_error_pct:rollingPair(asset,benchmark,parameters.period as number,(left,right)=>deviation(left.map((value,index)=>value-right[index]!))*Math.sqrt(parameters.annualization as number)*100)};
};
export default compute;
