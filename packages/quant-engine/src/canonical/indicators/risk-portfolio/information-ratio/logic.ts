import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,deviation,mean,priceReturns,rollingPair } from '../shared';
const compute: Compute=(frame,parameters,inputs)=>{
  const asset=priceReturns(frame.bars.map((bar)=>bar.close)),benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark'));
  return {information_ratio:rollingPair(asset,benchmark,parameters.period as number,(left,right)=>{const active=left.map((value,index)=>value-right[index]!),tracking=deviation(active);return tracking===0?null:mean(active)/tracking*Math.sqrt(parameters.annualization as number);})};
};
export default compute;
