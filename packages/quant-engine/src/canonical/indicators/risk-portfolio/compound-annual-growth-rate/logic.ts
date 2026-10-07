import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n } from '../shared';
const compute: Compute=(frame,p)=>{const source=close(frame),annual=n(p,'annualization');return{cagr_pct:source.map((value,i)=>i===0||source[0]<=0?null:(Math.pow(value/source[0],annual/i)-1)*100)}};
export default compute;
