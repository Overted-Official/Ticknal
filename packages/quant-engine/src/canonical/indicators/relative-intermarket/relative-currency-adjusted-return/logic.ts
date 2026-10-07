import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,parameters,inputs)=>{
  const period=parameters.period as number,currency=parameters.currency as string,fx=contextualSeries(frame,inputs,'usdEgp');
  const adjusted=frame.bars.map((bar,index)=>{if(index<period||frame.bars[index-period]!.close===0)return null;const assetReturn=bar.close/frame.bars[index-period]!.close-1;if(currency==='EGP')return assetReturn*100;if(fx[index]===null||fx[index-period]===null||fx[index-period]===0)return null;return ((1+assetReturn)/(fx[index]!/fx[index-period]!)-1)*100;});
  return {'adjusted-return':adjusted,'selected-currency':Array(frame.bars.length).fill(currency)};
};
export default compute;
