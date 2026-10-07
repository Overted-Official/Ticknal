import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const benchmark=contextualSeries(frame,inputs,'benchmark'),raw=frame.bars.map((bar,index)=>benchmark[index]===null||benchmark[index]===0?null:bar.close/benchmark[index]!);
  const base=raw.find((value)=>value!==null)??null,rs=raw.map((value)=>value===null||base===null||base===0?null:value/base*100);
  let high=-Infinity;
  const events=rs.map((value)=>{if(value===null)return false;const event=high!==-Infinity&&value>high;high=Math.max(high,value);return event;});
  return {'rs-line':rs,'new-high-event':events};
};
export default compute;
