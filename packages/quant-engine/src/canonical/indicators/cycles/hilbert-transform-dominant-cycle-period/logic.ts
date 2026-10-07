import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, dominantCycle, n } from '../shared';
const compute: Compute = (frame, p) => ({ dominant_period: dominantCycle(close(frame), n(p,'window'), n(p,'minPeriod'), n(p,'maxPeriod')).period });
export default compute;
