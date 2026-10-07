import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const nominal=contextualSeries(frame,inputs,'cbePolicyRate'),inflation=contextualSeries(frame,inputs,'egyptHeadlineInflationYoY');
  return {
    'nominal-rate':nominal,
    'real-rate':nominal.map((value,index)=>value===null||inflation[index]===null?null:value-inflation[index]!),
    change:nominal.map((value,index)=>value===null||index===0||nominal[index-1]===null?null:value-nominal[index-1]!),
  };
};
export default compute;
