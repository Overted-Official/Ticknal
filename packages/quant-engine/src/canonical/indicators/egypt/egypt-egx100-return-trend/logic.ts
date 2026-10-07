import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { close, ema, n, returns, rollingStdDev } from '../shared';
const compute:Compute=(frame,p)=>{const source=close(frame),ret=returns(source),fast=ema(source,Math.max(2,Math.floor(n(p,'period')/2))),slow=ema(source,n(p,'period')),vol=rollingStdDev(ret,n(p,'period'));let peak=-Infinity;return{return_pct:returns(source,n(p,'period')).map((value)=>value===null?null:value*100),trend:source.map((_,i)=>fast[i]===null||slow[i]===null?null:fast[i]!>slow[i]!? 'bullish':'bearish'),volatility_pct:vol.map((value)=>value===null?null:value*Math.sqrt(252)*100),drawdown_pct:source.map((value)=>{peak=Math.max(peak,value);return(value/peak-1)*100})}};
export default compute;
