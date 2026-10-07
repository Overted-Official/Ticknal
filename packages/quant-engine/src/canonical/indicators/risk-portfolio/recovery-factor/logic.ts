import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { tradeSeries } from '../shared';
const compute: Compute=(frame,_parameters,inputs)=>({recovery_factor:tradeSeries(frame,inputs,(trades)=>{let equity=0,peak=0,maximumDrawdown=0;for(const trade of trades){equity+=trade.realizedPnl;peak=Math.max(peak,equity);maximumDrawdown=Math.max(maximumDrawdown,peak-equity);}return maximumDrawdown===0?null:equity/maximumDrawdown;})});
export default compute;
