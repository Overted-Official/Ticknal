import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, mean, n } from '../shared';
const compute: Compute=(frame,p)=>{const source=close(frame),period=n(p,'period'),annual=n(p,'annualization'),riskFree=n(p,'riskFreeAnnualPct')/100;return{upi:source.map((value,i)=>{if(i<period||source[i-period]<=0)return null;const window=source.slice(i-period,i+1);let peak=-Infinity;const drawdowns=window.map((item)=>{peak=Math.max(peak,item);return 100*(item/peak-1)});const ulcer=Math.sqrt(mean(drawdowns.map((item)=>item**2)));const annualReturn=Math.pow(value/source[i-period],annual/period)-1-riskFree;return ulcer===0?null:100*annualReturn/ulcer})}};
export default compute;
