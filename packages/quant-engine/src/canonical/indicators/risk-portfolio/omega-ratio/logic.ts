import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, n, returns, windowMap } from '../shared';
const compute: Compute=(frame,p)=>{const threshold=n(p,'thresholdAnnualPct')/100/n(p,'annualization');return{omega:windowMap(returns(close(frame)),n(p,'period'),(window)=>{const gains=window.reduce((sum,value)=>sum+Math.max(0,value-threshold),0),losses=window.reduce((sum,value)=>sum+Math.max(0,threshold-value),0);return losses===0?null:gains/losses})}};
export default compute;
