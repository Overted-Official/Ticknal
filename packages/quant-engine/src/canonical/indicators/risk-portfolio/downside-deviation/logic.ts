import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, mean, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>{const target=n(p,'targetAnnualPct')/100/n(p,'annualization');return{downside_deviation_pct:windowMap(returns(close(frame)),n(p,'period'),(window)=>100*Math.sqrt(mean(window.map((value)=>Math.min(0,value-target)**2)))*Math.sqrt(n(p,'annualization')))}};
export default compute;
