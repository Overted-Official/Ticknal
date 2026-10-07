import type { IndicatorInputBundle, IndicatorOutputDefinition, TimeSeriesFrame } from '../../contracts';
import { alignNumericSeries } from '../../core/alignment/align-series';
import { linearFit, populationCovariance, simpleReturns } from '../../core/contextual/pair-statistics';
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

export const contextualSeries=(
  frame:TimeSeriesFrame,
  inputs:IndicatorInputBundle,
  role:string,
):Series=>{
  const source=inputs.seriesByRole[role];
  return source===undefined
    ? Array(frame.bars.length).fill(null)
    : alignNumericSeries(frame.bars.map((bar)=>bar.time),source).values;
};

export const priceReturns=(series:Series):Series=>simpleReturns(series);

export const rollingPair=(
  left:Series,
  right:Series,
  period:number,
  calculate:(leftWindow:readonly number[],rightWindow:readonly number[])=>number|null,
):Series=>left.map((_,index)=>{
  if(index+1<period)return null;
  const l=left.slice(index-period+1,index+1),r=right.slice(index-period+1,index+1);
  if(l.some((value)=>value===null)||r.some((value)=>value===null))return null;
  const result=calculate(l as number[],r as number[]);
  return result!==null&&Number.isFinite(result)?result:null;
});

export const correlation=(left:readonly number[],right:readonly number[]):number|null=>{
  const covariance=populationCovariance(left,right),leftVariance=populationCovariance(left,left),rightVariance=populationCovariance(right,right);
  if(covariance===null||leftVariance===null||rightVariance===null||leftVariance<=0||rightVariance<=0)return null;
  return covariance/Math.sqrt(leftVariance*rightVariance);
};

export const betaAlpha=(asset:readonly number[],benchmark:readonly number[])=>{
  const fit=linearFit(asset,benchmark);
  return fit===null?null:{beta:fit.slope,alpha:fit.intercept};
};

export const rollingZScore=(series:Series,period:number):Series=>series.map((value,index)=>{
  if(value===null||index+1<period)return null;
  const window=series.slice(index-period+1,index+1);
  if(window.some((candidate)=>candidate===null))return null;
  const numeric=window as number[],average=numeric.reduce((sum,candidate)=>sum+candidate,0)/period;
  const deviation=Math.sqrt(numeric.reduce((sum,candidate)=>sum+(candidate-average)**2,0)/period);
  return deviation===0?0:(value-average)/deviation;
});
