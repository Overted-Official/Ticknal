import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>({gain_to_pain:windowMap(returns(close(frame)),n(p,'period'),(window)=>{const gain=window.reduce((sum,value)=>sum+value,0),pain=window.reduce((sum,value)=>sum+Math.min(0,value),0);return pain===0?null:gain/Math.abs(pain)})});
export default compute;
