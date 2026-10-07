import type { CompletedTrade, IndicatorInputBundle, IndicatorOutputDefinition, ObservationTime, TimeSeriesFrame } from '../../contracts';
import { alignNumericSeries } from '../../core/alignment/align-series';
import { simpleReturns } from '../../core/contextual/pair-statistics';
import { normalizeWeights, portfolioCovariance } from '../../core/contextual/portfolio-statistics';
import type { CategoryParameterRule } from '../shared/category-definition';

export type Series = readonly (number | null)[];
export type Params = Record<string, unknown>;
export type Rules = Record<string, CategoryParameterRule>;
export const integer = (min = 1, max = 100000): CategoryParameterRule => ({ kind: 'integer', min, max });
export const number = (min: number, max: number): CategoryParameterRule => ({ kind: 'number', min, max });
export const pane = (key: string, label: string, unit: IndicatorOutputDefinition['unit'] = 'dimensionless', kind: IndicatorOutputDefinition['kind'] = 'number'): IndicatorOutputDefinition => ({ key, label, unit, kind, placement: kind === 'boolean' ? 'event' : 'pane', nullable: true });
export const category = (key: string, label: string): IndicatorOutputDefinition => pane(key, label, 'category', 'category');
export const n = (parameters: Params, key: string): number => parameters[key] as number;
export const close = (frame: TimeSeriesFrame): number[] => frame.bars.map((bar) => bar.close);
export const returns = (source: readonly number[], horizon = 1): Series => source.map((value, index) => index < horizon || source[index - horizon] === 0 ? null : value / source[index - horizon] - 1);
export const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
export const deviation = (values: readonly number[]) => { const average = mean(values); return Math.sqrt(mean(values.map((value) => (value - average) ** 2))); };
export const quantile = (values: readonly number[], probability: number) => { const sorted = [...values].sort((a,b)=>a-b); const position = Math.max(0, Math.min(sorted.length - 1, probability * (sorted.length - 1))); const lower = Math.floor(position), upper = Math.ceil(position), fraction = position - lower; return sorted[lower] * (1-fraction) + sorted[upper] * fraction; };
export function windowMap(series: Series, period: number, calculate: (window: readonly number[]) => number | null): Series { return series.map((_, index) => { if(index + 1 < period) return null; const window=series.slice(index-period+1,index+1); return window.some((value)=>value===null)?null:calculate(window as number[]); }); }
export function drawdown(source: readonly number[]) { const drawdown:number[]=[], maximum:number[]=[], currentDuration:number[]=[], maximumDuration:number[]=[]; let peak=-Infinity, worst=0, duration=0, longest=0; for(const value of source){ if(value>=peak){peak=value;duration=0;}else duration+=1; const current=peak<=0?0:value/peak-1; worst=Math.min(worst,current); longest=Math.max(longest,duration); drawdown.push(current);maximum.push(worst);currentDuration.push(duration);maximumDuration.push(longest); } return { drawdown, maximum, currentDuration, maximumDuration }; }
export function inverseNormal(probability: number) { const p=Math.max(1e-12,Math.min(1-1e-12,probability)); const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924], b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857], c=[-0.00778489400243029,-0.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878], d=[0.00778469570904146,0.32246712907004,2.445134137143,3.75440866190742]; if(p<0.02425){const q=Math.sqrt(-2*Math.log(p));return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);} if(p>0.97575){const q=Math.sqrt(-2*Math.log(1-p));return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);} const q=p-0.5,r=q*q; return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1); }
export const empty = (frame: TimeSeriesFrame, keys: readonly string[]) => Object.fromEntries(keys.map((key)=>[key,Array(frame.bars.length).fill(null)]));
export const contextualSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle,role:string):Series=>{
  const source=inputs.seriesByRole[role];
  return source===undefined?Array(frame.bars.length).fill(null):alignNumericSeries(frame.bars.map((bar)=>bar.time),source).values;
};
export const priceReturns=(source:Series):Series=>simpleReturns(source);
export const rollingPair=(left:Series,right:Series,period:number,calculate:(left:readonly number[],right:readonly number[])=>number|null):Series=>left.map((_,index)=>{if(index+1<period)return null;const l=left.slice(index-period+1,index+1),r=right.slice(index-period+1,index+1);if(l.some((value)=>value===null)||r.some((value)=>value===null))return null;const value=calculate(l as number[],r as number[]);return value!==null&&Number.isFinite(value)?value:null;});
const timeValue=(time:ObservationTime):number=>typeof time==='number'?time:Date.parse(time);
export const completedTradesThrough=(inputs:IndicatorInputBundle,time:ObservationTime):readonly CompletedTrade[]=>{
  const cutoff=timeValue(time);
  return [...(inputs.completedTrades?.trades??[])]
    .filter((trade)=>timeValue(trade.exitTime)<=cutoff)
    .sort((left,right)=>timeValue(left.exitTime)-timeValue(right.exitTime));
};
export const tradeSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle,calculate:(trades:readonly CompletedTrade[])=>number|null,emptyValue:number|null=null):Series=>frame.bars.map((bar)=>{const trades=completedTradesThrough(inputs,bar.time);return trades.length===0?emptyValue:calculate(trades);});
export interface PortfolioSnapshot{readonly weights:readonly number[];readonly covariance:readonly (readonly number[])[];}
export const portfolioWeights=(inputs:IndicatorInputBundle):readonly number[]|null=>inputs.portfolio===null?null:normalizeWeights(inputs.portfolio.holdings.map((holding)=>holding.marketValue));
export const holdingReturnSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle):readonly Series[]=>inputs.portfolio?.holdings.map((holding)=>priceReturns(contextualSeries(frame,inputs,`holding:${holding.symbol}`)))??[];
export const portfolioReturnSeries=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle):Series=>{
  const weights=portfolioWeights(inputs),assets=holdingReturnSeries(frame,inputs);
  if(weights===null||assets.length!==weights.length)return Array(frame.bars.length).fill(null);
  return frame.bars.map((_,index)=>{const row=assets.map((series)=>series[index]);if(row.some((value)=>value===null))return null;return (row as number[]).reduce<number>((sum,value,asset)=>sum+value*weights[asset]!,0);});
};
export const rollingPortfolioSnapshots=(frame:TimeSeriesFrame,inputs:IndicatorInputBundle,period:number):readonly (PortfolioSnapshot|null)[]=>{
  const weights=portfolioWeights(inputs),assets=holdingReturnSeries(frame,inputs);
  if(weights===null||assets.length!==weights.length)return frame.bars.map(()=>null);
  return frame.bars.map((_,index)=>{if(index+1<period)return null;const windows=assets.map((series)=>series.slice(index-period+1,index+1)),covariance=portfolioCovariance(windows);return covariance===null?null:{weights,covariance};});
};
export const quadraticPortfolioVariance=(weights:readonly number[],covariance:readonly (readonly number[])[]):number=>weights.reduce((total,leftWeight,left)=>total+weights.reduce((row,rightWeight,right)=>row+leftWeight*rightWeight*(covariance[left]?.[right]??0),0),0);
