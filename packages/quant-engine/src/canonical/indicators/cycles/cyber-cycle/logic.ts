import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, n } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame), cycle:(number|null)[]=Array(source.length).fill(null), alpha=n(p,'alpha'); for(let i=2;i<source.length;i+=1){ const smooth=(source[i]+2*source[i-1]+source[i-2])/4; if(i<6){cycle[i]=(source[i]-2*source[i-1]+source[i-2])/4;continue;} const previousSmooth=(source[i-1]+2*source[i-2]+source[i-3])/4, priorSmooth=(source[i-2]+2*source[i-3]+source[i-4])/4; cycle[i]=(1-0.5*alpha)**2*(smooth-2*previousSmooth+priorSmooth)+2*(1-alpha)*(cycle[i-1]??0)-(1-alpha)**2*(cycle[i-2]??0); } return { cycle, trigger: cycle.map((_,i)=>cycle[i-1]??null), period:Array(source.length).fill(n(p,'period')) }; };
export default compute;
