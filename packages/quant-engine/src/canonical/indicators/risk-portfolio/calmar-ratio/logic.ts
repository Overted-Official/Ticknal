import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n } from '../shared';
const compute: Compute=(frame,p)=>{const source=close(frame),period=n(p,'period'),annual=n(p,'annualization');return{calmar:source.map((value,i)=>{if(i<period||source[i-period]<=0)return null;const window=source.slice(i-period,i+1);let peak=-Infinity,worst=0;for(const item of window){peak=Math.max(peak,item);worst=Math.min(worst,item/peak-1)}const annualReturn=Math.pow(value/source[i-period],annual/period)-1;return worst===0?null:annualReturn/Math.abs(worst)})}};
export default compute;
