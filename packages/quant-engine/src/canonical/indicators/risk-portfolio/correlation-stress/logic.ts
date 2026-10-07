import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { quadraticPortfolioVariance,rollingPortfolioSnapshots } from '../shared';
const compute: Compute=(frame,parameters,inputs)=>{
  const annualization=parameters.annualization as number,stress=parameters.stressCorrelation as number,snapshots=rollingPortfolioSnapshots(frame,inputs,parameters.period as number),base=snapshots.map((snapshot)=>snapshot===null?null:Math.sqrt(Math.max(0,quadraticPortfolioVariance(snapshot.weights,snapshot.covariance)))*Math.sqrt(annualization)*100),stressed=snapshots.map((snapshot)=>{if(snapshot===null)return null;const covariance=snapshot.covariance.map((row,left)=>row.map((value,right)=>{if(left===right)return value;const maximum=Math.sqrt(Math.max(0,snapshot.covariance[left]?.[left]??0)*Math.max(0,snapshot.covariance[right]?.[right]??0));return Math.max(value,stress*maximum);}));return Math.sqrt(Math.max(0,quadraticPortfolioVariance(snapshot.weights,covariance)))*Math.sqrt(annualization)*100;});
  return {stressed_volatility_pct:stressed,delta_risk_pct:stressed.map((value,index)=>value===null||base[index]===null?null:value-base[index]!)};
};
export default compute;
