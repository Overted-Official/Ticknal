import type { MacroObservationCandidate } from '../contracts';

const BLS_CPI_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/CUUR0000SA0';

interface BlsDatum { year?: string; period?: string; value?: string }
interface BlsResponse { Results?: { series?: Array<{ data?: BlsDatum[] }> } }

function monthDate(year: string, month: string): string {
  return `${year}-${month}-01`;
}

function estimatedPublication(year: string, month: string, retrievedAt: string): string {
  const estimate = new Date(Date.UTC(Number(year), Number(month), 15)).toISOString();
  return estimate < retrievedAt ? estimate : retrievedAt;
}

export function parseBlsCpiResponse(payload: BlsResponse, publishedAt: string): MacroObservationCandidate[] {
  const sourceName = 'U.S. Bureau of Labor Statistics';
  const values = new Map<string, number>();
  for (const item of payload.Results?.series?.[0]?.data ?? []) {
    if (!item.year || !item.period?.match(/^M\d{2}$/) || item.period === 'M13') continue;
    const value = Number(item.value);
    if (Number.isFinite(value) && value > 0) values.set(`${item.year}-${item.period.slice(1)}`, value);
  }
  const observations: MacroObservationCandidate[] = [];
  for (const [yearMonth, value] of [...values].sort(([left], [right]) => left.localeCompare(right))) {
    const [year, month] = yearMonth.split('-') as [string, string];
    const observationPublishedAt = estimatedPublication(year, month, publishedAt);
    observations.push({
      seriesCode: 'US_CPI_INDEX', observationDate: monthDate(year, month), value, unit: 'index',
      publishedAt: observationPublishedAt, sourceName, sourceUrl: BLS_CPI_URL,
      metadata: { publicationTimestamp: 'estimated as the 15th of the following month' },
    });
    const previous = values.get(`${Number(year) - 1}-${month}`);
    if (previous !== undefined && previous > 0) observations.push({
      seriesCode: 'US_CPI_YOY', observationDate: monthDate(year, month),
      value: (value / previous - 1) * 100, unit: 'percent', publishedAt: observationPublishedAt, sourceName, sourceUrl: BLS_CPI_URL,
      metadata: { publicationTimestamp: 'estimated as the 15th of the following month' },
    });
  }
  return observations;
}

export async function fetchBlsCpiObservations(now = new Date()): Promise<MacroObservationCandidate[]> {
  const response = await fetch(BLS_CPI_URL, {
    headers: { Accept: 'application/json', 'User-Agent': 'ticknal/3.0 macro-ingestion' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`BLS CPI request failed with HTTP ${response.status}`);
  return parseBlsCpiResponse(await response.json() as BlsResponse, now.toISOString());
}
