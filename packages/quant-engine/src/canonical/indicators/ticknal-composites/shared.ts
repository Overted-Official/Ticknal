import type { IndicatorInputBundle, IndicatorOutputDefinition, IndicatorOutputValue, ObservationTime, TimeSeriesFrame } from '../../contracts';
import { ema, rollingStdDev, sma } from '../../core/series';
import type { CategoryParameterRule } from '../shared/category-definition';
export type Params=Record<string,unknown>;
export type Rules=Record<string,CategoryParameterRule>;
export type Series=readonly (number|null)[];
export { ema, rollingStdDev, sma };
export const integer=(min=1,max=100000):CategoryParameterRule=>({kind:'integer',min,max});
export const number=(min:number,max:number):CategoryParameterRule=>({kind:'number',min,max});
export const pane=(key:string,label:string,unit:IndicatorOutputDefinition['unit']='dimensionless',kind:IndicatorOutputDefinition['kind']='number'):IndicatorOutputDefinition=>({key,label,unit,kind,placement:kind==='boolean'?'event':'pane',nullable:true});
export const category=(key:string,label:string):IndicatorOutputDefinition=>pane(key,label,'category','category');
export const event=(key:string,label:string):IndicatorOutputDefinition=>pane(key,label,'boolean','boolean');
export const n=(parameters:Params,key:string):number=>parameters[key] as number;
export const close=(frame:TimeSeriesFrame):number[]=>frame.bars.map((bar)=>bar.close);
export const empty=(frame:TimeSeriesFrame,keys:readonly string[])=>Object.fromEntries(keys.map((key)=>[key,Array(frame.bars.length).fill(null)]));
export const map2=(left:Series,right:Series,fn:(left:number,right:number,index:number)=>number|null):Series=>left.map((value,index)=>value===null||right[index]===null?null:fn(value,right[index]!,index));
export const returns=(source:readonly number[],period=1):Series=>source.map((value,index)=>index<period||source[index-period]===0?null:value/source[index-period]-1);
const timeKey=(time:ObservationTime)=>`${typeof time}:${String(time)}`;
export const modelSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle,modelId:string,key:string):readonly IndicatorOutputValue[]=>{
  const model=inputs.modelOutputsById[modelId];
  if(model===undefined)return frame.bars.map(()=>null);
  const points=new Map(model.points.map((point)=>[timeKey(point.time),point.values[key]??null]));
  return frame.bars.map((bar)=>points.get(timeKey(bar.time))??null);
};
export const normalizedIndicatorSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle):readonly Series[]=>Object.values(inputs.indicatorOutputsById).map((source)=>{
  const points=new Map(source.observationTimes.map((time,index)=>[timeKey(time),source.outputs.normalizedScore?.[index]??null]));
  return frame.bars.map((bar)=>{const value=points.get(timeKey(bar.time));return typeof value==='number'&&Number.isFinite(value)?Math.max(-1,Math.min(1,value)):null;});
});
