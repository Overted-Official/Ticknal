import { BREADTH_PROGRAM_ENTRIES } from './breadth';
import { CYCLES_PROGRAM_ENTRIES } from './cycles';
import { EGYPT_PROGRAM_ENTRIES } from './egypt';
import { MARKET_STRUCTURE_PROGRAM_ENTRIES } from './market-structure';
import { MOMENTUM_PROGRAM_ENTRIES } from './momentum';
import { PRICE_ACTION_PROGRAM_ENTRIES } from './price-action';
import { PRICE_RETURN_PROGRAM_ENTRIES } from './price-return';
import { QUANTITATIVE_PROGRAM_ENTRIES } from './quantitative';
import { RELATIVE_INTERMARKET_PROGRAM_ENTRIES } from './relative-intermarket';
import { RISK_PORTFOLIO_PROGRAM_ENTRIES } from './risk-portfolio';
import { TICKNAL_COMPOSITE_PROGRAM_ENTRIES } from './ticknal-composites';
import { TREND_PROGRAM_ENTRIES } from './trend';
import { VOLATILITY_PROGRAM_ENTRIES } from './volatility';
import { VOLUME_FLOW_PROGRAM_ENTRIES } from './volume-flow';

export { BREADTH_PROGRAM_ENTRIES } from './breadth';
export { CYCLES_PROGRAM_ENTRIES } from './cycles';
export { EGYPT_PROGRAM_ENTRIES } from './egypt';
export { MARKET_STRUCTURE_PROGRAM_ENTRIES } from './market-structure';
export { MOMENTUM_PROGRAM_ENTRIES } from './momentum';
export { PRICE_ACTION_PROGRAM_ENTRIES } from './price-action';
export { PRICE_RETURN_PROGRAM_ENTRIES } from './price-return';
export { QUANTITATIVE_PROGRAM_ENTRIES } from './quantitative';
export { RELATIVE_INTERMARKET_PROGRAM_ENTRIES } from './relative-intermarket';
export { RISK_PORTFOLIO_PROGRAM_ENTRIES } from './risk-portfolio';
export { TICKNAL_COMPOSITE_PROGRAM_ENTRIES } from './ticknal-composites';
export { TREND_PROGRAM_ENTRIES } from './trend';
export { VOLATILITY_PROGRAM_ENTRIES } from './volatility';
export { VOLUME_FLOW_PROGRAM_ENTRIES } from './volume-flow';

export const FIRST_PROGRAM_CATEGORY_ENTRIES = Object.freeze([
  PRICE_RETURN_PROGRAM_ENTRIES,
  TREND_PROGRAM_ENTRIES,
  MOMENTUM_PROGRAM_ENTRIES,
  VOLATILITY_PROGRAM_ENTRIES,
  VOLUME_FLOW_PROGRAM_ENTRIES,
  MARKET_STRUCTURE_PROGRAM_ENTRIES,
  CYCLES_PROGRAM_ENTRIES,
]);

export const REMAINING_PROGRAM_CATEGORY_ENTRIES = Object.freeze([
  QUANTITATIVE_PROGRAM_ENTRIES,
  BREADTH_PROGRAM_ENTRIES,
  RELATIVE_INTERMARKET_PROGRAM_ENTRIES,
  RISK_PORTFOLIO_PROGRAM_ENTRIES,
  PRICE_ACTION_PROGRAM_ENTRIES,
  EGYPT_PROGRAM_ENTRIES,
  TICKNAL_COMPOSITE_PROGRAM_ENTRIES,
]);

export const PROGRAM_CATEGORY_ENTRIES = Object.freeze([
  ...FIRST_PROGRAM_CATEGORY_ENTRIES,
  ...REMAINING_PROGRAM_CATEGORY_ENTRIES,
]);
