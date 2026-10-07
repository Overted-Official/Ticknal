import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
import { summarizeCompletedTrades } from '../../../core/contextual/trade-statistics';
const compute: Compute=(frame,_parameters,inputs)=>({
  win_rate_pct:tradeSeries(frame,inputs,(trades)=>summarizeCompletedTrades(trades).summary.winRate*100),
  sample_count:tradeSeries(frame,inputs,(trades)=>trades.length,0),
});
export default compute;
