import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { quadraticPortfolioVariance,rollingPortfolioSnapshots } from '../shared';
const compute: Compute=(frame,parameters,inputs)=>{
  const snapshots=rollingPortfolioSnapshots(frame,inputs,parameters.period as number),marginal=snapshots.map((snapshot)=>{if(snapshot===null)return null;const variance=quadraticPortfolioVariance(snapshot.weights,snapshot.covariance),volatility=Math.sqrt(Math.max(0,variance));if(volatility===0)return null;const values=snapshot.weights.map((_,asset)=>snapshot.covariance[asset]!.reduce((sum,value,index)=>sum+value*snapshot.weights[index]!,0)/volatility);return Math.max(...values);});
  const percentage=snapshots.map((snapshot)=>{if(snapshot===null)return null;const variance=quadraticPortfolioVariance(snapshot.weights,snapshot.covariance);if(variance===0)return null;const values=snapshot.weights.map((weight,asset)=>weight*snapshot.covariance[asset]!.reduce((sum,value,index)=>sum+value*snapshot.weights[index]!,0)/variance*100);return Math.max(...values);});
  return {marginal_contribution:marginal,percentage_contribution:percentage};
};
export default compute;
