import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,gold=contextualSeries(frame,inputs,'gold'),ratio=frame.bars.map((bar,index)=>gold[index]===null||gold[index]===0?null:bar.close/gold[index]!);
  const spread=ratio.map((value,index)=>index<period||value===null||ratio[index-period]===null||ratio[index-period]===0?null:(value/ratio[index-period]!-1)*100);
  return {ratio,'return-spread':spread,trend:spread.map((value)=>value===null?null:value>0?'equities':value<0?'gold':'neutral')};
};
export default compute;
