import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, n, sma } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame); const energy=(period:number)=>{ const smooth=sma(source,period); return source.map((value,i)=>smooth[i]===null?null:(value-smooth[i]!)**2); }; const short_energy=energy(n(p,'short')), medium_energy=energy(n(p,'medium')), long_energy=energy(n(p,'long')); return { short_energy, medium_energy, long_energy, dominant_scale:source.map((_,i)=>{ const values=[short_energy[i],medium_energy[i],long_energy[i]]; if(values.some((value)=>value===null))return null; return ['short','medium','long'][values.indexOf(Math.max(...values as number[]))]; }) }; };
export default compute;
