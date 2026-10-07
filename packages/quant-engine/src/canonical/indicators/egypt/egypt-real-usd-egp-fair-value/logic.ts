import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { contextualSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>{
  const egyptCpi=contextualSeries(frame,inputs,'egyptCpiIndex'),usCpi=contextualSeries(frame,inputs,'usCpiIndex'),spot=contextualSeries(frame,inputs,'usdEgp');
  let base:number|null=null;
  const fairValue=spot.map((value,index)=>{
    if(value===null||egyptCpi[index]===null||usCpi[index]===null||egyptCpi[index]!<=0||usCpi[index]!<=0)return null;
    if(base===null)base=index;
    return spot[base]!*(egyptCpi[index]!/egyptCpi[base]!)/(usCpi[index]!/usCpi[base]!);
  });
  return {
    'fair-value':fairValue,
    'misvaluation-pct':spot.map((value,index)=>value===null||fairValue[index]===null||fairValue[index]===0?null:(value/fairValue[index]!-1)*100),
    confidence:fairValue.map((value,index)=>value===null?null:Math.min(1,(index-(base??index)+1)/12)),
  };
};
export default compute;
