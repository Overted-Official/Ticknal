import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, dominantCycle, goertzelPower, n } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame); return { target_power:goertzelPower(source,n(p,'targetPeriod'),n(p,'window')), dominant_period:dominantCycle(source,n(p,'window'),n(p,'minPeriod'),n(p,'maxPeriod')).period }; };
export default compute;
