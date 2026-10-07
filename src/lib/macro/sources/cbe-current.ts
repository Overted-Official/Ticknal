import type { MacroObservationCandidate, MacroSeriesCode } from '../contracts';

const CBE_ROOT = 'https://www.cbe.org.eg';
export const CBE_INFLATION_URL = `${CBE_ROOT}/en/economic-research/statistics/inflation-rates`;
export const CBE_POLICY_URL = `${CBE_ROOT}/en/`;
export const CBE_TBILL_URL = `${CBE_ROOT}/en/economic-research/statistics/egp-t-bills-secondary-market`;
export const CBE_RESERVES_URL = `${CBE_ROOT}/en/`;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/127.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

const MONTHS: Record<string, string> = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

function monthDate(text: string): string | null {
  const match = text.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{4})/i);
  return match ? `${match[2]}-${MONTHS[match[1]!.slice(0, 3).toLowerCase()]}-01` : null;
}

function estimatedPublication(observationDate: string, retrievedAt: string): string {
  const [year, month] = observationDate.split('-').map(Number);
  const estimate = new Date(Date.UTC(year!, month!, 15)).toISOString();
  return estimate < retrievedAt ? estimate : retrievedAt;
}

function strip(value: string): string {
  return value.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function percentAfterLabel(html: string, label: RegExp): number | null {
  const position = html.search(label);
  if (position < 0) return null;
  const match = strip(html.slice(position, position + 500)).match(/(-?\d+(?:\.\d+)?)\s*%/);
  return match ? Number(match[1]) : null;
}

function candidate(seriesCode: MacroSeriesCode, observationDate: string, value: number, unit: 'percent' | 'usd_millions', publishedAt: string, sourceUrl: string): MacroObservationCandidate {
  return { seriesCode, observationDate, value, unit, publishedAt, sourceName: 'Central Bank of Egypt', sourceUrl };
}

export function parseCbeInflationHtml(html: string, publishedAt: string): MacroObservationCandidate[] {
  const observationDate = monthDate(html.match(/Inflation for Last Month:\s*([^<]+)/i)?.[1] ?? '') ?? publishedAt.slice(0, 10);
  const values = [...html.matchAll(/<td[^>]*class=["'][^"']*table-cell[^"']*["'][^>]*>([\s\S]*?)<\/td>/gi)]
    .map((match) => Number(strip(match[1]!).replace('%', '')));
  const result: MacroObservationCandidate[] = [];
  if (Number.isFinite(values[0])) result.push(candidate('EG_CPI_HEADLINE_MOM', observationDate, values[0]!, 'percent', publishedAt, CBE_INFLATION_URL));
  if (Number.isFinite(values[2])) result.push(candidate('EG_CPI_HEADLINE_YOY', observationDate, values[2]!, 'percent', publishedAt, CBE_INFLATION_URL));
  if (Number.isFinite(values[3])) result.push(candidate('EG_CPI_CORE_YOY', observationDate, values[3]!, 'percent', publishedAt, CBE_INFLATION_URL));
  return result;
}

export function parseCbeInflationHistoryHtml(
  html: string,
  frequency: 'mm' | 'yy',
  retrievedAt: string,
): MacroObservationCandidate[] {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  return rows.flatMap((row): MacroObservationCandidate[] => {
    const cells = [...row[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => strip(cell[1]!));
    const observationDate = monthDate(cells[0] ?? '');
    const headline = Number((cells[1] ?? '').replace('%', ''));
    const core = Number((cells[2] ?? '').replace('%', ''));
    if (!observationDate || !Number.isFinite(headline)) return [];
    const publishedAt = estimatedPublication(observationDate, retrievedAt);
    const metadata = { publicationTimestamp: 'estimated as the 15th of the following month' };
    if (frequency === 'mm') return [{ ...candidate('EG_CPI_HEADLINE_MOM', observationDate, headline, 'percent', publishedAt, CBE_INFLATION_URL), metadata }];
    const result = [{ ...candidate('EG_CPI_HEADLINE_YOY', observationDate, headline, 'percent', publishedAt, CBE_INFLATION_URL), metadata }];
    if (Number.isFinite(core)) result.push({ ...candidate('EG_CPI_CORE_YOY', observationDate, core, 'percent', publishedAt, CBE_INFLATION_URL), metadata });
    return result;
  });
}

export function parseCbePolicyRateHtml(html: string, publishedAt: string): MacroObservationCandidate[] {
  const effectiveText = strip(html).match(/Effective(?:\s+from|\s+date)?\s*:?\s*(\d{1,2}\s+[A-Za-z]+\s+\d{4})/i)?.[1];
  const observationDate = effectiveText && !Number.isNaN(Date.parse(effectiveText)) ? new Date(`${effectiveText} UTC`).toISOString().slice(0, 10) : publishedAt.slice(0, 10);
  const mappings: Array<[MacroSeriesCode, RegExp]> = [
    ['CBE_OVERNIGHT_DEPOSIT_RATE', /Overnight\s+Deposit\s+Rate/i],
    ['CBE_OVERNIGHT_LENDING_RATE', /Overnight\s+Lending\s+Rate/i],
    ['CBE_MAIN_OPERATION_RATE', /Main\s+Operation(?:\s+Rate)?/i],
    ['CBE_DISCOUNT_RATE', /Discount\s+Rate/i],
  ];
  return mappings.flatMap(([code, label]) => {
    const value = percentAfterLabel(html, label);
    return value === null ? [] : [candidate(code, observationDate, value, 'percent', publishedAt, CBE_POLICY_URL)];
  });
}

export function parseCbeTreasuryBillHtml(html: string, publishedAt: string): MacroObservationCandidate[] {
  const mappings: Array<[MacroSeriesCode, RegExp]> = [
    ['EG_TBILL_3M_YIELD', /(?:91\s*days?|3\s*months?)/i],
    ['EG_TBILL_6M_YIELD', /(?:182\s*days?|6\s*months?)/i],
    ['EG_TBILL_9M_YIELD', /(?:273\s*days?|9\s*months?)/i],
    ['EG_TBILL_12M_YIELD', /(?:364\s*days?|12\s*months?|1\s*year)/i],
  ];
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map((row) =>
    [...row[1]!.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cell) => strip(cell[1]!)),
  );
  return mappings.flatMap(([code, label]) => {
    const row = rows.find((cells) => label.test(cells[0] ?? ''));
    const value = Number((row?.[1] ?? '').replace('%', '').replaceAll(',', ''));
    if (!row || !Number.isFinite(value)) return [];
    const dateText = row.findLast((cell) => /^\d{2}\/\d{2}\/\d{4}$/.test(cell));
    const dateParts = dateText?.split('/');
    const observationDate = dateParts ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : publishedAt.slice(0, 10);
    return [candidate(code, observationDate, value, 'percent', publishedAt, CBE_TBILL_URL)];
  });
}

export function parseCbeReservesHtml(html: string, publishedAt: string): MacroObservationCandidate[] {
  const plain = strip(html);
  const match = plain.match(/(?:Net\s+International\s+Reserves|NIR)[\s\S]{0,300}?(?:US\$?|USD)?\s*([\d,]+(?:\.\d+)?)\s*(billion|million|bn|mn)/i);
  if (!match) return [];
  const magnitude = match[2]!.toLowerCase();
  const value = Number(match[1]!.replaceAll(',', '')) * (magnitude === 'billion' || magnitude === 'bn' ? 1_000 : 1);
  const observationDate = monthDate(plain.slice(Math.max(0, match.index! - 100), match.index! + 400)) ?? publishedAt.slice(0, 10);
  return [candidate('EG_NET_INTERNATIONAL_RESERVES_USD_MN', observationDate, value, 'usd_millions', publishedAt, CBE_RESERVES_URL)];
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, { headers: HEADERS, cache: 'no-store' });
  const html = await response.text();
  if (!response.ok || /Request Rejected/i.test(html)) throw new Error(`CBE request failed for ${url} with HTTP ${response.status}`);
  return html;
}

async function fetchCbeInflationHistory(frequency: 'mm' | 'yy', now: Date): Promise<MacroObservationCandidate[]> {
  const historicalUrl = `${CBE_INFLATION_URL}/historical-data`;
  const page = await fetch(historicalUrl, { headers: HEADERS, cache: 'no-store' });
  const html = await page.text();
  if (!page.ok || /Request Rejected/i.test(html)) throw new Error(`CBE inflation history page failed with HTTP ${page.status}`);
  const field = (name: string) => html.match(new RegExp(`name=["']${name}["'][^>]*value=["']([^"']+)`, 'i'))?.[1];
  const token = field('__RequestVerificationToken');
  const uid = field('uid');
  const dataSourceId = field('DataSourceId');
  if (!token || !uid || !dataSourceId) throw new Error('CBE inflation history form fields were not found');
  const date = (value: Date) => `${String(value.getUTCDate()).padStart(2, '0')}/${String(value.getUTCMonth() + 1).padStart(2, '0')}/${value.getUTCFullYear()}`;
  const body = new URLSearchParams({
    __RequestVerificationToken: token,
    uid,
    DataSourceId: dataSourceId,
    FallbackUrl: '/en/economic-research/statistics/inflation-rates/historical-data',
    LanguageName: 'en',
    FromDateRaw: `01/01/${now.getUTCFullYear() - 5}`,
    ToDateRaw: date(now),
    SelectedRadioButtonOption: frequency,
    SubmitAction: '1',
  });
  const setCookie = page.headers.get('set-cookie') ?? '';
  const cookie = setCookie
    .split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .map((part) => part.trim().split(';')[0])
    .filter(Boolean)
    .join('; ');
  const response = await fetch(`${CBE_ROOT}/api/statistics/GetItemsHistoricalData`, {
    method: 'POST',
    headers: {
      ...HEADERS,
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: CBE_ROOT,
      Referer: historicalUrl,
      Cookie: cookie,
    },
    body,
    cache: 'no-store',
  });
  const responseHtml = await response.text();
  if (!response.ok || /Invalid origin|Request Rejected/i.test(responseHtml)) throw new Error(`CBE inflation history request failed with HTTP ${response.status}`);
  return parseCbeInflationHistoryHtml(responseHtml, frequency, now.toISOString());
}

export async function fetchCbeCurrentObservations(
  now = new Date(),
  includeHistory = true,
): Promise<MacroObservationCandidate[]> {
  const publishedAt = now.toISOString();
  const requests = await Promise.allSettled([
    ...(includeHistory ? [fetchCbeInflationHistory('mm', now), fetchCbeInflationHistory('yy', now)] : []),
    fetchHtml(CBE_INFLATION_URL).then((html) => parseCbeInflationHtml(html, publishedAt)),
    fetchHtml(CBE_POLICY_URL).then((html) => parseCbePolicyRateHtml(html, publishedAt)),
    fetchHtml(CBE_TBILL_URL).then((html) => parseCbeTreasuryBillHtml(html, publishedAt)),
    fetchHtml(CBE_RESERVES_URL).then((html) => parseCbeReservesHtml(html, publishedAt)),
  ]);
  const observations = requests.flatMap((request) => request.status === 'fulfilled' ? request.value : []);
  if (observations.length === 0) throw new Error('CBE returned no usable macro observations');
  return observations;
}
