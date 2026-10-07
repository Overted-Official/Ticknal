import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { bandPass, close, map2, n } from '../shared';
const compute: Compute = (frame,p) => { const source=close(frame), center=(n(p,'lowPeriod')+n(p,'highPeriod'))/2, bandwidth=(n(p,'highPeriod')-n(p,'lowPeriod'))/(n(p,'highPeriod')+n(p,'lowPeriod')), cycle=bandPass(source,center,bandwidth); return { cycle, trend:map2(source,cycle,(price,value)=>price-value) }; };
export default compute;
