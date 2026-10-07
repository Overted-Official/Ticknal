import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { n } from '../shared';
const compute:Compute=(frame,p)=>({suspected_event:frame.bars.map((bar,i)=>i===0?null:Math.abs((bar.open/frame.bars[i-1].close-1)*100)>=n(p,'thresholdPct')),gap_pct:frame.bars.map((bar,i)=>i===0?null:(bar.open/frame.bars[i-1].close-1)*100),adjusted_state:frame.bars.map(()=>frame.meta.adjustmentMode)});
export default compute;
