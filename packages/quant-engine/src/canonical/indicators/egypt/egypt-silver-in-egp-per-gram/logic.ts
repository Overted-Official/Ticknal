import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const TROY_OUNCE_GRAMS=31.1034768;
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,silver=contextualSeries(frame,inputs,'silver'),fx=contextualSeries(frame,inputs,'usdEgp'),local=silver.map((value,index)=>value===null||fx[index]===null?null:value*fx[index]!/TROY_OUNCE_GRAMS);
  return {'egp-per-gram':local,return:local.map((value,index)=>index<period||value===null||local[index-period]===null||local[index-period]===0?null:(value/local[index-period]!-1)*100),premium:Array(frame.bars.length).fill(null)};
};
export default compute;
