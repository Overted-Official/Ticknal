import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const comparison=contextualSeries(frame,inputs,'comparison');
  const ratio=frame.bars.map((bar,index)=>comparison[index]===null||comparison[index]===0?null:bar.close/comparison[index]!);
  const base=ratio.find((value)=>value!==null)??null;
  return {ratio,'normalized-ratio':ratio.map((value)=>value===null||base===null||base===0?null:value/base*100)};
};
export default compute;
