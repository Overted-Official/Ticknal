import type {
  FullBacktestReport,
  StrategyKeyStats,
  StrategyTrade,
  EquityPoint,
} from '@/strategies/registry';
import {
  computePsiV2Indices,
  type PriceBar,
  type PsiV2BarMetrics,
} from './psiV2Engine';
import optimizedIntraday1hParams from './optimized_intraday_1h_params.json';

export interface PsiV2StrategyOverrides {
  ticker?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  initialCapital?: number;
  buyZoneCrossUp?: number;
  buyPsiUpThreshold?: number;
  sellZoneCrossUnder?: number;
  sellPsiDownThreshold?: number;
  aymMultiplier?: number;
  atrMultiplier?: number;
  profitProtect?: boolean;
}

export interface PsiLevelThresholds {
  buyZoneCrossUp: number;
  buyPsiUpThreshold: number;
  sellZoneCrossUnder: number;
  sellPsiDownThreshold: number;
  aymMultiplier?: number;
  atrMultiplier?: number;
}

export const TICKER_PSI_LEVEL_CONFIGS: Record<string, PsiLevelThresholds> = {
  'AALR': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ABUK': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 8.0, atrMultiplier: 0.0 },
  'ACAMD': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ACAP': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ACGC': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'ACTF': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'ADCI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ADIB': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'ADPC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 6.0, atrMultiplier: 3.0 },
  'ADRI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'AFDI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 18.0, aymMultiplier: 8.0, atrMultiplier: 4.0 },
  'AFMC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'AIFI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'AIH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 4.0 },
  'AJWA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ALCN': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 8.0, atrMultiplier: 0.0 },
  'ALEX': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'ALUM': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'AMER': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'AMES': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'AMIA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 20.0, aymMultiplier: 8.0, atrMultiplier: 4.0 },
  'AMII': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'AMOC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'AMPI': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 20.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'APPC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 14.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'APSW': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'ARAB': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'ARCC': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'AREH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ASCM': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ASPI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ATLC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'ATQA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'AXPH': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'BIDI': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'BIGP': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'BINV': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'BIOC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'BTFH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'CAED': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'CANA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'CCAP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'CCRS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'CEFM': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'CERA': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'CFGH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'CICH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'CIEB': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'CIRA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'CLHO': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'CNFN': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 14.0, aymMultiplier: 6.0, atrMultiplier: 4.0 },
  'COMI': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 10.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'COPR': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 14.0, aymMultiplier: 6.0, atrMultiplier: 4.0 },
  'COSG': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'CPCI': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'CRST': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'CSAG': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 3.0 },
  'DAPH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'DCRC': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'DEIN': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'DGTZ': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'DOMT': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'DSCW': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'DTPP': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EALR': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'EASB': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 3.0 },
  'EAST': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EBSC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'ECAP': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EDFM': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EEII': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'EFIC': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EFID': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'EFIH': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'EGAL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EGAS': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'EGBE': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'EGCH': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'EGREF': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'EGS30AJ1C016-EGP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'EGS48271C018-EGP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'EGS659O1C015': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'EGSA': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EGTS': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'EHDR': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'EITP': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'ELEC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 4.0 },
  'ELKA': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ELNA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 4.0 },
  'ELSH': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ELWA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EMFD': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ENGC': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'EOSB': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'EPCO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EPPK': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'ETEL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'ETRS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'EXPA': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'FAIT': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'FAITA': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'FCMD': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'FIRE': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'FNAR': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'FTNS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'FWRY': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'GBCO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'GDWA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'GGCC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'GIHD': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'GMCI': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'GPIM': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'GPPL': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'GRCA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 20.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'GSSC': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'GTEX': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'GTHE': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'GTWL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'HDBK': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'HELI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'HRHO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 0.0 },
  'IBCT': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ICFC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ICID': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'ICLE': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'IDRE': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 0.0 },
  'IEEC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'IFAP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'INEG': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'INFI': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'IRAX': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'IRON': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'ISMA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'ISMQ': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ISPH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'JUFO': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'KABO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'KRDI': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'KWIN': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'KZPC': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 18.0, aymMultiplier: 8.0, atrMultiplier: 4.0 },
  'LCSW': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 6.0 },
  'LKGP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'LUTS': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MAAL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'MASR': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'MBEG': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MBSC': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MCQE': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'MCRO': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'MEGM': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'MENA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MEPA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'MFPC': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 4.0 },
  'MFSC': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MHOT': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'MICH': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MILS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 9.0, atrMultiplier: 4.0 },
  'MIPH': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 6.0, atrMultiplier: 3.0 },
  'MISR': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'MMAT': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'MOED': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'MOIL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'MOIN': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'MOSC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'MPCI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'MPCO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'MPRC': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'MTIE': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'NAHO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 4.0 },
  'NARE': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'NBKE': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'NCCW': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'NCGC': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 4.0 },
  'NDRL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'NEDA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 0.0 },
  'NHPS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'NINH': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 20.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'NIPH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'OBRI': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'OCDI': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'OCPH': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 4.0 },
  'ODIN': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'OFH': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 14.0, aymMultiplier: 6.0, atrMultiplier: 6.0 },
  'OIH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'OLFI': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'ORAS': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 20.0, aymMultiplier: 8.0, atrMultiplier: 4.0 },
  'ORHD': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 0.0 },
  'ORWE': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'PACH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'PHAR': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'PHDC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'PHGC': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'PHTV': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 4.0 },
  'POUL': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'PRCL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'PRDC': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'PRMH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'QNBE': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'RACC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'RAKT': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'RAYA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 9.0, atrMultiplier: 6.0 },
  'RKAZ': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 6.0, atrMultiplier: 6.0 },
  'RMDA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 6.0, atrMultiplier: 4.0 },
  'ROTO': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 0.0 },
  'RREI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'RTVC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 3.0 },
  'RUBX': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 16.0, aymMultiplier: 9.0, atrMultiplier: 3.0 },
  'SAIB': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SAUD': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'SCEM': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'SCFM': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'SCTS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'SDTI': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SEIG': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'SEIGA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SIPC': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SKPC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'SMFR': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'SMPP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'SNFC': { buyZoneCrossUp: 12.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SNFI': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SPHT': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 85.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SPIN': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'SPMD': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'SUCE': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 6.0, atrMultiplier: 6.0 },
  'SUGR': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'SVCE': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 3.0 },
  'SWDY': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'TALM': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'TANM': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
  'TAQA': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'TMGH': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'TORA': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'TRTO': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'TYCN': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'UEFM': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'UEGC': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'UNIP': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 20.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 20.0, aymMultiplier: 0.0, atrMultiplier: 0.0 },
  'UNIT': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 8.0, atrMultiplier: 6.0 },
  'UPMS': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 6.0, atrMultiplier: 3.0 },
  'UTOP': { buyZoneCrossUp: 16.0, buyPsiUpThreshold: 10.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 9.0, atrMultiplier: 4.0 },
  'VERT': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 16.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'VLMR': { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 5.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'VLMRA': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'WATP': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 10.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  'WCDF': { buyZoneCrossUp: 5.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 80.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'WKOL': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 95.0, sellPsiDownThreshold: 14.0, aymMultiplier: 0.0, atrMultiplier: 4.0 },
  'ZEOT': { buyZoneCrossUp: 20.0, buyPsiUpThreshold: 15.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 16.0, aymMultiplier: 8.0, atrMultiplier: 0.0 },
  'ZMID': { buyZoneCrossUp: 0.0, buyPsiUpThreshold: 2.0, sellZoneCrossUnder: 100.0, sellPsiDownThreshold: 18.0, aymMultiplier: 0.0, atrMultiplier: 6.0 },
  DEFAULT: { buyZoneCrossUp: 10.0, buyPsiUpThreshold: 0.0, sellZoneCrossUnder: 90.0, sellPsiDownThreshold: 10.0, aymMultiplier: 8.0, atrMultiplier: 3.0 },
};

