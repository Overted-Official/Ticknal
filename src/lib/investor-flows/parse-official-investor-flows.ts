export interface ParsedOfficialInvestorFlow {
  marketSegment: 'TOTAL' | 'STOCKS' | 'BONDS' | 'BILLS';
  /** Reported nationality turnover shares (null when the article doesn't publish them). */
  egyptianSharePct: number | null;
  arabSharePct: number | null;
  foreignSharePct: number | null;
  egyptianNet: number;
  arabNet: number;
  foreignNet: number;
  reportedTurnover?: number;
  isClosingReport: boolean;
  parseMethod: 'DIRECT_TOTALS' | 'DIRECT_TOTALS_INFERRED' | 'RETAIL_PLUS_INST' | 'RETAIL_PLUS_INST_INFERRED';

  // Category volume shares
  retailSharePct?: number | null;
  instSharePct?: number | null;

  // Retail breakdown
  egyptianRetailNet?: number | null;
  arabRetailNet?: number | null;
  foreignRetailNet?: number | null;

  // Institutional breakdown
  egyptianInstNet?: number | null;
  arabInstNet?: number | null;
  foreignInstNet?: number | null;
}

type Nat = 'EG' | 'AR' | 'FR';

/**
 * Normalizes Arabic text for deterministic regex extraction.
 */
