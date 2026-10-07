import { defineProgramCategory } from './define-category';

export const TICKNAL_COMPOSITE_PROGRAM_ENTRIES = defineProgramCategory("ticknal-composites", [
  ["TKL-001", null, "Typhon or PSI 8 Master Index", "Proprietary strategy combining normalized price, RSI, banker flow, Bollinger position, Supertrend, DMI, MA spread, and slope.", "raw index, master index, adjusted index, levels crossed", null, "EGX equities, P", ["P"], "T0", "Internal only", "unimplemented"],
  ["TKL-002", null, "PSI 40 Score", "Internal 40-condition momentum, trend, volatility, volume, and statistical score.", "score_0_100, category subscores, agreement count", null, "Equities, PV", ["P", "V"], "T0", "Internal only", "unimplemented"],
  ["TKL-003", null, "Cerberus or PSI V2", "Three-headed stateful swing and regime strategy.", "zone, up, down, regime direction, state changes", null, "EGX equities, P", ["P"], "T0", "Internal only", "unimplemented"],
  ["TKL-004", null, "HYDRA Strategy", "Strategy built around the HYDRA regime model.", "position state, regime value, dynamic theta, entry and exit events", null, "EGX equities, P", ["P"], "T0", "Existing strategy", "unimplemented"],
  ["TKL-005", null, "Champion Strategy Resolver", "Chooses the positive-alpha strategy for each ticker.", "winning model, alpha, confidence, comparison metrics", null, "EGX equities, P", ["P"], "T0", "Internal service", "unimplemented"],
  ["TKL-006", null, "Smart Money Flow", "Chart indicator using verified transaction statistics and price-volume absorption.", "ATS, relative ATS, absorption, accumulation and distribution states", null, "EGX equities, PVT", ["P", "V", "T"], "T0", "Existing chart", "unimplemented"],
  ["TKL-007", null, "Strategy Consensus", "Agreement across Typhon, Cerberus, and HYDRA.", "vote count, consensus state, disagreement", null, "EGX equities, P", ["P"], "T2", "Existing partial logic", "unimplemented"],
  ["TKL-008", null, "Opportunity Quality Score", "Candidate ranking using signal age, alpha, risk, liquidity, and regime.", "score, rank, component explanations", null, "EGX equities, PVT", ["P", "V", "T"], "T2", "Existing adjacent logic", "unimplemented"],
  ["TKL-009", null, "Indicator Consensus Score", "User-selected set of normalized indicators combined without becoming a strategy.", "bullish, bearish, neutral agreement and coverage", null, "All, selected inputs", [], "T2", "New builder output", "unimplemented"],
  ["TKL-010", null, "Data Confidence Score", "Rates whether an indicator result is trustworthy given history length, gaps, volume, and freshness.", "confidence_0_100, warnings, missing inputs", null, "All", [], "T1", "New platform primitive", "unimplemented"],
], [
  "ticknal-typhon-or-psi-8-master-index",
  "ticknal-psi-40-score",
  "ticknal-cerberus-or-psi-v2",
  "ticknal-hydra-strategy",
  "ticknal-champion-strategy-resolver",
  "ticknal-smart-money-flow",
  "ticknal-strategy-consensus",
  "ticknal-opportunity-quality-score",
  "ticknal-indicator-consensus-score",
  "ticknal-data-confidence-score",
]);
