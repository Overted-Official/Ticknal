import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
import { linearFit } from '../../../core/contextual/pair-statistics';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,comparison=contextualSeries(frame,inputs,'comparison'),hedge:(number|null)[]=Array(frame.bars.length).fill(null),spread:(number|null)[]=Array(frame.bars.length).fill(null),z:(number|null)[]=Array(frame.bars.length).fill(null);
  for(let index=period-1;index<frame.bars.length;index+=1){const asset=frame.bars.slice(index-period+1,index+1).map((bar)=>bar.close),pair=comparison.slice(index-period+1,index+1);if(pair.some((value)=>value===null))continue;const fit=linearFit(asset,pair as number[]);if(fit===null)continue;const residuals=asset.map((value,offset)=>value-(fit.intercept+fit.slope*(pair[offset] as number))),current=residuals.at(-1)!,average=residuals.reduce((sum,value)=>sum+value,0)/period,deviation=Math.sqrt(residuals.reduce((sum,value)=>sum+(value-average)**2,0)/period);hedge[index]=fit.slope;spread[index]=current;z[index]=deviation===0?0:(current-average)/deviation;}
  return {'hedge-ratio':hedge,spread,'z-score':z};
};
export default compute;
