import {
  parseOfficialInvestorFlowArticle,
  type ParsedOfficialInvestorFlow,
} from './parse-official-investor-flows';

/**
 * Official EGX investor-nationality flows, as published in the EGX end-of-session bulletin
 * and reported by Al Borsa News (alborsaanews.com, category "البورصة والشركات").
 *
 * IMPORTANT: this module never fabricates numbers. If no consistent official closing report
 * exists for a session, callers receive `null` and must not write a row.
 */

const ALBORSA_POSTS_ENDPOINT = 'https://www.alborsaanews.com/wp-json/wp/v2/posts';
const ALBORSA_MARKETS_CATEGORY_ID = 10;
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  Accept: 'application/json',
};

export interface OfficialFlowCandidate {
  parsed: ParsedOfficialInvestorFlow;
  sourceUrl: string;
  title: string;
}

export interface VerifiedSessionFlow {
  egyptianNet: number;
  arabNet: number;
  foreignNet: number;
  egyptianSharePct: number;
  arabSharePct: number;
  foreignSharePct: number;
  parseMethod: ParsedOfficialInvestorFlow['parseMethod'];
  sourceUrl: string;
  retailSharePct?: number | null;
  instSharePct?: number | null;
  egyptianRetailNet?: number | null;
  arabRetailNet?: number | null;
  foreignRetailNet?: number | null;
  egyptianInstNet?: number | null;
  arabInstNet?: number | null;
  foreignInstNet?: number | null;
}

export interface InvestorFlowRowValues {
  egyptianBuy: number;
  egyptianSell: number;
  egyptianNet: number;
  arabBuy: number;
  arabSell: number;
  arabNet: number;
  foreignBuy: number;
  foreignSell: number;
  foreignNet: number;
  totalTurnover: number;
}

/**
 * Picks a single verified session result from all closing-report candidates of one day.
 * Returns null when candidates disagree or no candidate publishes nationality shares.
 */
export function selectVerifiedSession(candidates: OfficialFlowCandidate[]): VerifiedSessionFlow | null {
  const closing = candidates.filter((c) => c.parsed.isClosingReport);
  if (closing.length === 0) return null;

  const fNets = closing.map((c) => c.parsed.foreignNet);
  const spread = Math.max(...fNets) - Math.min(...fNets);
  const maxAbs = Math.max(...fNets.map(Math.abs), 1);
  if (closing.length > 1 && spread > Math.max(10_000_000, maxAbs * 0.1)) {
    return null; // conflicting reports — never guess
  }

  const best = closing.find((c) => c.parsed.egyptianSharePct !== null);
  if (!best) return null;
  const p = best.parsed;

  return {
    egyptianNet: p.egyptianNet,
    arabNet: p.arabNet,
    foreignNet: p.foreignNet,
    egyptianSharePct: p.egyptianSharePct!,
    arabSharePct: p.arabSharePct!,
    foreignSharePct: p.foreignSharePct!,
    parseMethod: p.parseMethod,
    sourceUrl: best.sourceUrl,
    retailSharePct: p.retailSharePct ?? null,
    instSharePct: p.instSharePct ?? null,
    egyptianRetailNet: p.egyptianRetailNet ?? null,
    arabRetailNet: p.arabRetailNet ?? null,
    foreignRetailNet: p.foreignRetailNet ?? null,
    egyptianInstNet: p.egyptianInstNet ?? null,
    arabInstNet: p.arabInstNet ?? null,
    foreignInstNet: p.foreignInstNet ?? null,
  };
}

/**
 * Reconstructs buy/sell per nationality from official shares + nets:
 *   share_i = (buy_i + sell_i) / (2T)  and  net_i = buy_i - sell_i
 *   => buy_i = T*share_i + net_i/2,  sell_i = T*share_i - net_i/2
 * Returns null if the report is internally inconsistent (net larger than participation).
 */
export function buildInvestorFlowRow(session: VerifiedSessionFlow, turnover: number): InvestorFlowRowValues | null {
  if (!(turnover > 0)) return null;
  const sum = session.egyptianSharePct + session.arabSharePct + session.foreignSharePct;
  if (!(sum > 0)) return null;

  const leg = (sharePct: number, net: number) => {
    const s = sharePct / sum;
    return { buy: Math.round(turnover * s + net / 2), sell: Math.round(turnover * s - net / 2) };
  };
  const e = leg(session.egyptianSharePct, session.egyptianNet);
  const a = leg(session.arabSharePct, session.arabNet);
  const f = leg(session.foreignSharePct, session.foreignNet);
  if ([e, a, f].some((x) => x.buy < 0 || x.sell < 0)) return null;

  return {
    egyptianBuy: e.buy,
    egyptianSell: e.sell,
    egyptianNet: session.egyptianNet,
    arabBuy: a.buy,
    arabSell: a.sell,
    arabNet: session.arabNet,
    foreignBuy: f.buy,
    foreignSell: f.sell,
    foreignNet: session.foreignNet,
    totalTurnover: Math.round(turnover * 100) / 100,
  };
}

/**
 * Fetches and parses all official closing reports published on `dateStr` (Cairo date, YYYY-MM-DD).
 */
export async function fetchOfficialFlowCandidatesForDate(dateStr: string): Promise<OfficialFlowCandidate[]> {
  const url =
    `${ALBORSA_POSTS_ENDPOINT}?categories=${ALBORSA_MARKETS_CATEGORY_ID}` +
    `&after=${dateStr}T00:00:00&before=${dateStr}T23:59:59&per_page=100` +
    `&_fields=id,date,title,link,content`;

  const res = await fetch(url, { headers: REQUEST_HEADERS, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Official investor flow feed returned HTTP ${res.status}`);
  }
  const posts: Array<{ date: string; link: string; title?: { rendered?: string }; content?: { rendered?: string } }> =
    await res.json();

  const out: OfficialFlowCandidate[] = [];
  for (const post of posts) {
    if (!post.date?.startsWith(dateStr)) continue;
    const hour = Number(post.date.slice(11, 13));
    const title = post.title?.rendered ?? '';
    const parsed = parseOfficialInvestorFlowArticle(title, post.content?.rendered ?? '', hour);
    if (parsed) out.push({ parsed, sourceUrl: post.link, title });
  }
  return out;
}

/**
 * Convenience: fetch + verify the official session flow for a date (null if unavailable/inconsistent).
 */
export async function fetchOfficialInvestorFlowForDate(dateStr: string): Promise<VerifiedSessionFlow | null> {
  const candidates = await fetchOfficialFlowCandidatesForDate(dateStr);
  return selectVerifiedSession(candidates);
}
