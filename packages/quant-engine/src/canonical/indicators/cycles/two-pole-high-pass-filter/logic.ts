import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, highPass, n } from '../shared';
const compute: Compute = (frame,p) => ({ high_pass:highPass(close(frame),n(p,'period')) });
export default compute;
