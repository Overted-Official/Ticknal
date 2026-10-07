import type { IndicatorInputBundle, IndicatorOutputDefinition, TimeSeriesFrame } from '../../contracts';
import { alignNumericSeries } from '../../core/alignment/align-series';
import { simpleReturns } from '../../core/contextual/pair-statistics';
import { ema, rollingStdDev, sma } from '../../core/series';
import type { CategoryParameterRule } from '../shared/category-definition';
export type Params=Record<string,unknown>;
export type Rules=Record<string,CategoryParameterRule>;
export type Series=readonly (number|null)[];
export { ema, rollingStdDev, sma };
export const integer=(min=1,max=100000):CategoryParameterRule=>({kind:'integer',min,max});
export const number=(min:number,max:number):CategoryParameterRule=>({kind:'number',min,max});
export const string=(minLength=1):CategoryParameterRule=>({kind:'string',minLength});
export const pane=(key:string,label:string,unit:IndicatorOutputDefinition['unit']='dimensionless',kind:IndicatorOutputDefinition['kind']='number'):IndicatorOutputDefinition=>({key,label,unit,kind,placement:kind==='boolean'?'event':'pane',nullable:true});
export const category=(key:string,label:string):IndicatorOutputDefinition=>pane(key,label,'category','category');
export const event=(key:string,label:string):IndicatorOutputDefinition=>pane(key,label,'boolean','boolean');
export const n=(parameters:Params,key:string):number=>parameters[key] as number;
export const close=(frame:TimeSeriesFrame):number[]=>frame.bars.map((bar)=>bar.close);
export const empty=(frame:TimeSeriesFrame,keys:readonly string[])=>Object.fromEntries(keys.map((key)=>[key,Array(frame.bars.length).fill(null)]));
export const map2=(left:Series,right:Series,fn:(left:number,right:number,index:number)=>number|null):Series=>left.map((value,index)=>value===null||right[index]===null?null:fn(value,right[index]!,index));
export const returns=(source:readonly number[],period=1):Series=>source.map((value,index)=>index<period||source[index-period]===0?null:value/source[index-period]-1);
export const contextualSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle,role:string):Series=>{const source=inputs.seriesByRole[role];return source===undefined?Array(frame.bars.length).fill(null):alignNumericSeries(frame.bars.map((bar)=>bar.time),source).values;};
export const priceReturns=(source:Series):Series=>simpleReturns(source);
export const rollingPair=(left:Series,right:Series,period:number,calculate:(left:readonly number[],right:readonly number[])=>number|null):Series=>left.map((_,index)=>{if(index+1<period)return null;const l=left.slice(index-period+1,index+1),r=right.slice(index-period+1,index+1);if(l.some((value)=>value===null)||r.some((value)=>value===null))return null;const value=calculate(l as number[],r as number[]);return value!==null&&Number.isFinite(value)?value:null;});

function timeMilliseconds(time: TimeSeriesFrame['bars'][number]['time']): number {
  if (typeof time === 'number') return time < 1_000_000_000_000 ? time * 1000 : time;
  return Date.parse(time);
}

function subtractCalendarMonths(timestamp: number, months: number): number {
  const source = new Date(timestamp);
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(
    source.getUTCFullYear(), source.getUTCMonth() - months, 1,
    source.getUTCHours(), source.getUTCMinutes(), source.getUTCSeconds(), source.getUTCMilliseconds(),
  ));
  const lastDay = new Date(Date.UTC(
    target.getUTCFullYear(), target.getUTCMonth() + 1, 0,
  )).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.getTime();
}

function calendarLagIndex(
  frame: TimeSeriesFrame,
  currentIndex: number,
  months: number,
): number | null {
  const target = subtractCalendarMonths(timeMilliseconds(frame.bars[currentIndex]!.time), months);
  for (let index = currentIndex - 1; index >= 0; index -= 1) {
    if (timeMilliseconds(frame.bars[index]!.time) <= target) return index;
  }
  return null;
}

export function calendarLaggedSeries(
  frame: TimeSeriesFrame,
  source: Series,
  months: number,
): Series {
  return source.map((_, index) => {
    const lagIndex = calendarLagIndex(frame, index, months);
    return lagIndex === null ? null : source[lagIndex] ?? null;
  });
}

export function calendarGrowth(
  frame: TimeSeriesFrame,
  source: Series,
  months: number,
): Series {
  const lagged = calendarLaggedSeries(frame, source, months);
  return source.map((value, index) => value === null || lagged[index] === null || lagged[index] === 0
    ? null
    : value / lagged[index]! - 1);
}

export function rollingCalendarPair(
  frame: TimeSeriesFrame,
  left: Series,
  right: Series,
  periodMonths: number,
  calculate: (leftWindow: readonly number[], rightWindow: readonly number[]) => number | null,
): Series {
  return left.map((_, index) => {
    const indices = [index];
    for (let month = 1; month < periodMonths; month += 1) {
      const lagIndex = calendarLagIndex(frame, index, month);
      if (lagIndex === null || indices.includes(lagIndex)) return null;
      indices.push(lagIndex);
    }
    const leftWindow = indices.map((candidate) => left[candidate]);
    const rightWindow = indices.map((candidate) => right[candidate]);
    if (leftWindow.some((value) => value === null) || rightWindow.some((value) => value === null)) return null;
    const value = calculate(leftWindow as number[], rightWindow as number[]);
    return value !== null && Number.isFinite(value) ? value : null;
  });
}
