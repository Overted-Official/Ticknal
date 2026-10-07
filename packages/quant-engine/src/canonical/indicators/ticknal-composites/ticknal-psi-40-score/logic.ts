import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { modelSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>({'score-0-100':modelSeries(frame,inputs,'psi40','score'),'category-subscores':modelSeries(frame,inputs,'psi40','categorySubscores'),'agreement-count':modelSeries(frame,inputs,'psi40','agreementCount')});
export default compute;