export interface PsiV2Signal {
  date: string;
  signal: 'BUY' | 'SELL' | 'HOLD' | 'FLAT';
  price: number;
  entryPrice?: number;
  entryDate?: string;
  exitReason?: string;
  entryReason?: string;
  reasoning?: string;
  masterIndex: number;
  psiZone: number;
  psiUp: number;
  psiDown: number;
  regimeDirection: 'up' | 'down';
  medianDailyMove?: number;
}

export interface PsiV2StrategyResult {
  signals: PsiV2Signal[];
  latestSignal: PsiV2Signal;
  latestMasterIndex: number;
  trades: StrategyTrade[];
  equityCurve: EquityPoint[];
  stats: StrategyKeyStats;
  metrics: {
    sysRoi: number;
    buyHoldRoi: number;
    roiMargin: number;
    trades: number;
    winRate: number;
    maxDrawdown: number;
    maxAdverseExcursion: number;
    avgAdverseExcursion: number;
    avgFavorableExcursion: number;
    annualCagr: number;
    avgReturnPerTrade: number;
    avgBarsPerTrade: number;
    currentBalance: number;
    psiZone: number;
    psiUp: number;
    psiDown: number;
    regimeDirection: 'up' | 'down';
    latestMasterIndex: number;
    medianDailyMove: number;
  };
}

