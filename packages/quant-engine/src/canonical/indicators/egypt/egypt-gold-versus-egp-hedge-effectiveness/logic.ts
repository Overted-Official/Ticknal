import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth, contextualSeries, rollingCalendarPair } from '../shared';
const covariance=(left:readonly number[],right:readonly number[])=>{const lm=left.reduce((a,b)=>a+b,0)/left.length,rm=right.reduce((a,b)=>a+b,0)/right.length;return left.reduce((sum,value,index)=>sum+(value-lm)*(right[index]!-rm),0)/left.length;};
const compute:Compute=(frame,_parameters,inputs)=>{
  const gold=contextualSeries(frame,inputs,'gold'),fx=contextualSeries(frame,inputs,'usdEgp'),cpi=contextualSeries(frame,inputs,'egyptCpiIndex');
  const localGold=gold.map((value,index)=>value===null||fx[index]===null?null:value*fx[index]!/31.1034768);
  const goldMonthly=calendarGrowth(frame,localGold,1),inflationMonthly=calendarGrowth(frame,cpi,1);
  const correlation=rollingCalendarPair(frame,goldMonthly,inflationMonthly,12,(left,right)=>{const cov=covariance(left,right),varianceLeft=covariance(left,left),varianceRight=covariance(right,right);return varianceLeft<=0||varianceRight<=0?null:cov/Math.sqrt(varianceLeft*varianceRight);});
  const hedgeRatio=rollingCalendarPair(frame,goldMonthly,inflationMonthly,12,(left,right)=>{const variance=covariance(right,right);return variance<=0?null:covariance(left,right)/variance;});
  const goldAnnual=calendarGrowth(frame,localGold,12),inflationAnnual=calendarGrowth(frame,cpi,12);
  return {correlation,'hedge-ratio':hedgeRatio,'real-return':goldAnnual.map((value,index)=>value===null||inflationAnnual[index]===null?null:((1+value)/(1+inflationAnnual[index]!)-1)*100)};
};
export default compute;
