import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, n } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame), itrend:(number|null)[]=Array(source.length).fill(null), alpha=n(p,'alpha'); for(let i=0;i<source.length;i+=1){ if(i<6){itrend[i]=source.slice(0,i+1).reduce((a,b)=>a+b,0)/(i+1);continue;} itrend[i]=(alpha-alpha**2/4)*source[i]+0.5*alpha**2*source[i-1]-(alpha-0.75*alpha**2)*source[i-2]+2*(1-alpha)*itrend[i-1]!-(1-alpha)**2*itrend[i-2]!; } return { itrend, trigger:itrend.map((value,i)=>i<2?null:2*value!-itrend[i-2]!) }; };
export default compute;
