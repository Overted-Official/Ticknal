import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, mean, n, quantile, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>({cvar_pct:windowMap(returns(close(frame)),n(p,'period'),(window)=>{const cutoff=quantile(window,1-n(p,'confidencePct')/100),tail=window.filter((value)=>value<=cutoff);return Math.max(0,-100*mean(tail))})});
export default compute;
