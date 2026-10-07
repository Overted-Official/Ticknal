import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, crossDown, crossUp, highPass, map2, n, superSmoother } from '../shared';
const compute: Compute = (frame, p) => { const filtered = superSmoother(highPass(close(frame), n(p,'period')), Math.max(3, Math.round(n(p,'period') / 2))); const power = superSmoother(filtered.map((value) => value === null ? null : value ** 2), n(p,'period')); const wave = map2(filtered, power, (value, energy) => energy <= 0 ? 0 : value / Math.sqrt(energy)); const projected = wave.map((value, i) => value === null || wave[i-1] === null ? null : 2 * value - wave[i-1]!); return { wave, projected, reversal_up: crossUp(wave, projected), reversal_down: crossDown(wave, projected) }; };
export default compute;