export function formatPsiV2MetricsForApi(metrics: PsiV2StrategyResult['metrics']): Record<string, string> {
  return {
    "Sys ROI": metrics.sysRoi.toFixed(2),
    "B&H ROI": metrics.buyHoldRoi.toFixed(2),
    "ROI Margin": metrics.roiMargin.toFixed(2),
    "# of Trades": String(metrics.trades),
    "Win Rate": metrics.winRate.toFixed(2),
    "Max Drawdown": metrics.maxDrawdown.toFixed(2),
    "Annual CAGR": metrics.annualCagr.toFixed(2),
    "Avg. Return/Trade": metrics.avgReturnPerTrade.toFixed(2),
    "Avg Bars/Trade": metrics.avgBarsPerTrade.toFixed(1),
    "Max Adverse Excursion": metrics.maxAdverseExcursion.toFixed(2),
    "Avg. Adverse Excursion": metrics.avgAdverseExcursion.toFixed(2),
    "Avg. Favorable Excursion": metrics.avgFavorableExcursion.toFixed(2),
    "PSI Zone": metrics.psiZone.toFixed(2),
    "PSI UP": metrics.psiUp.toFixed(2),
    "PSI DOWN": metrics.psiDown.toFixed(2),
    "Regime": metrics.regimeDirection.toUpperCase(),
    "Master Index": metrics.latestMasterIndex.toFixed(2),
    "MDM": `${metrics.medianDailyMove.toFixed(2)}%`,
  };
}

const DEFAULT_INITIAL_CAPITAL = 100_000;
const COMMISSION_RATE = 0.0015; // 0.15% EGX standard
const SLIPPAGE_RATE = 0.001;   // 0.10% slippage

function emptyStats(initialCapital: number, startDate: string, endDate: string): StrategyKeyStats {
  return {
    initialCapital,
    finalEquity: initialCapital,
    netProfit: 0,
    netProfitPct: 0,
    buyHoldReturn: 0,
    buyHoldReturnPct: 0,
    alphaMargin: 0,
    maxDrawdown: 0,
    maxDrawdownAmount: 0,
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    profitFactor: 0,
    grossProfit: 0,
    grossLoss: 0,
    avgTradePnl: 0,
    avgTradeReturnPct: 0,
    avgWin: 0,
    avgLoss: 0,
    winLossRatio: 0,
    maxConsecutiveWins: 0,
    maxConsecutiveLosses: 0,
    avgBarsHeld: 0,
    annualCagr: 0,
    sharpeRatio: 0,
    startDate,
    endDate,
  };
}

