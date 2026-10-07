import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { modelSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>({'raw-index':modelSeries(frame,inputs,'typhon','rawIndex'),'master-index':modelSeries(frame,inputs,'typhon','masterIndex'),'adjusted-index':modelSeries(frame,inputs,'typhon','adjustedIndex'),'levels-crossed':modelSeries(frame,inputs,'typhon','levelsCrossed')});
export default compute;
