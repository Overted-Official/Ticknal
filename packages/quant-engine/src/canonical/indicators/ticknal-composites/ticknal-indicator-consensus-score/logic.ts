import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { normalizedIndicatorSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const selected=normalizedIndicatorSeries(frame,inputs),minimumInputs=parameters.minimumInputs as number,minimumCoverage=parameters.minimumCoverage as number,bullishThreshold=parameters.bullishThreshold as number,bearishThreshold=parameters.bearishThreshold as number;
  const averages=frame.bars.map((_,index)=>{const values=selected.map((series)=>series[index]).filter((value):value is number=>value!==null);const coverage=selected.length===0?0:values.length/selected.length;return values.length<minimumInputs||coverage<minimumCoverage?null:{score:values.reduce((sum,value)=>sum+value,0)/values.length,coverage};});
  return {bullish:averages.map((value)=>value===null?null:value.score>=bullishThreshold),bearish:averages.map((value)=>value===null?null:value.score<=bearishThreshold),'neutral-agreement-coverage':averages.map((value)=>value===null?null:value.coverage*(1-Math.min(1,Math.abs(value.score))))};
};
export default compute;
