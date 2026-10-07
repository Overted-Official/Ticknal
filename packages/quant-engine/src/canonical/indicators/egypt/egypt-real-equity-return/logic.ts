import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth, contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const cpi=contextualSeries(frame,inputs,'egyptCpiIndex'),price=frame.bars.map((bar)=>bar.close),nominal=calendarGrowth(frame,price,12),inflation=calendarGrowth(frame,cpi,12);
  let peak:number|null=null;
  const wealth=price.map((value,index)=>cpi[index]===null||cpi[index]!<=0?null:value/cpi[index]!);
  const drawdown=wealth.map((value)=>{if(value===null)return null;peak=peak===null?value:Math.max(peak,value);return (value/peak-1)*100;});
  return {'real-return':nominal.map((value,index)=>value===null||inflation[index]===null?null:((1+value)/(1+inflation[index]!)-1)*100),'real-drawdown':drawdown};
};
export default compute;
