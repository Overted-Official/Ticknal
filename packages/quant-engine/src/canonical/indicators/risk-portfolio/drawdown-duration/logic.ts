import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, drawdown } from '../shared';
const compute: Compute=(frame)=>{const result=drawdown(close(frame));return{current_duration:result.currentDuration,maximum_duration:result.maximumDuration}};
export default compute;
