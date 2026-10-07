import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { empty } from '../shared';
const compute:Compute=(frame)=>empty(frame,["score-0-100","confirmed-count"]);
export default compute;
