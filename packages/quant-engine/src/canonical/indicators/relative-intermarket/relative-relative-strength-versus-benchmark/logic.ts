import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,benchmark=contextualSeries(frame,inputs,'benchmark');
  const relative=frame.bars.map((bar,index)=>index<period||benchmark[index]===null||benchmark[index-period]===null||benchmark[index-period]===0||frame.bars[index-period]!.close===0?null:((bar.close/frame.bars[index-period]!.close-1)-(benchmark[index]!/benchmark[index-period]!-1))*100);
  return {'relative-return':relative,period:Array(frame.bars.length).fill(period),benchmark:benchmark.map((value,index)=>index<period||value===null||benchmark[index-period]===null||benchmark[index-period]===0?null:(value/benchmark[index-period]!-1)*100)};
};
export default compute;
