import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries,holdingReturnSeries,portfolioReturnSeries,portfolioWeights,priceReturns,rollingPair } from '../shared';
import { linearFit } from '../../../core/contextual/pair-statistics';
const compute: Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,benchmark=priceReturns(contextualSeries(frame,inputs,'benchmark')),portfolio=portfolioReturnSeries(frame,inputs),weights=portfolioWeights(inputs),holdings=holdingReturnSeries(frame,inputs);
  const beta=rollingPair(portfolio,benchmark,period,(left,right)=>linearFit(left,right)?.slope??null);
  const component=frame.bars.map((_,index)=>{if(weights===null||index+1<period)return null;const market=benchmark.slice(index-period+1,index+1);if(market.some((value)=>value===null))return null;const contributions=holdings.map((series,asset)=>{const window=series.slice(index-period+1,index+1);if(window.some((value)=>value===null))return null;const assetBeta=linearFit(window as number[],market as number[])?.slope;return assetBeta===undefined?null:assetBeta*weights[asset]!;});if(contributions.some((value)=>value===null))return null;return (contributions as number[]).reduce((largest,value)=>Math.abs(value)>Math.abs(largest)?value:largest,0);});
  return {beta,component_contribution:component};
};
export default compute;
