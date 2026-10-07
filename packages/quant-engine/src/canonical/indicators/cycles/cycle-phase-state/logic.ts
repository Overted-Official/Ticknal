import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, dominantCycle, n } from '../shared';
const compute: Compute = (frame,p) => { const phase=dominantCycle(close(frame),n(p,'window'),n(p,'minPeriod'),n(p,'maxPeriod')).phase; return { phase_angle:phase, phase_state:phase.map((value)=>value===null?null:Math.sin(value)>0?(Math.cos(value)>0?'rising':'peak'):(Math.cos(value)<0?'falling':'trough')) }; };
export default compute;
