import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n, quantile, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>({var_pct:windowMap(returns(close(frame)),n(p,'period'),(window)=>Math.max(0,-100*quantile(window,1-n(p,'confidencePct')/100)*Math.sqrt(n(p,'horizon'))))});
export default compute;
