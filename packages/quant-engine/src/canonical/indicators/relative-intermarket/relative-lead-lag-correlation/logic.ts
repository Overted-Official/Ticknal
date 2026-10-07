import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,correlation,priceReturns } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,maxLag=parameters.maxLag as number,asset=priceReturns(frame.bars.map((bar)=>bar.close)),comparison=priceReturns(contextualSeries(frame,inputs,'comparison'));
  const bestLag:(number|null)[]=Array(frame.bars.length).fill(null),bestCorrelation:(number|null)[]=Array(frame.bars.length).fill(null);
  for(let index=period+maxLag;index<frame.bars.length;index+=1){let chosenLag=0,chosen:number|null=null;for(let lag=-maxLag;lag<=maxLag;lag+=1){const left:number[]=[],right:number[]=[];for(let offset=period-1;offset>=0;offset-=1){const a=asset[index-offset],b=comparison[index-offset-lag];if(a===null||b===null||b===undefined){left.length=0;break;}left.push(a);right.push(b);}if(left.length!==period)continue;const value=correlation(left,right);if(value!==null&&(chosen===null||Math.abs(value)>Math.abs(chosen))){chosen=value;chosenLag=lag;}}bestLag[index]=chosen===null?null:chosenLag;bestCorrelation[index]=chosen;}
  return {'best-lag':bestLag,correlation:bestCorrelation};
};
export default compute;
