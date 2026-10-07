import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,rollingZScore } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,comparison=contextualSeries(frame,inputs,'comparison'),ratio=frame.bars.map((bar,index)=>comparison[index]===null||comparison[index]===0?null:bar.close/comparison[index]!);
  return {ratio,'z-score':rollingZScore(ratio,period),period:Array(frame.bars.length).fill(period)};
};
export default compute;
