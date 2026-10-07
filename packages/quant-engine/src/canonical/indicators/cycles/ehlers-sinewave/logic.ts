import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, dominantCycle, n } from '../shared';
const compute: Compute = (frame, p) => { const result = dominantCycle(close(frame), n(p,'window'), n(p,'minPeriod'), n(p,'maxPeriod')); return { sine: result.phase.map((value) => value === null ? null : Math.sin(value)), lead_sine: result.phase.map((value) => value === null ? null : Math.sin(value + Math.PI / 4)), phase: result.phase }; };
export default compute;
