import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { quadraticPortfolioVariance,rollingPortfolioSnapshots } from '../shared';
const compute: Compute=(frame,parameters,inputs)=>({diversification_ratio:rollingPortfolioSnapshots(frame,inputs,parameters.period as number).map((snapshot)=>{if(snapshot===null)return null;const portfolioVolatility=Math.sqrt(Math.max(0,quadraticPortfolioVariance(snapshot.weights,snapshot.covariance)));if(portfolioVolatility===0)return null;const weightedVolatility=snapshot.weights.reduce((sum,weight,index)=>sum+weight*Math.sqrt(Math.max(0,snapshot.covariance[index]?.[index]??0)),0);return weightedVolatility/portfolioVolatility;})});
export default compute;
