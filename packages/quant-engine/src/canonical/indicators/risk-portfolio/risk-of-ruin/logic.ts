import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
import { summarizeCompletedTrades } from '../../../core/contextual/trade-statistics';
const compute: Compute=(frame,parameters,inputs)=>({ruin_probability:tradeSeries(frame,inputs,(trades)=>{const summary=summarizeCompletedTrades(trades).summary;if(summary.payoffRatio===null||summary.payoffRatio===0)return null;const edge=summary.winRate-(1-summary.winRate)/summary.payoffRatio;if(edge<=0)return 1;const units=(parameters.capitalLossPct as number)/(parameters.riskPerTradePct as number);return Math.max(0,Math.min(1,((1-edge)/(1+edge))**units));})});
export default compute;
