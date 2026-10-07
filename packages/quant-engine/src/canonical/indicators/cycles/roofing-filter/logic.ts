import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, highPass, n, superSmoother } from '../shared';
const compute: Compute = (frame,p) => { const high_pass=highPass(close(frame),n(p,'highPassPeriod')); return { high_pass, filtered_series:superSmoother(high_pass,n(p,'lowPassPeriod')) }; };
export default compute;
