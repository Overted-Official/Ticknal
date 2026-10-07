import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
import { summarizeCompletedTrades } from '../../../core/contextual/trade-statistics';
const compute: Compute=(frame,_parameters,inputs)=>({
  expectancy_amount:tradeSeries(frame,inputs,(trades)=>summarizeCompletedTrades(trades).summary.expectancy),
  expectancy_pct:tradeSeries(frame,inputs,(trades)=>trades.reduce((sum,trade)=>sum+trade.realizedReturn,0)/trades.length*100),
});
export default compute;
