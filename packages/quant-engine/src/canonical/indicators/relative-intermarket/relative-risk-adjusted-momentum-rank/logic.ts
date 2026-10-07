import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { empty } from '../shared';
const compute:Compute=(frame)=>empty(frame,["rank","score","periods"]);
export default compute;
