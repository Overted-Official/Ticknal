import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,benchmark=contextualSeries(frame,inputs,'benchmark'),ratio=frame.bars.map((bar,index)=>benchmark[index]===null||benchmark[index]===0?null:bar.close/benchmark[index]!);
  const mansfield=ratio.map((value,index)=>{if(value===null||index+1<period)return null;const window=ratio.slice(index-period+1,index+1);if(window.some((candidate)=>candidate===null))return null;const average=(window as number[]).reduce((sum,candidate)=>sum+candidate,0)/period;return average===0?null:(value/average-1)*100;});
  return {'mansfield-rs':mansfield,period:Array(frame.bars.length).fill(period)};
};
export default compute;
