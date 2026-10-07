import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, mean, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>{const target=n(p,'targetAnnualPct')/100/n(p,'annualization');return{sortino:windowMap(returns(close(frame)),n(p,'period'),(window)=>{const downside=Math.sqrt(mean(window.map((value)=>Math.min(0,value-target)**2)));return downside===0?null:(mean(window)-target)/downside*Math.sqrt(n(p,'annualization'))})}};
export default compute;
