import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,fx=contextualSeries(frame,inputs,'usdEgp');
  return {'real-nominal-relative-return':frame.bars.map((bar,index)=>index<period||frame.bars[index-period]!.close===0||fx[index]===null||fx[index-period]===null||fx[index-period]===0?null:((bar.close/frame.bars[index-period]!.close)/(fx[index]!/fx[index-period]!)-1)*100)};
};
export default compute;
