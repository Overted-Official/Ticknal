import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute = CategoryIndicatorSpec<Params>['compute'];
import { bandPass, close, n } from '../shared';
const compute: Compute = (frame,p) => { const band_pass=bandPass(close(frame),n(p,'period'),n(p,'bandwidth')); return { band_pass, trigger:band_pass.map((_,i)=>band_pass[i-1]??null), period:Array(frame.bars.length).fill(n(p,'period')) }; };
export default compute;
