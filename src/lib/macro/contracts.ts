export const MACRO_SERIES_CODES = [
  'EG_CPI_HEADLINE_INDEX',
  'EG_CPI_HEADLINE_YOY',
  'EG_CPI_HEADLINE_MOM',
  'EG_CPI_CORE_YOY',
  'US_CPI_INDEX',
  'US_CPI_YOY',
  'CBE_OVERNIGHT_DEPOSIT_RATE',
  'CBE_OVERNIGHT_LENDING_RATE',
  'CBE_MAIN_OPERATION_RATE',
  'CBE_DISCOUNT_RATE',
  'EG_NET_INTERNATIONAL_RESERVES_USD_MN',
  'EG_TBILL_3M_YIELD',
  'EG_TBILL_6M_YIELD',
  'EG_TBILL_9M_YIELD',
  'EG_TBILL_12M_YIELD',
] as const;

export type MacroSeriesCode = (typeof MACRO_SERIES_CODES)[number];

export interface MacroObservationCandidate {
  seriesCode: MacroSeriesCode;
  observationDate: string;
  value: number;
  unit: string;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  sourceRevision?: string;
  metadata?: Record<string, unknown>;
}

export interface StoredMacroObservation extends Omit<MacroObservationCandidate, 'sourceRevision'> {
  sourceRevision: string;
  isLatest: boolean;
  retrievedAt: string;
}

export interface MacroObservationStore {
  transaction<T>(operation: (store: MacroObservationStore) => Promise<T>): Promise<T>;
  findRevision(
    seriesCode: MacroSeriesCode,
    observationDate: string,
    sourceRevision: string,
  ): Promise<StoredMacroObservation | null>;
  findLatest(
    seriesCode: MacroSeriesCode,
    observationDate: string,
  ): Promise<StoredMacroObservation | null>;
  demoteLatest(seriesCode: MacroSeriesCode, observationDate: string): Promise<void>;
  insert(observation: StoredMacroObservation): Promise<void>;
  touchRevision(
    seriesCode: MacroSeriesCode,
    observationDate: string,
    sourceRevision: string,
    retrievedAt: string,
  ): Promise<void>;
}

export interface MacroPersistenceReport {
  inserted: number;
  revised: number;
  unchanged: number;
  rejected: number;
}
