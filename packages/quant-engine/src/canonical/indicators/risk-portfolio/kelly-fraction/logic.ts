import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
import { summarizeCompletedTrades } from '../../../core/contextual/trade-statistics';
const compute: Compute=(frame,parameters,inputs)=>{
  const full=tradeSeries(frame,inputs,(trades)=>{const summary=summarizeCompletedTrades(trades).summary;if(summary.payoffRatio===null||summary.payoffRatio===0)return null;return (summary.winRate-(1-summary.winRate)/summary.payoffRatio)*100;});
  return {full_kelly:full,fractional_kelly:full.map((value)=>value===null?null:value*(parameters.fraction as number))};
};
export default compute;
