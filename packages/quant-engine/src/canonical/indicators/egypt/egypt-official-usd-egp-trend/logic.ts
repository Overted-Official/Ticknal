import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,priceReturns,rollingPair } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,rate=contextualSeries(frame,inputs,'usdEgp'),daily=priceReturns(rate),annualization=parameters.annualization as number;
  const change=rate.map((value,index)=>index<period||value===null||rate[index-period]===null||rate[index-period]===0?null:(value/rate[index-period]!-1)*100);
  const volatility=rollingPair(daily,daily,period,(left)=>{const mean=left.reduce((sum,value)=>sum+value,0)/left.length;return Math.sqrt(left.reduce((sum,value)=>sum+(value-mean)**2,0)/left.length)*Math.sqrt(annualization)*100;});
  return {rate,return:change,trend:change.map((value)=>value===null?null:value>0?'weaker-egp':value<0?'stronger-egp':'flat'),volatility};
};
export default compute;
