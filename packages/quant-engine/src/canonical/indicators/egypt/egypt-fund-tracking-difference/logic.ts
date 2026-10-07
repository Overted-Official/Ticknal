import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,priceReturns,rollingPair } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const asset=priceReturns(frame.bars.map((bar)=>bar.close)),benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark'));
  return {'active-return':asset.map((value,index)=>value===null||benchmark[index]===null?null:(value-benchmark[index]!)*100),'tracking-error':rollingPair(asset,benchmark,parameters.period as number,(left,right)=>{const active=left.map((value,index)=>value-right[index]!),mean=active.reduce((sum,value)=>sum+value,0)/active.length;return Math.sqrt(active.reduce((sum,value)=>sum+(value-mean)**2,0)/active.length)*Math.sqrt(parameters.annualization as number)*100;})};
};
export default compute;
