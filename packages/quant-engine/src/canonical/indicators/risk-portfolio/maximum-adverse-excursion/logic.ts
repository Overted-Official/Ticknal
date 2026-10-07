import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
const compute: Compute=(frame,_parameters,inputs)=>({
  mae_pct:tradeSeries(frame,inputs,(trades)=>{const value=trades.at(-1)?.maximumAdverseExcursion;return value===null||value===undefined?null:value*100;}),
  average_mae_pct:tradeSeries(frame,inputs,(trades)=>{const values=trades.map((trade)=>trade.maximumAdverseExcursion).filter((value):value is number=>value!==null);return values.length===0?null:values.reduce((sum,value)=>sum+value,0)/values.length*100;}),
});
export default compute;
