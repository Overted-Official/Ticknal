import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { n } from '../shared';
const compute:Compute=(frame,p)=>{let unchanged=0;const stale:(boolean|null)[]=[],missing_bars:(number|null)[]=[],last_valid_time:(string|null)[]=[];for(let i=0;i<frame.bars.length;i+=1){unchanged=i>0&&frame.bars[i].close===frame.bars[i-1].close?unchanged+1:0;stale.push(frame.meta.continuityStatus==='gapped'||unchanged>=n(p,'staleBars'));missing_bars.push(frame.meta.fields.close.missingCount);last_valid_time.push(String(frame.bars[i].time));}return{stale,missing_bars,last_valid_time}};
export default compute;
