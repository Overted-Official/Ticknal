import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
import { summarizeCompletedTrades } from '../../../core/contextual/trade-statistics';
const compute: Compute=(frame,_parameters,inputs)=>({profit_factor:tradeSeries(frame,inputs,(trades)=>summarizeCompletedTrades(trades).summary.profitFactor)});
export default compute;
