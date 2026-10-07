import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const cpi=contextualSeries(frame,inputs,'egyptCpiIndex');let base:number|null=null;
  const purchasingPower=cpi.map((value)=>{if(value===null||value<=0)return null;if(base===null)base=value;return base/value*100;});
  return {'purchasing-power':purchasingPower,'loss-pct':purchasingPower.map((value)=>value===null?null:100-value)};
};
export default compute;