export function runPsiV2Strategy(
  bars: PriceBar[],
  overrides?: PsiV2StrategyOverrides
): PsiV2StrategyResult {
  const initialCapital = overrides?.initialCapital || DEFAULT_INITIAL_CAPITAL;
  const startDate = overrides?.startDate || (bars.length > 0 ? bars[0].date : '2025-01-01');
  const endDate = overrides?.endDate;

  if (bars.length === 0) {
    const empty = emptyStats(initialCapital, startDate, startDate);
    const dummySignal: PsiV2Signal = {
      date: startDate,
      signal: 'FLAT',
      price: 0,
      masterIndex: 50,
      psiZone: 50,
      psiUp: 0,
      psiDown: 0,
      regimeDirection: 'up',
      medianDailyMove: 2.0,
    };
    return {
      signals: [],
      latestSignal: dummySignal,
      latestMasterIndex: 50,
      trades: [],
      equityCurve: [],
      stats: empty,
      metrics: {
        sysRoi: 0,
        buyHoldRoi: 0,
        roiMargin: 0,
        trades: 0,
        winRate: 0,
        maxDrawdown: 0,
        maxAdverseExcursion: 0,
        avgAdverseExcursion: 0,
        avgFavorableExcursion: 0,
        annualCagr: 0,
        avgReturnPerTrade: 0,
        avgBarsPerTrade: 0,
        currentBalance: initialCapital,
        psiZone: 50,
        psiUp: 0,
        psiDown: 0,
        regimeDirection: 'up',
        latestMasterIndex: 50,
        medianDailyMove: 2.0,
      },
    };
  }

  // 1. Compute Continuous 3-PSI Indices across complete history
  const indices = computePsiV2Indices(bars);

  // 2. Identify Simulation Window Start Index
  let startIdx = 0;
  for (let i = 0; i < bars.length; i++) {
    if (bars[i].date >= startDate) {
      startIdx = i;
      break;
    }
  }

  // 3. Discrete State Machine Simulation (FLAT vs LONG)
  let isLong = false;
  let activeShares = 0;
  let entryPrice = 0;
  let entryDate = '';
  let entryReason = '';
  let highestInTrade = 0;
  let lowestInTrade = 0;
  let barsHeld = 0;
  let currentBalance = initialCapital;

  const trades: StrategyTrade[] = [];
  const signals: PsiV2Signal[] = [];
  const equityCurve: EquityPoint[] = [];

  let peakEquity = initialCapital;
  let maxDrawdownAmount = 0;
  let maxDrawdownPct = 0;

  // Buy & Hold baseline tracking
  const firstBarClose = bars[startIdx]?.close || bars[0].close;
  const buyHoldShares = Math.floor(initialCapital / firstBarClose);
  const buyHoldCash = initialCapital - buyHoldShares * firstBarClose;

  // 3. Resolve Ticker-Specific or Overridden Threshold Levels
  const tickerKey = (overrides?.ticker || 'DEFAULT').toUpperCase();
  const is1H = overrides?.timeframe === '1H' || overrides?.timeframe === '60' || overrides?.timeframe === '1h';
  const defaultLevels = (is1H && (optimizedIntraday1hParams as Record<string, any>)[tickerKey])
    ? (optimizedIntraday1hParams as Record<string, any>)[tickerKey]
    : (TICKER_PSI_LEVEL_CONFIGS[tickerKey] || TICKER_PSI_LEVEL_CONFIGS['DEFAULT']);
  const buyZoneLevel = overrides?.buyZoneCrossUp ?? defaultLevels.buyZoneCrossUp;
  const buyUpLevel = overrides?.buyPsiUpThreshold ?? defaultLevels.buyPsiUpThreshold;
  const sellZoneLevel = overrides?.sellZoneCrossUnder ?? defaultLevels.sellZoneCrossUnder;
  const sellDownLevel = overrides?.sellPsiDownThreshold ?? defaultLevels.sellPsiDownThreshold;
  const aymMult = overrides?.aymMultiplier ?? defaultLevels.aymMultiplier ?? 0.0;
  const atrMult = overrides?.atrMultiplier ?? defaultLevels.atrMultiplier ?? 0.0;

  for (let i = startIdx; i < bars.length; i++) {
    const bar = bars[i];
    if (endDate && bar.date > endDate) break;

    const currIdx = indices[i];
    const prevIdx = i > 0 ? indices[i - 1] : currIdx;

    const closePrice = bar.close;
    const highPrice = bar.high;
    const lowPrice = bar.low;

    // --- Check Trading Signals ---
    let signalType: 'BUY' | 'SELL' | 'HOLD' | 'FLAT' = isLong ? 'HOLD' : 'FLAT';
    let triggeredExitReason = '';
    let triggeredEntryReason = '';

    if (!isLong) {
      // Long Entry Condition (BUY):
      // (PSI_ZONE crosses > buyZoneLevel) OR (PSI_UP crosses > buyUpLevel)
      const zoneCrossUp = prevIdx.psiZone <= buyZoneLevel && currIdx.psiZone > buyZoneLevel;
      const upCross = prevIdx.psiUp <= buyUpLevel && currIdx.psiUp > buyUpLevel;

      if (zoneCrossUp || upCross) {
        signalType = 'BUY';
        triggeredEntryReason = zoneCrossUp
          ? `PSI_ZONE Cross Up ${buyZoneLevel} (Exiting Extreme Oversold)`
          : `PSI_UP Cross > ${buyUpLevel} (Bullish Swing Inception)`;

        const effectiveEntryPrice = closePrice * (1.0 + SLIPPAGE_RATE);
        const costPerShare = effectiveEntryPrice * (1.0 + COMMISSION_RATE);
        const shares = Math.floor(currentBalance / costPerShare);

        if (shares > 0) {
          isLong = true;
          activeShares = shares;
          entryPrice = effectiveEntryPrice;
          entryDate = bar.date;
          entryReason = triggeredEntryReason;
          highestInTrade = highPrice;
          lowestInTrade = lowPrice;
          barsHeld = 0;
          currentBalance -= shares * costPerShare;
        }
      }
    } else {
      barsHeld++;
      if (highPrice > highestInTrade) highestInTrade = highPrice;
      if (lowPrice < lowestInTrade) lowestInTrade = lowPrice;

      // Long Exit Condition (SELL / FLAT):
      // (PSI_ZONE crosses < sellZoneLevel) OR (PSI_DOWN crosses > sellDownLevel)
      // AND Price Excursion Gate (if aymMult > 0 or atrMult > 0)
      const zoneCrossUnder = prevIdx.psiZone >= sellZoneLevel && currIdx.psiZone < sellZoneLevel;
      const downCross = prevIdx.psiDown <= sellDownLevel && currIdx.psiDown > sellDownLevel;
      const baseTechnicalExit = zoneCrossUnder || downCross;

      let priceGateMet = true;
      if (aymMult > 0 || atrMult > 0) {
        const aymThreshold = aymMult > 0 ? entryPrice * (1.0 + (currIdx.aym ?? 0.015) * aymMult) : Number.POSITIVE_INFINITY;
        const atrThreshold = atrMult > 0 ? entryPrice * (1.0 + (currIdx.atrPct ?? 0.02) * atrMult) : Number.POSITIVE_INFINITY;
        priceGateMet = (closePrice >= aymThreshold) || (closePrice >= atrThreshold);
      }

      const isLastBar = i === bars.length - 1 || (Boolean(endDate) && bars[i + 1]?.date > (endDate as string));
      const profitProtect = overrides?.profitProtect !== false;
      const isProfit = closePrice > entryPrice;

      if (((baseTechnicalExit && priceGateMet && (!profitProtect || isProfit)) || isLastBar)) {
        signalType = 'SELL';
        triggeredExitReason = zoneCrossUnder
          ? `PSI_ZONE Cross Under ${sellZoneLevel} (Overbought Deceleration)`
          : downCross
          ? `PSI_DOWN Cross > ${sellDownLevel} (Bearish Swing Inception)`
          : 'End of Backtest Horizon';
        if (aymMult > 0 || atrMult > 0) {
          triggeredExitReason += ` [Excursion Target Met]`;
        }

        const effectiveExitPrice = closePrice * (1.0 - SLIPPAGE_RATE);
        const grossProceeds = activeShares * effectiveExitPrice;
        const exitCommission = grossProceeds * COMMISSION_RATE;
        const netProceeds = grossProceeds - exitCommission;

        const totalCost = activeShares * entryPrice * (1.0 + COMMISSION_RATE);
        const netPnl = netProceeds - totalCost;
        const returnPct = ((netProceeds - totalCost) / totalCost) * 100.0;

        currentBalance += netProceeds;

        const maxFavorableExcursion = ((highestInTrade - entryPrice) / entryPrice) * 100.0;
        const maxAdverseExcursion = ((lowestInTrade - entryPrice) / entryPrice) * 100.0;

        trades.push({
          id: trades.length + 1,
          tradeNumber: trades.length + 1,
          type: 'long',
          entryDate,
          entryPrice: Number(entryPrice.toFixed(4)),
          exitDate: bar.date,
          exitPrice: Number(effectiveExitPrice.toFixed(4)),
          shares: activeShares,
          positionValue: Number((activeShares * entryPrice).toFixed(2)),
          netPnl: Number(netPnl.toFixed(2)),
          returnPct: Number(returnPct.toFixed(2)),
          exitReason: triggeredExitReason,
          barsHeld,
          cumulativeEquity: Number(currentBalance.toFixed(2)),
          favorableExcursion: Number(maxFavorableExcursion.toFixed(2)),
          adverseExcursion: Number(maxAdverseExcursion.toFixed(2)),
        });

        isLong = false;
        activeShares = 0;
        entryPrice = 0;
        entryDate = '';
        barsHeld = 0;
      }
    }

    // Calculate Mark-to-Market Equity
    const currentPositionValue = isLong ? activeShares * closePrice * (1.0 - COMMISSION_RATE - SLIPPAGE_RATE) : 0;
    const totalEquity = currentBalance + currentPositionValue;
    const buyHoldCurrent = buyHoldCash + buyHoldShares * closePrice;

    if (totalEquity > peakEquity) peakEquity = totalEquity;
    const currentDdAmount = peakEquity - totalEquity;
    const currentDdPct = peakEquity > 0 ? (currentDdAmount / peakEquity) * 100 : 0;

    if (currentDdAmount > maxDrawdownAmount) maxDrawdownAmount = currentDdAmount;
    if (currentDdPct > maxDrawdownPct) maxDrawdownPct = currentDdPct;

    const lastTrade = trades[trades.length - 1];
    const tradeClosedOnThisBar = !isLong && lastTrade && lastTrade.exitDate === bar.date;

    equityCurve.push({
      date: bar.date,
      equity: Number(totalEquity.toFixed(2)),
      buyHoldEquity: Number(buyHoldCurrent.toFixed(2)),
      drawdown: Number(currentDdPct.toFixed(2)),
      tradePnl: tradeClosedOnThisBar ? lastTrade.netPnl : undefined,
      tradeReturnPct: tradeClosedOnThisBar ? lastTrade.returnPct : undefined,
    });

    signals.push({
      date: bar.date,
      signal: signalType,
      price: closePrice,
      entryPrice: isLong ? entryPrice : undefined,
      entryDate: isLong ? entryDate : undefined,
      entryReason: signalType === 'BUY' ? triggeredEntryReason : isLong ? entryReason : undefined,
      exitReason: signalType === 'SELL' ? triggeredExitReason : undefined,
      reasoning: signalType === 'BUY' ? triggeredEntryReason : signalType === 'SELL' ? triggeredExitReason : undefined,
      masterIndex: currIdx.psiZone,
      psiZone: currIdx.psiZone,
      psiUp: currIdx.psiUp,
      psiDown: currIdx.psiDown,
      regimeDirection: currIdx.regimeDirection,
      medianDailyMove: 2.0,
    });
  }

  // 4. Calculate Key Strategy Performance Statistics
  const lastBar = bars[bars.length - 1];
  const finalEquity = equityCurve.length > 0 ? equityCurve[equityCurve.length - 1].equity : initialCapital;
  const netProfit = finalEquity - initialCapital;
  const netProfitPct = (netProfit / initialCapital) * 100.0;

  const lastBarClose = lastBar?.close || firstBarClose;
  const buyHoldFinal = buyHoldCash + buyHoldShares * lastBarClose;
  const buyHoldReturn = buyHoldFinal - initialCapital;
  const buyHoldReturnPct = (buyHoldReturn / initialCapital) * 100.0;
  const alphaMargin = netProfitPct - buyHoldReturnPct;

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t) => t.netPnl > 0).length;
  const losingTrades = trades.filter((t) => t.netPnl <= 0).length;
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100.0 : 0;

  const grossProfit = trades.filter((t) => t.netPnl > 0).reduce((sum, t) => sum + t.netPnl, 0);
  const grossLoss = Math.abs(trades.filter((t) => t.netPnl < 0).reduce((sum, t) => sum + t.netPnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99.9 : 0;

  const avgTradePnl = totalTrades > 0 ? netProfit / totalTrades : 0;
  const avgTradeReturnPct = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.returnPct, 0) / totalTrades : 0;
  const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
  const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
  const winLossRatio = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.9 : 0;

  let maxConsecutiveWins = 0;
  let maxConsecutiveLosses = 0;
  let currWins = 0;
  let currLosses = 0;
  for (const t of trades) {
    if (t.netPnl > 0) {
      currWins++;
      currLosses = 0;
      if (currWins > maxConsecutiveWins) maxConsecutiveWins = currWins;
    } else {
      currLosses++;
      currWins = 0;
      if (currLosses > maxConsecutiveLosses) maxConsecutiveLosses = currLosses;
    }
  }

  const avgBarsHeld = totalTrades > 0 ? trades.reduce((sum, t) => sum + t.barsHeld, 0) / totalTrades : 0;

  // Annualized CAGR & Sharpe Ratio
  const totalDays = bars.length > 1
    ? Math.max(1, (new Date(lastBar.date).getTime() - new Date(bars[startIdx].date).getTime()) / (1000 * 3600 * 24))
    : 1;
  const years = totalDays / 365.25;
  const annualCagr = years > 0 && finalEquity > 0 ? (Math.pow(finalEquity / initialCapital, 1 / years) - 1) * 100 : 0;

  // Calculate daily Sharpe ratio (risk-free rate = 0)
  const dailyReturns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const curr = equityCurve[i].equity;
    if (prev > 0) dailyReturns.push((curr - prev) / prev);
  }
  const meanReturn = dailyReturns.length > 0 ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const variance = dailyReturns.length > 0
    ? dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / dailyReturns.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const sharpeRatio = stdDev > 0 ? (meanReturn / stdDev) * Math.sqrt(252) : 0;

  const stats: StrategyKeyStats = {
    initialCapital,
    finalEquity: Number(finalEquity.toFixed(2)),
    netProfit: Number(netProfit.toFixed(2)),
    netProfitPct: Number(netProfitPct.toFixed(2)),
    buyHoldReturn: Number(buyHoldReturn.toFixed(2)),
    buyHoldReturnPct: Number(buyHoldReturnPct.toFixed(2)),
    alphaMargin: Number(alphaMargin.toFixed(2)),
    maxDrawdown: Number(maxDrawdownPct.toFixed(2)),
    maxDrawdownAmount: Number(maxDrawdownAmount.toFixed(2)),
    totalTrades,
    winningTrades,
    losingTrades,
    winRate: Number(winRate.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    grossProfit: Number(grossProfit.toFixed(2)),
    grossLoss: Number(grossLoss.toFixed(2)),
    avgTradePnl: Number(avgTradePnl.toFixed(2)),
    avgTradeReturnPct: Number(avgTradeReturnPct.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    winLossRatio: Number(winLossRatio.toFixed(2)),
    maxConsecutiveWins,
    maxConsecutiveLosses,
    avgBarsHeld: Number(avgBarsHeld.toFixed(1)),
    annualCagr: Number(annualCagr.toFixed(2)),
    sharpeRatio: Number(sharpeRatio.toFixed(2)),
    startDate: bars[startIdx].date,
    endDate: lastBar.date,
  };

  const latestIndex = indices[indices.length - 1];
  const latestSig = signals[signals.length - 1] || {
    date: lastBar.date,
    signal: 'FLAT',
    price: lastBar.close,
    masterIndex: latestIndex.psiZone,
    psiZone: latestIndex.psiZone,
    psiUp: latestIndex.psiUp,
    psiDown: latestIndex.psiDown,
    regimeDirection: latestIndex.regimeDirection,
    medianDailyMove: 2.0,
  };

  const avgAdverseExcursion = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.adverseExcursion || 0), 0) / trades.length
    : 0;
  const maxAdverseExcursion = trades.length > 0
    ? Math.min(...trades.map((t) => t.adverseExcursion || 0))
    : 0;
  const avgFavorableExcursion = trades.length > 0
    ? trades.reduce((sum, t) => sum + (t.favorableExcursion || 0), 0) / trades.length
    : 0;

  return {
    signals,
    latestSignal: latestSig,
    latestMasterIndex: latestIndex.psiZone,
    trades,
    equityCurve,
    stats,
    metrics: {
      sysRoi: netProfitPct,
      buyHoldRoi: buyHoldReturnPct,
      roiMargin: alphaMargin,
      trades: totalTrades,
      winRate: stats.winRate,
      maxDrawdown: maxDrawdownPct,
      maxAdverseExcursion,
      avgAdverseExcursion,
      avgFavorableExcursion,
      annualCagr,
      avgReturnPerTrade: avgTradeReturnPct,
      avgBarsPerTrade: avgBarsHeld,
      currentBalance: finalEquity,
      psiZone: latestIndex.psiZone,
      psiUp: latestIndex.psiUp,
      psiDown: latestIndex.psiDown,
      regimeDirection: latestIndex.regimeDirection,
      latestMasterIndex: latestIndex.psiZone,
      medianDailyMove: 2.0,
    },
  };
}
