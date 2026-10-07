import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { returns } from '../shared';
const compute: Compute = (frame) => { const ret=returns(frame.bars.map((bar)=>bar.close)), sums=Array(7).fill(0), wins=Array(7).fill(0), counts=Array(7).fill(0); const seasonal_mean:(number|null)[]=[], win_rate:(number|null)[]=[], sample_count:(number|null)[]=[]; for(let i=0;i<frame.bars.length;i+=1){ const date=new Date(frame.bars[i].time), bucket=Number.isNaN(date.getTime())?null:date.getUTCDay(), value=ret[i]; if(bucket===null||value===null){seasonal_mean.push(null);win_rate.push(null);sample_count.push(null);continue;} sums[bucket]+=value; wins[bucket]+=value>0?1:0; counts[bucket]+=1; seasonal_mean.push(100*sums[bucket]/counts[bucket]); win_rate.push(100*wins[bucket]/counts[bucket]); sample_count.push(counts[bucket]); } return { seasonal_mean, win_rate, sample_count }; };
export default compute;
