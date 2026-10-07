import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { portfolioWeights } from '../shared';
const compute: Compute=(frame,_parameters,inputs)=>{const weights=portfolioWeights(inputs),hhi=weights?.reduce((sum,weight)=>sum+weight**2,0)??null;return {hhi:Array(frame.bars.length).fill(hhi),effective_holdings:Array(frame.bars.length).fill(hhi===null||hhi===0?null:1/hhi)};};
export default compute;
