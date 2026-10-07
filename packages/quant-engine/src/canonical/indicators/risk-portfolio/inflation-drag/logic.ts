import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { empty } from '../shared';
const compute: Compute=(frame)=>empty(frame,["real_value","drag_amount","drag_pct"]);
export default compute;
