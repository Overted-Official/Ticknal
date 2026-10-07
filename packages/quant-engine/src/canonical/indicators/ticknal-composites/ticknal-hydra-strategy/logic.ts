import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { modelSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>({'position-state':modelSeries(frame,inputs,'hydra','positionState'),'regime-value':modelSeries(frame,inputs,'hydra','regimeValue'),'dynamic-theta':modelSeries(frame,inputs,'hydra','dynamicTheta'),'entry-exit-events':modelSeries(frame,inputs,'hydra','entryExitEvent')});
export default compute;
