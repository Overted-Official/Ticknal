import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { close, crossDown, crossUp, dominantCycle, n } from '../shared';
const compute: Compute = (frame, p) => { const source = close(frame); const phase = dominantCycle(source,n(p,'window'),n(p,'minPeriod'),n(p,'maxPeriod')).phase; const mama: (number|null)[] = Array(source.length).fill(null), fama: (number|null)[] = Array(source.length).fill(null); for (let i=0;i<source.length;i+=1) { if (phase[i]===null) continue; const change = i===0 || phase[i-1]===null ? 1 : Math.max(1, Math.abs(phase[i]! - phase[i-1]!)); const alpha = Math.max(n(p,'slowLimit'), Math.min(n(p,'fastLimit'), n(p,'fastLimit') / change)); mama[i] = i===0 || mama[i-1]===null ? source[i] : alpha * source[i] + (1-alpha) * mama[i-1]!; fama[i] = i===0 || fama[i-1]===null ? mama[i] : 0.5 * alpha * mama[i]! + (1-0.5*alpha) * fama[i-1]!; } return { mama, fama, cross_up: crossUp(mama,fama), cross_down: crossDown(mama,fama) }; };
export default compute;
