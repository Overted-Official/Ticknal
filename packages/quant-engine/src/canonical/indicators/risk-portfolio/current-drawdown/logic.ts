import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, drawdown } from '../shared';
const compute: Compute=(frame)=>{const result=drawdown(close(frame));return{current_drawdown_pct:result.drawdown.map((value)=>value*100),duration:result.currentDuration}};
export default compute;
