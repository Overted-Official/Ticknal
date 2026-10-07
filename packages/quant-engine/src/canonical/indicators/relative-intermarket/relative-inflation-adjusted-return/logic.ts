import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth, contextualSeries } from '../../egypt/shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const inflation=calendarGrowth(frame,contextualSeries(frame,inputs,'egyptCpiIndex'),12);
  const price=calendarGrowth(frame,frame.bars.map((bar)=>bar.close),12);
  const realReturn=price.map((nominal,index)=>nominal===null||inflation[index]===null?null:((1+nominal)/(1+inflation[index]!)-1)*100);
  return {'real-return':realReturn,'annualized-real-return':realReturn};
};
export default compute;
