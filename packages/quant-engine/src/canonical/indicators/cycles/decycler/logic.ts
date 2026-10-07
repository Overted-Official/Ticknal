import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, n, superSmoother } from '../shared';
const compute: Compute = (frame,p) => ({ decycler:superSmoother(close(frame),n(p,'period')) });
export default compute;
