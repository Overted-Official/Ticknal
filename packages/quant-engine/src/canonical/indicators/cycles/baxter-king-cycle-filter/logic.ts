import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { baxterKing, close, n } from '../shared';
const compute: Compute = (frame,p) => ({ cycle_component:baxterKing(close(frame),n(p,'lowPeriod'),n(p,'highPeriod'),n(p,'leadLag')) });
export default compute;
