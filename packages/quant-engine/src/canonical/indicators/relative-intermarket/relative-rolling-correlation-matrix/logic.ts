import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,correlation,priceReturns,rollingPair } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const values=rollingPair(priceReturns(frame.bars.map((bar)=>bar.close)),priceReturns(contextualSeries(frame,inputs,'comparison')),parameters.period as number,correlation);
  return {correlations:values,clusters:values.map((value)=>value===null?null:Math.abs(value)>=0.75?'high':Math.abs(value)>=0.4?'medium':'low')};
};
export default compute;
