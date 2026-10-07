import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, n, superSmoother } from '../shared';
const compute: Compute = (frame,p) => ({ smoothed_series:superSmoother(close(frame),n(p,'period'),n(p,'poles')) });
export default compute;
