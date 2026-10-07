import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, map2, n, superSmoother } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame), trend=superSmoother(source,n(p,'period')); return { oscillator:map2(source,trend,(price,value)=>value===0?null:100*(price/value-1)) }; };
export default compute;
