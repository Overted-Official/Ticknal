import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, dominantCycle, n } from '../shared';
const compute: Compute = (frame,p) => { const result=dominantCycle(close(frame),n(p,'window'),n(p,'minPeriod'),n(p,'maxPeriod')); return { power:result.power, dominant_period:result.period }; };
export default compute;
