import { buildCategoryPresentationEntries } from '../shared/category-presentation';
import { TICKNAL_COMPOSITE_DEFINITIONS,TICKNAL_COMPOSITE_OPERATIONAL_DEFINITIONS } from './definitions';
const ARABIC_NAMES=["مؤشر Typhon or PSI 8 Master Index","مؤشر PSI 40 Score","مؤشر Cerberus or PSI V2","مؤشر HYDRA Strategy","مؤشر Champion Strategy Resolver","مؤشر Smart Money Flow","مؤشر Strategy Consensus","مؤشر Opportunity Quality Score","مؤشر Indicator Consensus Score","مؤشر Data Confidence Score"] as const;
export const TICKNAL_COMPOSITE_PRESENTATION_ENTRIES=buildCategoryPresentationEntries(TICKNAL_COMPOSITE_DEFINITIONS,{arabicNames:ARABIC_NAMES,decimalKeys:['thresholdPct']});
const ids=new Set(TICKNAL_COMPOSITE_OPERATIONAL_DEFINITIONS.map((definition)=>definition.id));
export const TICKNAL_COMPOSITE_OPERATIONAL_PRESENTATION_ENTRIES=Object.freeze(TICKNAL_COMPOSITE_PRESENTATION_ENTRIES.filter((entry)=>ids.has(entry.id)));
