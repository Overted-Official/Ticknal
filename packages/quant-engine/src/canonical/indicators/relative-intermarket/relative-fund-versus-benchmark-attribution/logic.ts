import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { betaAlpha,contextualSeries,priceReturns,rollingPair } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,annualization=parameters.annualization as number,asset=priceReturns(frame.bars.map((bar)=>bar.close)),benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark'));
  return {
    'excess-return':asset.map((value,index)=>value===null||benchmark[index]===null?null:(value-benchmark[index]!)*100),
    beta:rollingPair(asset,benchmark,period,(left,right)=>betaAlpha(left,right)?.beta??null),
    'tracking-error':rollingPair(asset,benchmark,period,(left,right)=>{const differences=left.map((value,index)=>value-right[index]!),mean=differences.reduce((sum,value)=>sum+value,0)/differences.length;return Math.sqrt(differences.reduce((sum,value)=>sum+(value-mean)**2,0)/differences.length)*Math.sqrt(annualization)*100;}),
  };
};
export default compute;
