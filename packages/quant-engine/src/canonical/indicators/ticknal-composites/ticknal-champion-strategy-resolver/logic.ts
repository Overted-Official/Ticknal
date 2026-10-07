import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { modelSeries } from '../shared';
const compute:Compute=(frame,_parameters,inputs)=>({'winning-model':modelSeries(frame,inputs,'champion','winningModel'),alpha:modelSeries(frame,inputs,'champion','alpha'),confidence:modelSeries(frame,inputs,'champion','confidence'),'comparison-metrics':modelSeries(frame,inputs,'champion','comparisonMetrics')});
export default compute;
