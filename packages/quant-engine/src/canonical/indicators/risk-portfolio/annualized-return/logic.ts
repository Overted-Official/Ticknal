import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n } from '../shared';
const compute: Compute=(frame,p)=>{const source=close(frame),period=n(p,'period'),annual=n(p,'annualization');return{annualized_return_pct:source.map((value,i)=>i<period||source[i-period]<=0?null:(Math.pow(value/source[i-period],annual/period)-1)*100)}};
export default compute;
