import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth, contextualSeries } from '../shared';
const clamp=(value:number,min:number,max:number)=>Math.max(0,Math.min(100,(value-min)/(max-min)*100));
const compute:Compute=(frame,_parameters,inputs)=>{
  const fx=calendarGrowth(frame,contextualSeries(frame,inputs,'usdEgp'),3),m2=calendarGrowth(frame,contextualSeries(frame,inputs,'m2'),12),reserves=contextualSeries(frame,inputs,'netInternationalReserves');
  const inflation=contextualSeries(frame,inputs,'egyptHeadlineInflationYoY'),policy=contextualSeries(frame,inputs,'cbePolicyRate');
  const scores=frame.bars.map((_,index)=>{
    if(fx[index]===null||m2[index]===null||reserves[index]===null||inflation[index]===null||policy[index]===null)return null;
    return [clamp(fx[index]!*100,0,20),clamp(inflation[index]!,5,30),clamp(m2[index]!*100,5,35),clamp(50_000-reserves[index]!,0,25_000),clamp(inflation[index]!-policy[index]!,-5,10)];
  });
  const risk=scores.map((values)=>values===null?null:values.reduce((sum,value)=>sum+value,0)/values.length);
  return {
    'risk-score':risk,
    state:risk.map((value)=>value===null?null:value<34?'low':value<=66?'moderate':'high'),
    drivers:scores.map((values)=>values===null?null:values.filter((value)=>value>=50).length),
  };
};
export default compute;
