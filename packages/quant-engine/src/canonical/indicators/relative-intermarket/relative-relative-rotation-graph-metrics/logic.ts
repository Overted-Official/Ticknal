import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,momentumPeriod=parameters.momentumPeriod as number,benchmark=contextualSeries(frame,inputs,'benchmark'),raw=frame.bars.map((bar,index)=>benchmark[index]===null||benchmark[index]===0?null:bar.close/benchmark[index]!);
  const ratio=raw.map((value,index)=>{if(value===null||index+1<period)return null;const window=raw.slice(index-period+1,index+1);if(window.some((candidate)=>candidate===null))return null;const average=(window as number[]).reduce((sum,candidate)=>sum+candidate,0)/period;return average===0?null:value/average*100;});
  const momentum=ratio.map((value,index)=>index<momentumPeriod||value===null||ratio[index-momentumPeriod]===null||ratio[index-momentumPeriod]===0?null:value/ratio[index-momentumPeriod]!*100);
  const quadrant=ratio.map((value,index)=>{const movement=momentum[index];if(value===null||movement===null)return null;if(value>=100&&movement>=100)return 'leading';if(value<100&&movement>=100)return 'improving';if(value>=100)return 'weakening';return 'lagging';});
  return {'jdk-rs-ratio':ratio,'rs-momentum':momentum,quadrant};
};
export default compute;
