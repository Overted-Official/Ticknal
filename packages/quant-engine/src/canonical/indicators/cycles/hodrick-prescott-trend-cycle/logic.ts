import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, hpFilter, n } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame), trend=hpFilter(source,n(p,'lambda')); return { trend, cycle:source.map((value,i)=>value-trend[i]) }; };
export default compute;
