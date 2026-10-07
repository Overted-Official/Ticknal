import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, deviation, mean, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>{const riskFree=n(p,'riskFreeAnnualPct')/100/n(p,'annualization');return{sharpe:windowMap(returns(close(frame)),n(p,'period'),(window)=>{const sd=deviation(window);return sd===0?null:(mean(window)-riskFree)/sd*Math.sqrt(n(p,'annualization'))})}};
export default compute;
