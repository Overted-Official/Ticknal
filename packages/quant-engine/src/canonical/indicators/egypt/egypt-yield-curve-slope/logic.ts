import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const short=contextualSeries(frame,inputs,'treasury3mYield'),long=contextualSeries(frame,inputs,'treasury12mYield');
  const spreads=long.map((value,index)=>value===null||short[index]===null?null:value-short[index]!);
  return {spreads,'inversion-state':spreads.map((value)=>value===null?null:value>0.01?'normal':value<-0.01?'inverted':'flat')};
};
export default compute;
