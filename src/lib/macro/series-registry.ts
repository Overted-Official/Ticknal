import type { MacroSeriesCode } from './contracts';

export interface MacroSeriesDefinition {
  code: MacroSeriesCode;
  unit: 'index' | 'percent' | 'usd_millions';
  frequency: 'monthly' | 'event';
  source: 'CBE' | 'BLS';
}

const definitions: readonly MacroSeriesDefinition[] = [
  { code: 'EG_CPI_HEADLINE_INDEX', unit: 'index', frequency: 'monthly', source: 'CBE' },
  { code: 'EG_CPI_HEADLINE_YOY', unit: 'percent', frequency: 'monthly', source: 'CBE' },
  { code: 'EG_CPI_HEADLINE_MOM', unit: 'percent', frequency: 'monthly', source: 'CBE' },
  { code: 'EG_CPI_CORE_YOY', unit: 'percent', frequency: 'monthly', source: 'CBE' },
  { code: 'US_CPI_INDEX', unit: 'index', frequency: 'monthly', source: 'BLS' },
  { code: 'US_CPI_YOY', unit: 'percent', frequency: 'monthly', source: 'BLS' },
  { code: 'CBE_OVERNIGHT_DEPOSIT_RATE', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'CBE_OVERNIGHT_LENDING_RATE', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'CBE_MAIN_OPERATION_RATE', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'CBE_DISCOUNT_RATE', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'EG_NET_INTERNATIONAL_RESERVES_USD_MN', unit: 'usd_millions', frequency: 'monthly', source: 'CBE' },
  { code: 'EG_TBILL_3M_YIELD', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'EG_TBILL_6M_YIELD', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'EG_TBILL_9M_YIELD', unit: 'percent', frequency: 'event', source: 'CBE' },
  { code: 'EG_TBILL_12M_YIELD', unit: 'percent', frequency: 'event', source: 'CBE' },
];

export const MACRO_SERIES_REGISTRY = new Map(definitions.map((definition) => [definition.code, definition]));

export function getMacroSeriesDefinition(code: string): MacroSeriesDefinition | undefined {
  return MACRO_SERIES_REGISTRY.get(code as MacroSeriesCode);
}
