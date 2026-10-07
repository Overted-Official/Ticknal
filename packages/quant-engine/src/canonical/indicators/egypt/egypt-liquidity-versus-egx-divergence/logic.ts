import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { calendarGrowth,contextualSeries,rollingCalendarPair } from '../shared';
import { linearFit } from '../../../core/contextual/pair-statistics';
const compute:Compute=(frame,parameters,inputs)=>{
  const liquidityPeriod=parameters.liquidityPeriod as number,m2=contextualSeries(frame,inputs,'m2'),asset=frame.bars.map((bar)=>bar.close),m2Returns=calendarGrowth(frame,m2,liquidityPeriod),assetReturns=calendarGrowth(frame,asset,liquidityPeriod);
  return {divergence:assetReturns.map((value,index)=>value===null||m2Returns[index]===null?null:(m2Returns[index]!-value)*100),'rolling-beta':rollingCalendarPair(frame,assetReturns,m2Returns,parameters.period as number,(left,right)=>linearFit(left,right)?.slope??null)};
};
export default compute;
