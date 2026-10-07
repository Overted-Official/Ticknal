import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { bandPass, close, n } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame), periods=[n(p,'short'),n(p,'medium'),n(p,'long')], filters=periods.map((period)=>bandPass(source,period,n(p,'bandwidth'))); const score=source.map((_,i)=>filters.reduce<number|null>((sum,filter)=>filter[i]===null?null:sum===null?null:sum+(filter[i]!>0?1:filter[i]!<0?-1:0),0)); const dominant_horizon=source.map((_,i)=>{ const values=filters.map((filter)=>filter[i]); if(values.some((value)=>value===null))return null; const magnitudes=values.map((value)=>Math.abs(value!)); return ['short','medium','long'][magnitudes.indexOf(Math.max(...magnitudes))]; }); return { score, dominant_horizon, state:score.map((value)=>value===null?null:value>=2?'bullish':value<=-2?'bearish':'mixed') }; };
export default compute;