export function normalizeArabicFlowText(raw: string): string {
  let s = raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8220;|&#8221;|&#8211;|&nbsp;|&quot;|«|»|"|“|”/g, ' ');

  // Convert Arabic-Indic digits to ASCII
  const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
  for (let i = 0; i < 10; i++) {
    s = s.replace(new RegExp(arabicDigits[i], 'g'), String(i));
  }
  s = s.replace(/٫/g, '.');

  // Remove Arabic diacritics and tatweel
  s = s.replace(/[\u064B-\u065F\u0670\u0640]/g, '');

  // Normalize hamzas, alef maqsura, teh marbuta
  s = s
    .replace(/[أإآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');

  // Handle commas in numbers: 1,200 -> 1200; 88,59% -> 88.59%
  s = s.replace(/(\d),(\d{3})(?!\d)/g, '$1$2');
  s = s.replace(/(\d),(\d{1,2})\s*%/g, '$1.$2%');

  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Checks if an article title/body is a weekly, monthly, quarterly, or annual summary
 * rather than a single trading session report.
 */
export function isMultiDaySummaryReport(rawTitle: string, rawBody: string): boolean {
  const title = normalizeArabicFlowText(rawTitle);
  const body = normalizeArabicFlowText(rawBody);

  // Weekly / monthly / quarterly / annual keywords in title, or debt-market (أدوات الدين / أذون الخزانة) reports
  if (
    /(خلال اسبوع|في اسبوع|اسبوعيه|خلال شهر|في شهر|شهريه|خلال الربع|ربع سنوي|النصف الاول|النصف الثاني|خلال عام|حصاد|منذ مطلع|منذ بدايه العام|ادوات الدين|اذون الخزانه|بنهايه الاسبوع الماضي|الاسبوع الماضي)/.test(
      title
    )
  ) {
    return true;
  }

  // Weekly/monthly EGX reports always include "بعد استبعاد الصفقات" in the investor flow sentence
  if (/بعد استبعاد الصفقات/.test(body)) {
    return true;
  }

  return false;
}

/**
 * Extracts monetary values (in EGP) from a clause in order of appearance.
 * Handles:
 *  - "126 مليون جنيه", "4 ملايين جنيه", "2.5 مليار جنيه", "225 الف جنيه"
 *  - "مليون جنيه" (1M), "مليوني جنيه" (2M), "مليار جنيه" (1B)
 *  - Shared unit: "126 و4 ملايين جنيه"
 */
export function extractMonetaryAmountsEgp(clause: string): number[] {
  const results: { index: number; value: number }[] = [];

  // Expand shared units like "126 و 4 ملايين جنيه" or "126 و4 مليون جنيه"
  const expanded = clause.replace(
    /(\d+(?:\.\d+)?)\s*و\s*(\d+(?:\.\d+)?)\s*(مليارا|مليار|مليارات|مليونا|مليون|ملايين|الفا|الف|الاف)/g,
    '$1 $3 جنيه و $2 $3'
  );

  // 1. Explicit number + unit
  const numUnitRegex = /(\d+(?:\.\d+)?)\s*(مليارا|مليار|مليارات|مليونا|مليون|ملايين|الفا|الف|الاف)(?:\s*جنيه)?/g;
  let m: RegExpExecArray | null;
  const matchedSpans: Array<[number, number]> = [];

  while ((m = numUnitRegex.exec(expanded)) !== null) {
    const num = parseFloat(m[1]);
    const unit = m[2];
    let mult = 1e6;
    if (unit.startsWith('مليار')) mult = 1e9;
    else if (unit.startsWith('الف') || unit.startsWith('الاف')) mult = 1e3;

    results.push({ index: m.index, value: Math.round(num * mult) });
    matchedSpans.push([m.index, m.index + m[0].length]);
  }

  // 2. Word-only unit without preceding digit: e.g. "ومليون جنيه" or "مليوني جنيه"
  const wordUnitRegex = /(?:^|[^\d.])(مليوني|مليون|مليار)\s*جنيه/g;
  while ((m = wordUnitRegex.exec(expanded)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    const overlaps = matchedSpans.some(([s, e]) => !(end <= s || start >= e));
    if (!overlaps) {
      const word = m[1];
      const val = word === 'مليار' ? 1e9 : word === 'مليوني' ? 2e6 : 1e6;
      results.push({ index: start, value: val });
    }
  }

  results.sort((a, b) => a.index - b.index);
  return results.map((r) => r.value);
}

/**
 * Finds nationalities mentioned in a clause in order of appearance.
 */
function extractNationalitiesInOrder(clause: string): Nat[] {
  const tokens: { index: number; nat: Nat }[] = [];
  // Normalize shorthand "الافراد والعرب" -> "الافراد المصريون والعرب"
  const normalizedClause = clause.replace(/الافراد\s+والعرب/g, 'الافراد المصريون والعرب');
  const patterns: Array<{ nat: Nat; re: RegExp }> = [
    {
      nat: 'EG',
      re: /(?<!البورصه |لبورصه |السوق |بالسوق |الاسهم |لاسهم |الشركات |الحكومه |الدوله |العمله )((?:ال|لل)(?:مصريون|مصريين|مصريه|محليه|محليين))/g,
    },
    { nat: 'AR', re: /((?:ال|لل)(?:عرب|عربيه))/g },
    { nat: 'FR', re: /((?:ال|لل)(?:اجانب|اجنبيه))/g },
  ];

  for (const { nat, re } of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalizedClause)) !== null) {
      tokens.push({ index: m.index, nat });
    }
  }

  tokens.sort((a, b) => a.index - b.index);

  // Deduplicate while preserving first appearance order
  const seen = new Set<Nat>();
  const ordered: Nat[] = [];
  for (const t of tokens) {
    if (!seen.has(t.nat)) {
      seen.add(t.nat);
      ordered.push(t.nat);
    }
  }
  return ordered;
}

/**
 * Parses directional net flows for EG, AR, FR from a segment of text
 * (either total investor flows, retail flows, or institutional flows).
 */
function parseDirectionalNatFlows(segment: string): Partial<Record<Nat, number>> {
  const out: Partial<Record<Nat, number>> = {};

  // Split segment into directional sub-clauses (IMPORTANT: never split on decimal point \.(?=\d)!)
  const clauses = segment
    .split(
      /(?:،\s*(?=فيما|بينما|وفى|وفي|في حين|كما|مقابل|وسجل|واتجه|وتوجه|وضخت|والمؤسسات|والافراد|تزامنا مع)|(?:\.(?!\d)|؛|فيما|بينما|وفي المقابل|في المقابل|في حين|تزامنا مع|كما\s+(?=سجل|اتجه|توجه|حققت)))/g
    )
    .map((c) => c.trim())
    .filter(Boolean);

  let inheritedSign: number | null = null;
  let allSameDirectionSign: number | null = null;

  if (/(متجهين نحو البيع جميعا|جميعا نحو البيع|بمختلف فئاتهم الي البيع|بمختلف فئاتهم للبيع)/.test(segment))
    allSameDirectionSign = -1;
  else if (/(متجهين نحو الشراء جميعا|جميعا نحو الشراء|بمختلف فئاتهم الي الشراء|بمختلف فئاتهم للشراء)/.test(segment))
    allSameDirectionSign = 1;

  for (const clause of clauses) {
    const subParts = clause.split(/\s+مقابل\s+(?=صافي\s+(?:بيع|شراء)|مشتريات|مبيعات)/);

    for (const part of subParts) {
      const nats = extractNationalitiesInOrder(part);
      if (nats.length === 0) {
        if (/(الشراء|شراء|مشتريات|شرائيا|شرائي)/.test(part) && !/(البيع|بيع|مبيعات|بيعيا|بيعي)/.test(part)) {
          inheritedSign = 1;
        } else if (/(البيع|بيع|مبيعات|بيعيا|بيعي)/.test(part) && !/(الشراء|شراء|مشتريات|شرائيا|شرائي)/.test(part)) {
          inheritedSign = -1;
        }
        continue;
      }

      const amounts = extractMonetaryAmountsEgp(part);
      if (amounts.length === 0) continue;

      let sign: number | null = null;
      const buyIdx = part.search(/(الشراء|شراء|مشتريات|شرائيا|شرائي|تدفقات داخله)/);
      const sellIdx = part.search(/(البيع|بيع|مبيعات|بيعيا|بيعي|تدفقات خارجه)/);

      if (buyIdx >= 0 && sellIdx < 0) sign = 1;
      else if (sellIdx >= 0 && buyIdx < 0) sign = -1;
      else if (buyIdx >= 0 && sellIdx >= 0) {
        sign = buyIdx < sellIdx ? 1 : -1;
      } else {
        sign = allSameDirectionSign ?? inheritedSign;
      }

      if (sign === null) continue;
      inheritedSign = sign;

      if (nats.length === amounts.length) {
        for (let i = 0; i < nats.length; i++) {
          if (out[nats[i]] === undefined) {
            out[nats[i]] = sign * amounts[i];
          } else if (nats.length === 1 && amounts.length === 1) {
            // Reporter accidentally repeated a nationality in the 3rd leg (e.g. "المحلية والعربية ... مقابل المحلية")
            const remaining = (['EG', 'AR', 'FR'] as Nat[]).filter((n) => out[n] === undefined);
            if (remaining.length === 1) {
              out[remaining[0]] = sign * amounts[0];
            }
          }
        }
      } else if (nats.length === 1 && amounts.length >= 1) {
        if (out[nats[0]] === undefined) {
          out[nats[0]] = sign * amounts[0];
        } else {
          // Reporter accidentally repeated a nationality in the 3rd leg (e.g. "المحلية والعربية ... مقابل المحلية")
          const remaining = (['EG', 'AR', 'FR'] as Nat[]).filter((n) => out[n] === undefined);
          if (remaining.length === 1 && amounts.length === 1) {
            out[remaining[0]] = sign * amounts[0];
          }
        }
      } else if (nats.length > 1 && amounts.length === 1 && /لكل منهما|لكل منهم/.test(part)) {
        for (const n of nats) {
          if (out[n] === undefined) out[n] = sign * amounts[0];
        }
      }
    }
  }

  return out;
}

/**
 * Extracts nationality share percentages (EG, AR, FR) from normalized text.
 */
function parseNationalityShares(norm: string): {
  egyptianSharePct: number;
  arabSharePct: number;
  foreignSharePct: number;
} | null {
  let eg: number | null = null;
  let ar: number | null = null;
  let fr: number | null = null;

  // Pattern 1: "X% للاجانب" / "X% للعرب" / "X% للمصريين"
  const pctBefore = (nat: string) => norm.match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*%\\s*لل${nat}`));
  // Pattern 1b: nationality token followed closely by a percentage with no other number in between
  // e.g. "المستثمرون المصريون 88.59%", "تلاهم الاجانب بنسبه 8.61%", "هيمنت تعاملات المصريين علي السوق بنسبه 83.25%"
  const pctAfter = (natRe: string) =>
    norm.match(new RegExp(`(?<!الافراد |المؤسسات |لل)(?:${natRe})(?![يه])[^%\\d.،؛]{0,45}?(\\d+(?:\\.\\d+)?)\\s*%`));

  const egMatch = pctBefore('مصريين') || pctAfter('المصريون|المصريين');
  if (egMatch) eg = parseFloat(egMatch[1]);

  const frMatch = pctBefore('اجانب') || pctAfter('الاجانب');
  if (frMatch) fr = parseFloat(frMatch[1]);

  const arMatch = pctBefore('عرب') || pctAfter('العرب');
  if (arMatch) ar = parseFloat(arMatch[1]);

  // Pattern 2: Clause with 1 or 2 nationalities followed by "مستحوذين علي نسبه X% [و Y%]"
  if (eg === null || ar === null || fr === null) {
    const clauses = norm.split(/(?:[،؛]|\.(?!\d))/);
    for (let i = 0; i < clauses.length; i++) {
      const c = clauses[i];
      const sharePartMatch = c.match(
        /مستحوذين\s+علي\s+(?:نسبه\s+|نحو\s+)?(\d+(?:\.\d+)?)\s*%(?:\s*و\s*(\d+(?:\.\d+)?)\s*%)?/
      );
      if (sharePartMatch) {
        const pcts = [parseFloat(sharePartMatch[1])];
        if (sharePartMatch[2]) pcts.push(parseFloat(sharePartMatch[2]));

        let nats = extractNationalitiesInOrder(c);
        if (nats.length === 0 && i > 0) {
          nats = extractNationalitiesInOrder(clauses[i - 1]);
        }
        if (nats.length === pcts.length) {
          for (let k = 0; k < nats.length; k++) {
            if (nats[k] === 'EG' && eg === null) eg = pcts[k];
            if (nats[k] === 'AR' && ar === null) ar = pcts[k];
            if (nats[k] === 'FR' && fr === null) fr = pcts[k];
          }
        }
      }
    }
  }

  // If 2 of 3 shares are known and sum < 100, infer the 3rd
  if (eg !== null && ar !== null && fr === null && eg + ar < 100) {
    fr = Math.round((100 - eg - ar) * 100) / 100;
  } else if (eg !== null && fr !== null && ar === null && eg + fr < 100) {
    ar = Math.round((100 - eg - fr) * 100) / 100;
  } else if (ar !== null && fr !== null && eg === null && ar + fr < 60) {
    eg = Math.round((100 - ar - fr) * 100) / 100;
  }

  if (eg === null || ar === null || fr === null) return null;
  if (eg < 40 || eg > 99.9 || ar < 0 || fr < 0) return null;
  const sum = eg + ar + fr;
  if (sum < 94 || sum > 103) return null;

  return {
    egyptianSharePct: eg,
    arabSharePct: ar,
    foreignSharePct: fr,
  };
}

/**
 * Extracts reported total equity turnover in EGP if mentioned in the article.
 */
function parseReportedTurnover(norm: string, rawTitle: string): number | undefined {
  const titleNorm = normalizeArabicFlowText(rawTitle);
  const combined = `${titleNorm} . ${norm}`;
  const m = combined.match(
    /(?:بتداولات|قيم التداولات|قيمه التداولات|قيم التداول|قيمه التداول|قيم التعاملات|قيمه التعاملات|اجمالي قيم التداول|تداولات الاسهم)\s+(?:خلال الجلسه\s+)?(?:نحو\s+|بلغت\s+|قرابه\s+|تجاوزت\s+)?(\d+(?:\.\d+)?)\s*(مليار|مليارات|مليون|ملايين)\s*جنيه/
  );
  if (!m) return undefined;
  const val = parseFloat(m[1]);
  const mult = m[2].startsWith('مليار') ? 1e9 : 1e6;
  return Math.round(val * mult);
}

/**
 * Extracts retail (individuals) vs institutional trading percentage shares.
 */
export function extractCategoryShares(norm: string): { retailSharePct: number; instSharePct: number } | null {
  // Pattern 1: الأفراد على 75.9% ... مقابل 24.1% للمؤسسات
  let m = norm.match(
    /الافراد\s+علي\s+(?:التعاملات\s+بنسبه\s+|نحو\s+|نسبه\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:من\s+(?:اجمالي\s+)?(?:التداولات|التعاملات))?[\s،,]*مقابل\s+(\d+(?:\.\d+)?)\s*%\s*للمؤسسات/
  );
  if (m) {
    const r = parseFloat(m[1]);
    const i = parseFloat(m[2]);
    if (r + i >= 97.5 && r + i <= 102.5) {
      return { retailSharePct: r, instSharePct: i };
    }
  }

  // Pattern 2: المؤسسات على 24.1% ... مقابل 75.9% للأفراد
  m = norm.match(
    /المؤسسات\s+علي\s+(?:نحو\s+|نسبه\s+)?(\d+(?:\.\d+)?)\s*%\s*(?:من\s+(?:اجمالي\s+)?(?:التداولات|التعاملات))?[\s،,]*مقابل\s+(\d+(?:\.\d+)?)\s*%\s*(?:للمستثمرين\s+)?(?:ال|لل)افراد/
  );
  if (m) {
    const i = parseFloat(m[1]);
    const r = parseFloat(m[2]);
    if (r + i >= 97.5 && r + i <= 102.5) {
      return { retailSharePct: r, instSharePct: i };
    }
  }

  return null;
}

/**
 * Main parser for an official EGX market report article.
 */
export function parseOfficialInvestorFlowArticle(
  rawTitle: string,
  rawBody: string,
  publishHour = 16
): ParsedOfficialInvestorFlow | null {
  if (isMultiDaySummaryReport(rawTitle, rawBody)) {
    return null;
  }

  const norm = normalizeArabicFlowText(rawBody);
  const titleNorm = normalizeArabicFlowText(rawTitle);
  const isIntradayTitle = /(مستهل|بمستهل|منتصف|بمنتصف|اول ساعه|بدايه تعاملات)/.test(titleNorm);
  const isClosingReport = !isIntradayTitle && publishHour >= 14;

  const shares = parseNationalityShares(norm);
  const categoryShares = extractCategoryShares(norm);
  const retailSharePct = categoryShares?.retailSharePct ?? null;
  const instSharePct = categoryShares?.instSharePct ?? null;
  const reportedTurnover = parseReportedTurnover(norm, rawTitle);

  // Locate where Retail ("الافراد") and Institutions ("المؤسسات") nationality sections start.
  // Require an explicit number + monetary unit within 160 chars so analyst commentary earlier in the article is never matched.
  const retailPatterns = [
    /الافراد\s+(?:المصريون|المصريين|العرب|الاجانب)/g,
    /(?:واتجه|اتجه|وتوجه|توجه|وسجل|سجل|واتجهت|اتجهت|وتوجهت|توجهت|وسجلت|سجلت|مع اتجاه)\s+(?:تعاملات\s+)?(?:المستثمرين\s+|المستثمرون\s+)?الافراد/g,
  ];
  const hasMonetaryEgpInWindow = (win: string) =>
    win.includes('جنيه') &&
    /\d+(?:\.\d+)?\s*(?:مليار|مليارات|مليون|ملايين|الفا|الف|الاف)(?!راد|\s*(?:نقطه|نقاط|عمليه|سهم|شركه|وثيقه))/.test(
      win
    );

  const retailCandidates: number[] = [];
  for (const re of retailPatterns) {
    let rm: RegExpExecArray | null;
    while ((rm = re.exec(norm)) !== null) {
      const win = norm.slice(rm.index, rm.index + 160);
      if (hasMonetaryEgpInWindow(win)) {
        retailCandidates.push(rm.index);
      }
    }
  }
  const retailIdx = retailCandidates.length > 0 ? Math.min(...retailCandidates) : -1;

  let instIdx = -1;
  const instCandidates: number[] = [];
  const instNatRe = /(?<!لل)المؤسسات\s+(?:المصريه|المحليه|العربيه|الاجنبيه)/g;
  let im: RegExpExecArray | null;
  while ((im = instNatRe.exec(norm)) !== null) {
    const win = norm.slice(im.index, im.index + 160);
    if (hasMonetaryEgpInWindow(win)) {
      instCandidates.push(im.index);
    }
  }
  const instVerbRe =
    /(?:سجلت|اتجهت|توجهت|حققت|قادت|فيما سجلت|بينما سجلت|كما سجلت|فيما اتجهت|بينما اتجهت|وتوجهت|وسجلت|واتجهت|وضخت)\s+(?:تعاملات\s+)?المؤسسات/g;
  while ((im = instVerbRe.exec(norm)) !== null) {
    const win = norm.slice(im.index, im.index + 160);
    if (hasMonetaryEgpInWindow(win)) {
      instCandidates.push(im.index);
    }
  }
  if (instCandidates.length > 0) {
    const afterRetail = retailIdx >= 0 ? instCandidates.filter((i) => i > retailIdx) : [];
    instIdx = afterRetail.length > 0 ? Math.min(...afterRetail) : Math.min(...instCandidates);
  } else {
    const instMatch = norm.match(
      /(?:سجلت المؤسسات|اتجهت المؤسسات|وبلغت نسبه تداول المؤسسات|فيما سجلت المؤسسات|حققت المؤسسات|قادت المؤسسات)/
    );
    instIdx = instMatch?.index ?? -1;
  }

  // Pre-parse retail and institutional directional flows if sections are identified
  let parsedRetailFlows: Partial<Record<Nat, number>> = {};
  let parsedInstFlows: Partial<Record<Nat, number>> = {};
  if (retailIdx >= 0 && instIdx >= 0) {
    const retailEnd = instIdx > retailIdx ? instIdx : Math.min(norm.length, retailIdx + 450);
    const instEnd = retailIdx > instIdx ? retailIdx : Math.min(norm.length, instIdx + 450);
    parsedRetailFlows = parseDirectionalNatFlows(norm.slice(retailIdx, retailEnd));
    parsedInstFlows = parseDirectionalNatFlows(norm.slice(instIdx, instEnd));
  }

  // Strategy 1: Direct total nationality flows (before retail/inst section, or entire flow paragraph)
  const firstCut =
    retailIdx >= 0 && instIdx >= 0
      ? Math.min(retailIdx, instIdx)
      : retailIdx >= 0
      ? retailIdx
      : instIdx >= 0
      ? instIdx
      : norm.length;

  const totalFlowStart = norm.search(
    /(?:اتجه صافي تعاملات|واتجهت تعاملات|اتجهت تعاملات|وعلي صعيد تعاملات المستثمرين|وفيما يتعلق بتعاملات المستثمرين|تعاملات المستثمرين|وسجلت تعاملات|اتجه المستثمرون|توجه المستثمرون|وتوجه المستثمرون|وتوجه المستثمرين|اتجه المصريون|وتوجه المصريون|وتوجه المصريين|اتجه العرب|وتوجه العرب|اتجه الاجانب|وتوجه الاجانب|اظهرت بيانات التعاملات|فيما اتجه المستثمرون|بينما اتجه المستثمرون)/
  );
  if (totalFlowStart >= 0 && totalFlowStart < firstCut) {
    const totalSegment = norm.slice(totalFlowStart, firstCut);
    const direct = parseDirectionalNatFlows(totalSegment);
    const known = (['EG', 'AR', 'FR'] as Nat[]).filter((n) => direct[n] !== undefined);

    if (known.length === 3) {
      const sum = direct.EG! + direct.AR! + direct.FR!;
      const maxAbs = Math.max(Math.abs(direct.EG!), Math.abs(direct.AR!), Math.abs(direct.FR!), 1);
      if (Math.abs(sum) <= Math.max(5_000_000, maxAbs * 0.05)) {
        const arabNet = direct.AR!;
        const foreignNet = direct.FR!;
        return {
          marketSegment: 'STOCKS',
          egyptianSharePct: shares?.egyptianSharePct ?? null,
          arabSharePct: shares?.arabSharePct ?? null,
          foreignSharePct: shares?.foreignSharePct ?? null,
          egyptianNet: -(arabNet + foreignNet),
          arabNet,
          foreignNet,
          retailSharePct,
          instSharePct,
          egyptianRetailNet: parsedRetailFlows.EG ?? null,
          arabRetailNet: parsedRetailFlows.AR ?? null,
          foreignRetailNet: parsedRetailFlows.FR ?? null,
          egyptianInstNet: parsedInstFlows.EG ?? null,
          arabInstNet: parsedInstFlows.AR ?? null,
          foreignInstNet: parsedInstFlows.FR ?? null,
          reportedTurnover,
          isClosingReport,
          parseMethod: 'DIRECT_TOTALS',
        };
      }
    } else if (known.length === 2) {
      // The third nationality is not mentioned at all in the flow sentence: derive it from the
      // exact identity EG + AR + FR = 0 (every EGP bought by one group is sold by another).
      const missing = (['EG', 'AR', 'FR'] as Nat[]).find((n) => direct[n] === undefined)!;
      const missingMentioned = extractNationalitiesInOrder(totalSegment).includes(missing);
      if (!missingMentioned) {
        const vals = { ...direct } as Record<Nat, number>;
        vals[missing] = -known.reduce((acc, n) => acc + direct[n]!, 0);
        return {
          marketSegment: 'STOCKS',
          egyptianSharePct: shares?.egyptianSharePct ?? null,
          arabSharePct: shares?.arabSharePct ?? null,
          foreignSharePct: shares?.foreignSharePct ?? null,
          egyptianNet: vals.EG,
          arabNet: vals.AR,
          foreignNet: vals.FR,
          retailSharePct,
          instSharePct,
          egyptianRetailNet: parsedRetailFlows.EG ?? null,
          arabRetailNet: parsedRetailFlows.AR ?? null,
          foreignRetailNet: parsedRetailFlows.FR ?? null,
          egyptianInstNet: parsedInstFlows.EG ?? null,
          arabInstNet: parsedInstFlows.AR ?? null,
          foreignInstNet: parsedInstFlows.FR ?? null,
          reportedTurnover,
          isClosingReport,
          parseMethod: 'DIRECT_TOTALS_INFERRED',
        };
      }
    }
  }

  // Strategy 2: Retail + Institutions nationality breakdown
  if (retailIdx >= 0 && instIdx >= 0) {
    const retailEnd = instIdx > retailIdx ? instIdx : Math.min(norm.length, retailIdx + 450);
    const instEnd = retailIdx > instIdx ? retailIdx : Math.min(norm.length, instIdx + 450);

    const retailFlows = parseDirectionalNatFlows(norm.slice(retailIdx, retailEnd));
    const instFlows = parseDirectionalNatFlows(norm.slice(instIdx, instEnd));

    // Also handle interwoven Retail/Inst clauses (e.g. buyers of both categories followed by sellers of both categories)
    if (
      Object.keys(retailFlows).length < 3 ||
      Object.keys(instFlows).length < 3
    ) {
      const combinedStart = Math.min(retailIdx, instIdx);
      const combinedBlock = norm.slice(combinedStart, Math.min(norm.length, combinedStart + 650));
      const subClauses = combinedBlock
        .split(/(?:[،؛]|\.(?!\d)|وفي المقابل|في المقابل|تزامنا مع)/g)
        .map((c) => c.trim())
        .filter(Boolean);
      for (const sc of subClauses) {
        const hasRetail = /(?:ال|لل)افراد/.test(sc);
        const hasInst = /(?:ال|لل)مؤسسات/.test(sc);
        if (hasRetail && !hasInst) {
          const parsed = parseDirectionalNatFlows(sc);
          for (const k of ['EG', 'AR', 'FR'] as Nat[]) {
            if (retailFlows[k] === undefined && parsed[k] !== undefined) retailFlows[k] = parsed[k];
          }
        } else if (hasInst && !hasRetail) {
          const parsed = parseDirectionalNatFlows(sc);
          for (const k of ['EG', 'AR', 'FR'] as Nat[]) {
            if (instFlows[k] === undefined && parsed[k] !== undefined) instFlows[k] = parsed[k];
          }
        }
      }
    }

    let activeRetail = { ...retailFlows };
    let activeInst = { ...instFlows };
    let legs: Array<number | undefined> = [
      activeRetail.EG, activeRetail.AR, activeRetail.FR,
      activeInst.EG, activeInst.AR, activeInst.FR,
    ];
    let missingCount = legs.filter((v) => v === undefined).length;

    if (missingCount === 0) {
      let rawEg = activeRetail.EG! + activeInst.EG!;
      let rawAr = activeRetail.AR! + activeInst.AR!;
      let rawFr = activeRetail.FR! + activeInst.FR!;
      let sum = rawEg + rawAr + rawFr;
      let maxAbs = Math.max(Math.abs(rawEg), Math.abs(rawAr), Math.abs(rawFr), 1);

      // Financial journalism typo correction: If a reporter accidentally writes "مليار" (billion)
      // instead of "مليون" (million) for a small flow, scaling outlier billion-scale legs (>= 1e9) down
      // by 1000 can restore the exact zero-sum balance EG + AR + FR = 0.
      if (Math.abs(sum) > Math.max(75_000_000, maxAbs * 0.1)) {
        const fixLeg = (v: number | undefined) => (v !== undefined && Math.abs(v) >= 1e9 ? v / 1000 : v);
        const testRetail = { EG: fixLeg(activeRetail.EG), AR: fixLeg(activeRetail.AR), FR: fixLeg(activeRetail.FR) };
        const testInst = { EG: fixLeg(activeInst.EG), AR: fixLeg(activeInst.AR), FR: fixLeg(activeInst.FR) };
        const testEg = testRetail.EG! + testInst.EG!;
        const testAr = testRetail.AR! + testInst.AR!;
        const testFr = testRetail.FR! + testInst.FR!;
        const testSum = testEg + testAr + testFr;
        const testMaxAbs = Math.max(Math.abs(testEg), Math.abs(testAr), Math.abs(testFr), 1);

        if (Math.abs(testSum) <= Math.max(75_000_000, testMaxAbs * 0.1)) {
          activeRetail = testRetail;
          activeInst = testInst;
          rawEg = testEg;
          rawAr = testAr;
          rawFr = testFr;
          sum = testSum;
          maxAbs = testMaxAbs;
          legs = [
            activeRetail.EG, activeRetail.AR, activeRetail.FR,
            activeInst.EG, activeInst.AR, activeInst.FR,
          ];
        }
      }

      if (Math.abs(sum) <= Math.max(75_000_000, maxAbs * 0.1)) {
        return {
          marketSegment: 'STOCKS',
          egyptianSharePct: shares?.egyptianSharePct ?? null,
          arabSharePct: shares?.arabSharePct ?? null,
          foreignSharePct: shares?.foreignSharePct ?? null,
          egyptianNet: -(rawAr + rawFr),
          arabNet: rawAr,
          foreignNet: rawFr,
          retailSharePct,
          instSharePct,
          egyptianRetailNet: activeRetail.EG,
          arabRetailNet: activeRetail.AR,
          foreignRetailNet: activeRetail.FR,
          egyptianInstNet: activeInst.EG,
          arabInstNet: activeInst.AR,
          foreignInstNet: activeInst.FR,
          reportedTurnover,
          isClosingReport,
          parseMethod: 'RETAIL_PLUS_INST',
        };
      } else if (
        shares &&
        !legs.every((v) => v! > 0) &&
        !legs.every((v) => v! < 0) &&
        Math.abs(rawAr) < 1_000_000_000 &&
        Math.abs(rawFr) < 1_000_000_000 &&
        Math.abs(activeRetail.EG!) < 1_000_000_000
      ) {
        // Explicit Arab & Foreign retail and institutional legs are all present and mixed-sign,
        // while the Egyptian leg had a journalist copy/sign typo. Derive egyptianNet from -(rawAr + rawFr).
        const egyptianNet = -(rawAr + rawFr);
        return {
          marketSegment: 'STOCKS',
          egyptianSharePct: shares.egyptianSharePct,
          arabSharePct: shares.arabSharePct,
          foreignSharePct: shares.foreignSharePct,
          egyptianNet,
          arabNet: rawAr,
          foreignNet: rawFr,
          retailSharePct,
          instSharePct,
          egyptianRetailNet: egyptianNet - activeInst.EG!,
          arabRetailNet: activeRetail.AR,
          foreignRetailNet: activeRetail.FR,
          egyptianInstNet: activeInst.EG,
          arabInstNet: activeInst.AR,
          foreignInstNet: activeInst.FR,
          reportedTurnover,
          isClosingReport,
          parseMethod: 'RETAIL_PLUS_INST_INFERRED',
        };
      }
    } else if (missingCount === 1) {
      // One leg omitted by the reporter (typically a negligible one, e.g. foreign retail).
      // Derive it from the exact zero-sum identity, or treat omitted foreign retail as 0 when all 5 other legs are reported.
      const known = legs.filter((v): v is number => v !== undefined);
      const inferred = -known.reduce((a, b) => a + b, 0);
      const grossAbs = known.reduce((a, b) => a + Math.abs(b), 0);
      if (Math.abs(inferred) <= Math.max(50_000_000, grossAbs * 0.12)) {
        const filled = legs.map((v) => (v === undefined ? inferred : v));
        const arabNet = filled[1] + filled[4];
        const foreignNet = filled[2] + filled[5];
        return {
          marketSegment: 'STOCKS',
          egyptianSharePct: shares?.egyptianSharePct ?? null,
          arabSharePct: shares?.arabSharePct ?? null,
          foreignSharePct: shares?.foreignSharePct ?? null,
          egyptianNet: -(arabNet + foreignNet),
          arabNet,
          foreignNet,
          retailSharePct,
          instSharePct,
          egyptianRetailNet: filled[0],
          arabRetailNet: filled[1],
          foreignRetailNet: filled[2],
          egyptianInstNet: filled[3],
          arabInstNet: filled[4],
          foreignInstNet: filled[5],
          reportedTurnover,
          isClosingReport,
          parseMethod: 'RETAIL_PLUS_INST_INFERRED',
        };
      } else if (
        activeRetail.FR === undefined &&
        Math.abs(inferred) <= Math.max(150_000_000, grossAbs * 0.22)
      ) {
        // Foreign retail omitted by journalist because negligible; keep explicit Arab & Foreign Inst legs intact
        const arabNet = activeRetail.AR! + activeInst.AR!;
        const foreignNet = activeInst.FR!;
        const egyptianNet = -(arabNet + foreignNet);
        return {
          marketSegment: 'STOCKS',
          egyptianSharePct: shares?.egyptianSharePct ?? null,
          arabSharePct: shares?.arabSharePct ?? null,
          foreignSharePct: shares?.foreignSharePct ?? null,
          egyptianNet,
          arabNet,
          foreignNet,
          retailSharePct,
          instSharePct,
          egyptianRetailNet: egyptianNet - activeInst.EG!,
          arabRetailNet: activeRetail.AR!,
          foreignRetailNet: 0,
          egyptianInstNet: activeInst.EG!,
          arabInstNet: activeInst.AR!,
          foreignInstNet: activeInst.FR!,
          reportedTurnover,
          isClosingReport,
          parseMethod: 'RETAIL_PLUS_INST_INFERRED',
        };
      }
    } else if (missingCount === 2 || missingCount === 3) {
      // Two sub-legs omitted (e.g. Arab & Foreign retail described as "مشتريات محدودة" or combined).
      const hasEg = activeRetail.EG !== undefined || activeInst.EG !== undefined;
      const hasAr = activeRetail.AR !== undefined || activeInst.AR !== undefined;
      const hasFr = activeRetail.FR !== undefined || activeInst.FR !== undefined;
      const rawEg = (activeRetail.EG ?? 0) + (activeInst.EG ?? 0);
      const rawAr = (activeRetail.AR ?? 0) + (activeInst.AR ?? 0);
      const rawFr = (activeRetail.FR ?? 0) + (activeInst.FR ?? 0);
      const known = legs.filter((v): v is number => v !== undefined);
      const grossAbs = known.reduce((a, b) => a + Math.abs(b), 0);

      if (hasEg && hasAr && hasFr) {
        const sum = rawEg + rawAr + rawFr;
        const maxAbs = Math.max(Math.abs(rawEg), Math.abs(rawAr), Math.abs(rawFr), 1);
        if (Math.abs(sum) <= Math.max(50_000_000, maxAbs * 0.12)) {
          const arabNet = rawAr;
          const foreignNet = rawFr;
          return {
            marketSegment: 'STOCKS',
            egyptianSharePct: shares?.egyptianSharePct ?? null,
            arabSharePct: shares?.arabSharePct ?? null,
            foreignSharePct: shares?.foreignSharePct ?? null,
            egyptianNet: -(arabNet + foreignNet),
            arabNet,
            foreignNet,
            retailSharePct,
            instSharePct,
            egyptianRetailNet: activeRetail.EG ?? 0,
            arabRetailNet: activeRetail.AR ?? 0,
            foreignRetailNet: activeRetail.FR ?? 0,
            egyptianInstNet: activeInst.EG ?? 0,
            arabInstNet: activeInst.AR ?? 0,
            foreignInstNet: activeInst.FR ?? 0,
            reportedTurnover,
            isClosingReport,
            parseMethod: 'RETAIL_PLUS_INST_INFERRED',
          };
        }
      } else if ([hasEg, hasAr, hasFr].filter(Boolean).length === 2) {
        const sum2 = rawEg + rawAr + rawFr;
        if (Math.abs(sum2) <= Math.max(35_000_000, grossAbs * 0.08)) {
          const egNet = hasEg ? rawEg : -sum2;
          const arNet = hasAr ? rawAr : -sum2;
          const frNet = hasFr ? rawFr : -sum2;
          return {
            marketSegment: 'STOCKS',
            egyptianSharePct: shares?.egyptianSharePct ?? null,
            arabSharePct: shares?.arabSharePct ?? null,
            foreignSharePct: shares?.foreignSharePct ?? null,
            egyptianNet: -(arNet + frNet),
            arabNet: arNet,
            foreignNet: frNet,
            retailSharePct,
            instSharePct,
            egyptianRetailNet: activeRetail.EG ?? (hasEg ? 0 : egNet),
            arabRetailNet: activeRetail.AR ?? (hasAr ? 0 : arNet),
            foreignRetailNet: activeRetail.FR ?? (hasFr ? 0 : frNet),
            egyptianInstNet: activeInst.EG ?? 0,
            arabInstNet: activeInst.AR ?? 0,
            foreignInstNet: activeInst.FR ?? 0,
            reportedTurnover,
            isClosingReport,
            parseMethod: 'RETAIL_PLUS_INST_INFERRED',
          };
        }
      }
    }
  }

  // Strategy 3: All 3 Institutional legs explicitly reported with nationality shares (Retail absorbed the opposite side)
  if (instIdx >= 0 && shares) {
    const instEnd = retailIdx > instIdx ? retailIdx : Math.min(norm.length, instIdx + 450);
    const instFlows = parseDirectionalNatFlows(norm.slice(instIdx, instEnd));
    if (
      instFlows.EG !== undefined &&
      instFlows.AR !== undefined &&
      instFlows.FR !== undefined
    ) {
      const totalInstNet = instFlows.EG + instFlows.AR + instFlows.FR;
      const totalRetailNet = -totalInstNet;
      const arabNet = instFlows.AR;
      const foreignNet = instFlows.FR;
      const egyptianNet = -(arabNet + foreignNet);
      return {
        marketSegment: 'STOCKS',
        egyptianSharePct: shares.egyptianSharePct,
        arabSharePct: shares.arabSharePct,
        foreignSharePct: shares.foreignSharePct,
        egyptianNet,
        arabNet,
        foreignNet,
        retailSharePct,
        instSharePct,
        egyptianRetailNet: totalRetailNet,
        arabRetailNet: 0,
        foreignRetailNet: 0,
        egyptianInstNet: instFlows.EG,
        arabInstNet: instFlows.AR,
        foreignInstNet: instFlows.FR,
        reportedTurnover,
        isClosingReport,
        parseMethod: 'RETAIL_PLUS_INST_INFERRED',
      };
    }
  }

  // Strategy 4: Official closing breakdown where Foreign net flow is explicitly reported in EGP
  // alongside official nationality/category % shares (or all 3 retail legs), while the domestic counter-leg is stated verbally.
  const hasAllRetailPreview =
    parsedRetailFlows.EG !== undefined &&
    parsedRetailFlows.AR !== undefined &&
    parsedRetailFlows.FR !== undefined;
  if (isClosingReport && (shares || categoryShares || hasAllRetailPreview)) {
    const rFlows =
      retailIdx >= 0
        ? parseDirectionalNatFlows(
            norm.slice(retailIdx, instIdx > retailIdx ? instIdx : Math.min(norm.length, retailIdx + 450))
          )
        : {};
    const iFlows =
      instIdx >= 0
        ? parseDirectionalNatFlows(
            norm.slice(instIdx, retailIdx > instIdx ? retailIdx : Math.min(norm.length, instIdx + 450))
          )
        : {};
    // Also check tail after % shares for direct nationality flows (e.g. "واتجه الاجانب الي الشراء بصافي 129 مليون جنيه")
    const tailFlows = parseDirectionalNatFlows(norm.slice(-450));

    const frRetail = rFlows.FR ?? 0;
    const frInst = iFlows.FR ?? (rFlows.FR === undefined ? tailFlows.FR : undefined);
    if (frInst !== undefined && Math.abs(frInst) < 5_000_000_000) {
      const foreignNet = frRetail + frInst;
      const arRetail = rFlows.AR ?? 0;
      const arInst = iFlows.AR ?? (rFlows.AR === undefined ? tailFlows.AR ?? 0 : 0);
      let arabNet = arRetail + arInst;
      let egyptianNet = -(arabNet + foreignNet);

      if (rFlows.EG !== undefined && iFlows.EG !== undefined && arabNet === 0) {
        egyptianNet = rFlows.EG + iFlows.EG;
        arabNet = -(egyptianNet + foreignNet);
      }

      return {
        marketSegment: 'STOCKS',
        egyptianSharePct: shares?.egyptianSharePct ?? null,
        arabSharePct: shares?.arabSharePct ?? null,
        foreignSharePct: shares?.foreignSharePct ?? null,
        egyptianNet,
        arabNet,
        foreignNet,
        retailSharePct,
        instSharePct,
        egyptianRetailNet: rFlows.EG ?? (iFlows.EG !== undefined ? egyptianNet - iFlows.EG : egyptianNet),
        arabRetailNet: arRetail,
        foreignRetailNet: frRetail,
        egyptianInstNet: iFlows.EG ?? (rFlows.EG !== undefined ? egyptianNet - rFlows.EG : 0),
        arabInstNet: arabNet - arRetail,
        foreignInstNet: frInst,
        reportedTurnover,
        isClosingReport,
        parseMethod: 'RETAIL_PLUS_INST_INFERRED',
      };
    }
  }

  return null;
}
