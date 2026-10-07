import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
import { n, sma } from '../shared';
const compute:Compute=(frame,p)=>{const ats=frame.bars.map((bar)=>bar.trades===null||bar.trades===0||bar.volume===null?null:bar.close*bar.volume/bar.trades),average=sma(ats,n(p,'period')),relative_ats=ats.map((value,i)=>value===null||average[i]===null||average[i]===0?null:value/average[i]!),absorption=frame.bars.map((bar,i)=>bar.volume===null||bar.high===bar.low?null:relative_ats[i]===null?null:relative_ats[i]!*(bar.volume/Math.max(1,frame.bars.slice(Math.max(0,i-n(p,'period')+1),i+1).reduce((sum,item)=>sum+(item.volume??0),0)/Math.min(i+1,n(p,'period'))))/(bar.high-bar.low));return{ats,relative_ats,absorption,state:absorption.map((value)=>value===null?null:value>2?'accumulation':value>1?'watch':'normal')}};
export default compute;
