import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, deviation, inverseNormal, mean, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>({var_pct:windowMap(returns(close(frame)),n(p,'period'),(window)=>{const horizon=n(p,'horizon'),z=inverseNormal(n(p,'confidencePct')/100);return Math.max(0,100*(z*deviation(window)*Math.sqrt(horizon)-mean(window)*horizon))})});
export default compute;
