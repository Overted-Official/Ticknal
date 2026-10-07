import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,benchmark=contextualSeries(frame,inputs,'benchmark'),ratio=frame.bars.map((bar,index)=>benchmark[index]===null||benchmark[index]===0?null:bar.close/benchmark[index]!);
  return {'rs-momentum':ratio.map((value,index)=>index<period||value===null||ratio[index-period]===null||ratio[index-period]===0?null:(value/ratio[index-period]!-1)*100),period:Array(frame.bars.length).fill(period)};
};
export default compute;
