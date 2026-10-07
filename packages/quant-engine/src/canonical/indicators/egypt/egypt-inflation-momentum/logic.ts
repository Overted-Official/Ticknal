import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth, calendarLaggedSeries, contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const yoy=calendarGrowth(frame,contextualSeries(frame,inputs,'egyptCpiIndex'),12),prior=calendarLaggedSeries(frame,yoy,1);
  const momentum=yoy.map((value)=>value===null?null:value*100);
  return {'cpi-momentum':momentum,acceleration:momentum.map((value,index)=>value===null||prior[index]===null?null:value-prior[index]!*100)};
};
export default compute;
