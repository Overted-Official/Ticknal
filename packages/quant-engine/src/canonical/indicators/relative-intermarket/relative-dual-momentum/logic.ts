import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,benchmark=contextualSeries(frame,inputs,'benchmark');
  const assetReturn=frame.bars.map((bar,index)=>index<period||frame.bars[index-period]!.close===0?null:bar.close/frame.bars[index-period]!.close-1);
  const relative=assetReturn.map((value,index)=>value===null||benchmark[index]===null||index<period||benchmark[index-period]===null||benchmark[index-period]===0?null:(value-(benchmark[index]!/benchmark[index-period]!-1))*100);
  return {'absolute-state':assetReturn.map((value)=>value===null?null:value>0?'positive':'negative'),'relative-rank':relative};
};
export default compute;
