import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, deviation, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>({volatility_pct:windowMap(returns(close(frame)),n(p,'period'),(window)=>100*deviation(window)*Math.sqrt(n(p,'annualization')))});
export default compute;
