export interface StrategyUniverseCompany {
  readonly symbol: string;
  readonly name: string;
  readonly group: string;
  readonly logoUrl: string | null;
}

export interface StrategyTickerRecord {
  readonly symbol: string;
  readonly exchange: string | null;
  readonly sector: string | null;
  readonly industryGroup: string | null;
  readonly companyName: string | null;
  readonly logoUrl: string | null;
}

export function buildStrategyCompanyUniverse(rows: readonly StrategyTickerRecord[]): StrategyUniverseCompany[] {
  const seen = new Set<string>();
  const companies: StrategyUniverseCompany[] = [];
  for (const row of rows) {
    const symbol = normalizeLiveTicker(row.symbol);
    const sector = row.sector?.trim().toLowerCase() ?? '';
    if (!symbol || row.exchange?.toUpperCase() !== 'EGX' || seen.has(symbol)
      || sector === 'indices' || sector === 'macro' || sector.includes('fund')) continue;
    seen.add(symbol);
    companies.push({
      symbol,
      name: row.companyName?.trim() || symbol,
      group: row.industryGroup?.trim() || row.sector?.trim() || 'Other companies',
      logoUrl: row.logoUrl,
    });
  }
  return companies.sort((left, right) => left.symbol.localeCompare(right.symbol));
}
import { normalizeLiveTicker } from '../../../../lib/indicators/server/types';
