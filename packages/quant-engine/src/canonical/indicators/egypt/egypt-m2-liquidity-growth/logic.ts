import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth,calendarLaggedSeries,contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const m2=contextualSeries(frame,inputs,'m2'),monthPeriod=parameters.monthPeriod as number,yearPeriod=parameters.yearPeriod as number;
  const momDecimal=calendarGrowth(frame,m2,monthPeriod),yoyDecimal=calendarGrowth(frame,m2,yearPeriod);
  const priorMom=calendarLaggedSeries(frame,momDecimal,monthPeriod);
  const mom=momDecimal.map((value)=>value===null?null:value*100),yoy=yoyDecimal.map((value)=>value===null?null:value*100);
  return {yoy,mom,acceleration:mom.map((value,index)=>value===null||priorMom[index]===null?null:value-priorMom[index]!*100)};
};
export default compute;
