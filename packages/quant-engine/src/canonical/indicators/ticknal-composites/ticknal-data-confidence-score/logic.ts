import type { CategoryIndicatorSpec } from '../../shared/category-definition';
import type { Params } from '../shared';
type Compute=CategoryIndicatorSpec<Params>['compute'];
const compute:Compute=(frame)=>{const fieldWarnings=Object.values(frame.meta.fields).filter((field)=>field.coverage!=='observed').length,gapWarning=frame.meta.continuityStatus==='gapped'?1:0,partialWarning=frame.meta.sessionCompleteness==='partial'?1:0,provisional=frame.bars.at(-1)?.finality==='provisional'?1:0,warnings=fieldWarnings+gapWarning+partialWarning+provisional,historyScore=Math.min(40,frame.bars.length/5),provenanceScore=frame.meta.sourceId&&frame.meta.sourceRevision?30:0,qualityScore=Math.max(0,30-warnings*6),score=Math.min(100,historyScore+provenanceScore+qualityScore);return{confidence_0_100:Array(frame.bars.length).fill(score),warning_count:Array(frame.bars.length).fill(warnings),coverage_state:Array(frame.bars.length).fill(score>=80?'high':score>=50?'medium':'low')}};
export default compute;
