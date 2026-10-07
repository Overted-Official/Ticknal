import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { modelSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>({zone:modelSeries(frame,inputs,'cerberus','zone'),up:modelSeries(frame,inputs,'cerberus','up'),down:modelSeries(frame,inputs,'cerberus','down'),'regime-direction':modelSeries(frame,inputs,'cerberus','regimeDirection'),'state-changes':modelSeries(frame,inputs,'cerberus','stateChanges')});
export default compute;
