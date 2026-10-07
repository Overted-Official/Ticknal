import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, dominantCycle, n } from '../shared';
const compute: Compute = (frame, p) => { const source = close(frame); const period = dominantCycle(source, n(p,'window'), n(p,'minPeriod'), n(p,'maxPeriod')).period; const efficiency = source.map((value, i) => { const lookback = period[i]; if (lookback === null || i < lookback) return null; let path = 0; for (let j = i - lookback + 1; j <= i; j += 1) path += Math.abs(source[j] - source[j-1]); return path === 0 ? 0 : Math.abs(value - source[i-lookback]) / path; }); return { trend_mode: efficiency.map((value) => value === null ? null : value >= 0.35), cycle_mode: efficiency.map((value) => value === null ? null : value < 0.35) }; };
export default compute;
