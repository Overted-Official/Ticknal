import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n, returns } from '../shared';
const compute: Compute=(frame,p)=>({return_pct:returns(close(frame),n(p,'horizon')).map((value)=>value===null?null:value*100)});
export default compute;
