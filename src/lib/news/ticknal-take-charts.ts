/**
 * Ticknal Take dual-format vector SVG chart cards:
 * - Desktop (`wide`): 1200 x 675 (16:9 widescreen) for desktop feed & wide container
 * - Mobile (`square`): 1080 x 1080 (1:1 square) for phone feed & 1:1 container
 *
 * Rules:
 * - Every piece of text is passed through xmlEscape EXACTLY ONCE.
 * - Remote images (ticker logos) are embedded as base64 data URIs.
 * - Pure pitch-black (#000000) surface with #222222 hairline borders.
 */

import { CAIRO_ARABIC_WOFF2_BASE64 } from './cairo-font-base64';

export function xmlEscape(val: unknown): string {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

const esc = xmlEscape;

function toBase64Svg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

const GREEN = '#10b981';
const RED = '#f43f5e';
const AMBER = '#f59e0b';
const CYAN = '#00BCE6';
const BLUE = '#1d9bf0';
const MUTED = '#71717a';
const SOFT = '#a1a1aa';
const LINE = '#222222';
const GRID = '#161618';

const SECTOR_AR_MAP: Record<string, string> = {
  Financials: 'الخدمات المالية',
  'Financial Services': 'الخدمات المالية',
  Banks: 'البنوك',
  'Real Estate': 'العقارات',
  Materials: 'الموارد الأساسية',
  'Basic Resources': 'الموارد الأساسية',
  Industrials: 'الصناعة والخدمات',
  'Consumer Staples': 'الأغذية والمشروبات',
  'Food & Beverage': 'الأغذية والمشروبات',
  'Consumer Disc.': 'السلع الاستهلاكية',
  'Consumer Discretionary': 'السلع الاستهلاكية',
  'Health Care': 'الرعاية الصحية',
  Healthcare: 'الرعاية الصحية',
  'IT & Comms': 'الاتصالات والتكنولوجيا',
  Technology: 'التكنولوجيا',
  Energy: 'الطاقة',
  Utilities: 'المرافق',
};

function localizeSectorName(sector: string, ar: boolean): string {
  if (!ar) return sector;
  return SECTOR_AR_MAP[sector] || sector;
}

export type ChartVariant = 'wide' | 'square';

export interface HotMoneyChartData {
  date: string;
  totalTurnoverBillion: number;
  todayHotMoneyNetMillion?: number;
  todayForeignNetMillion: number;
  todayArabNetMillion: number;
  todayEgyptianNetMillion: number;
  rolling30dForeignNetMillion: number;
  inflowDaysCount: number;
  outflowDaysCount: number;
  isFlightRisk: boolean;
  dailyBars30d: Array<{ date: string; foreignNetMillion: number; cumulativeMillion: number }>;
}

export interface TradeSummaryHistoryPoint {
  date: string;
  egx30Close: number;
  egx70Close: number;
  egx100Close: number;
  turnoverBillion: number;
}

export interface TradeSummaryChartData {
  date: string;
  egx30Close: number;
  egx30ChangePct: number;
  egx30Open?: number;
  egx30High?: number;
  egx30Low?: number;
  egx70Close: number;
  egx70ChangePct: number;
  egx70Open?: number;
  egx70High?: number;
  egx70Low?: number;
  egx100Close: number;
  egx100ChangePct: number;
  egx100Open?: number;
  egx100High?: number;
  egx100Low?: number;
  turnoverBillion: number;
  sentiment: string;
  history20d?: TradeSummaryHistoryPoint[];
}

export interface SectorBreadthItem {
  sector: string;
  advancers: number;
  decliners: number;
  flat: number;
  total: number;
}

export interface BreadthHistoryPoint {
  date: string;
  advancers: number;
  decliners: number;
  flat: number;
  total: number;
}

export interface MarketBreadthChartData {
  date: string;
  advancers: number;
  decliners: number;
  flat: number;
  totalStocks: number;
  advancersPct: number;
  declinersPct: number;
  turnoverBillion: number;
  sectorBreakdown?: SectorBreadthItem[];
  history10d?: BreadthHistoryPoint[];
}

export interface MoverStock {
  ticker: string;
  companyName?: string;
  sector?: string;
  logoDataUri?: string | null;
  close: number;
  open?: number;
  high?: number;
  low?: number;
  changePct: number;
  volume: number;
  turnover?: number;
}

export interface GainersLosersChartData {
  date: string;
  topGainers: MoverStock[];
  topLosers: MoverStock[];
}

export interface FxHistoryPoint {
  date: string;
  officialUsd: number;
  compositeFair: number;
  saghaGoldUsd: number;
  londonGdrUsd: number;
}

export interface UsdEgpUpdateChartData {
  date: string;
  officialUsd: number;
  compositeFair: number;
  saghaGoldUsd: number;
  londonGdrUsd: number;
  atr14: number;
  atr90: number;
  atrCompressionRatio: number;
  devaluationRiskScore: number;
  devaluationRiskLabel: string;
  history20d?: FxHistoryPoint[];
  delta30dEgp?: number;
  pct30d?: number;
  delta7dEgp?: number;
  pct7d?: number;
  dailyPaceEgp?: number;
  accelerationRatio?: number;
}

export interface TrendBreakoutHistoryPoint {
  date: string;
  new20dHighs: number;
  new20dLows: number;
  net20d: number;
  aboveSma50Pct: number;
  total: number;
}

export interface TrendBreakoutTickerItem {
  ticker: string;
  close: number;
  changePct: number;
  levelLabel: string;
}

export interface TrendBreakoutsChartData {
  date: string;
  totalStocks: number;
  new20dHighs: number;
  new20dHighsPct: number;
  new20dLows: number;
  new20dLowsPct: number;
  new60dHighs: number;
  new60dHighsPct: number;
  new60dLows: number;
  new60dLowsPct: number;
  new52wHighs: number;
  new52wHighsPct: number;
  new52wLows: number;
  new52wLowsPct: number;
  aboveSma20: number;
  aboveSma20Pct: number;
  aboveSma50: number;
  aboveSma50Pct: number;
  aboveSma200: number;
  aboveSma200Pct: number;
  crossedAboveSma50: number;
  crossedBelowSma50: number;
  topBreakouts: TrendBreakoutTickerItem[];
  topBreakdowns: TrendBreakoutTickerItem[];
  history10d?: TrendBreakoutHistoryPoint[];
}

export interface SnapshotIndexPoint {
  close: number;
  changePct: number;
}

export interface SnapshotFlowSplit {
  /** Net across all segments (stocks + T-bills + others), EGP millions */
  totalM: number;
  /** Listed equities only, EGP millions */
  stocksM: number;
  /** Treasury bills only, EGP millions */
  billsM: number;
}

export interface MarketSnapshotChartData {
  date: string;
  egx30: SnapshotIndexPoint;
  egx70: SnapshotIndexPoint;
  egx100: SnapshotIndexPoint;
  /** Ascending EGX 30 closes (up to 20 sessions, ending at `date`) */
  egx30History: Array<{ date: string; close: number }>;
  /** Listed-equity turnover, EGP billions */
  equityTurnoverBillion: number;
  foreign: SnapshotFlowSplit;
  arab: SnapshotFlowSplit;
  egyptian: SnapshotFlowSplit;
  /** Foreign + Arab cumulative net over the last 30 sessions, EGP millions */
  hotMoney30dNetMillion: number;
  hotMoney30dInflowDays: number;
  hotMoney30dOutflowDays: number;
  /** Official CBE USD/EGP close and 1-session change */
  usdClose: number;
  usdChangePct: number;
  /** Ascending official USD/EGP closes (up to 15 sessions, ending at `date`) */
  usdHistory: Array<{ date: string; close: number }>;
  /** Ticknal composite fair value — only pass when it is genuinely as-of `date` */
  usdFairValue?: number;
  advancers: number;
  decliners: number;
  flat: number;
  topGainer?: { ticker: string; changePct: number };
  topLoser?: { ticker: string; changePct: number };
}

function svgShell(w: number, h: number, defs: string, body: string, ar: boolean = false): string {
  const fontFaceStyle = ar
    ? `<style>
        @font-face {
          font-family: 'Cairo';
          font-style: normal;
          font-weight: 400 800;
          src: url(data:font/woff2;base64,${CAIRO_ARABIC_WOFF2_BASE64}) format('woff2');
        }
        text, tspan { font-family: 'Cairo', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
        .ticknal-brand-text { font-family: EuclidCircularSemibold, Inter, -apple-system, sans-serif !important; font-weight: 600; letter-spacing: -0.04em; }
      </style>`
    : `<style>
        .ticknal-brand-text { font-family: EuclidCircularSemibold, Inter, -apple-system, sans-serif; font-weight: 600; letter-spacing: -0.04em; }
      </style>`;
  const rootFont = ar
    ? "'Cairo',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"
    : "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"${ar ? ' dir="rtl"' : ''} style="background:#000000;font-family:${rootFont};font-variant-numeric:tabular-nums;">
  <defs>${fontFaceStyle}${defs}</defs>
  <rect width="${w}" height="${h}" fill="#000000" />
  ${body}
</svg>`;
}

function headerBlock(
  w: number,
  title: string,
  subtitle: string,
  date: string,
  pill: string,
  badgeText?: string,
  badgeColor?: string,
  ar: boolean = false
): string {
  const rightX = w - 42;
  const innerW = w - 84;
  const titleFontSize = w <= 1080 ? 22.5 : 24.5;
  const badgeW = badgeText ? Math.max(216, Math.min(310, Math.round(badgeText.length * (ar ? 8.2 : 7.8) + 34))) : 236;

  if (ar) {
    // RTL Header: Date on top-left, Brand + Pill on top-right; Title & Subtitle on right, Status Badge on left
    return `
  <text x="42" y="50" fill="${MUTED}" font-size="13" font-weight="600" text-anchor="start">${esc(date)}</text>
  <g transform="translate(${rightX - 96}, 34)">
    <svg x="72" y="0" viewBox="5 6 54 54" width="24" height="24" fill="none">
      <path fill="#FFFFFF" d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z" />
    </svg>
    <text x="64" y="19" fill="#FFFFFF" font-size="20" font-weight="600" letter-spacing="-0.04em" text-anchor="end" class="ticknal-brand-text">ticknal</text>
    <rect x="-106" y="1" width="96" height="22" rx="6" fill="#000000" stroke="#2e2e32" stroke-width="1" />
    <text x="-58" y="16" fill="${SOFT}" font-size="11.5" font-weight="700" text-anchor="middle">نبض تكنال</text>
    <text x="-118" y="16" fill="${MUTED}" font-size="12" font-weight="700" text-anchor="end">${esc(pill)} ·</text>
  </g>
  <g transform="translate(42, 76)">
    <text x="${innerW}" y="24" fill="#ffffff" font-size="${titleFontSize}" font-weight="700" text-anchor="end">${esc(title)}</text>
    <text x="${innerW}" y="48" fill="${MUTED}" font-size="13" font-weight="600" text-anchor="end">${esc(subtitle)}</text>
    ${
      badgeText && badgeColor
        ? `<g transform="translate(0, 4)">
             <rect width="${badgeW}" height="32" rx="8" fill="${badgeColor}" fill-opacity="0.12" stroke="${badgeColor}" stroke-opacity="0.45" stroke-width="1.2" />
             <text x="${(badgeW / 2).toFixed(1)}" y="21" fill="${badgeColor}" font-size="12" font-weight="700" text-anchor="middle">${esc(badgeText)}</text>
           </g>`
        : ''
    }
  </g>
  <line x1="42" y1="138" x2="${rightX}" y2="138" stroke="${LINE}" stroke-width="1" />`;
  }

  return `
  <g transform="translate(42, 34)">
    <svg viewBox="5 6 54 54" width="24" height="24" fill="none">
      <path fill="#FFFFFF" d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z" />
    </svg>
    <text x="33" y="19" fill="#FFFFFF" font-size="20" font-weight="600" letter-spacing="-0.04em" class="ticknal-brand-text">ticknal</text>
    <rect x="106" y="1" width="96" height="22" rx="6" fill="#000000" stroke="#2e2e32" stroke-width="1" />
    <text x="154" y="16" fill="${SOFT}" font-size="11" font-weight="600" text-anchor="middle">Ticknal take</text>
    <text x="216" y="16" fill="${MUTED}" font-size="11" font-weight="700" letter-spacing="0.08em">· ${esc(pill.toUpperCase())}</text>
  </g>
  <text x="${rightX}" y="50" fill="${MUTED}" font-size="13" font-weight="600" text-anchor="end">${esc(date)}</text>
  <g transform="translate(42, 76)">
    <text x="0" y="24" fill="#ffffff" font-size="${titleFontSize}" font-weight="700" letter-spacing="-0.02em">${esc(title)}</text>
    <text x="0" y="46" fill="${MUTED}" font-size="12.5" font-weight="500">${esc(subtitle)}</text>
    ${
      badgeText && badgeColor
        ? `<g transform="translate(${w - 84 - badgeW}, 4)">
             <rect width="${badgeW}" height="32" rx="8" fill="${badgeColor}" fill-opacity="0.12" stroke="${badgeColor}" stroke-opacity="0.45" stroke-width="1.2" />
             <text x="${(badgeW / 2).toFixed(1)}" y="21" fill="${badgeColor}" font-size="11.5" font-weight="700" text-anchor="middle">${esc(badgeText)}</text>
           </g>`
        : ''
    }
  </g>
  <line x1="42" y1="138" x2="${rightX}" y2="138" stroke="${LINE}" stroke-width="1" />`;
}

function footerBlock(w: number, h: number, note: string, ar: boolean = false): string {
  const y = h - 28;
  if (ar) {
    return `
  <line x1="42" y1="${y - 18}" x2="${w - 42}" y2="${y - 18}" stroke="${LINE}" stroke-width="1" />
  <text x="42" y="${y}" fill="${SOFT}" font-size="11.5" font-weight="600" text-anchor="start">ticknal.com</text>
  <text x="${w - 42}" y="${y}" fill="#52525b" font-size="12" font-weight="600" text-anchor="end">${esc(note)}</text>`;
  }
  return `
  <line x1="42" y1="${y - 18}" x2="${w - 42}" y2="${y - 18}" stroke="${LINE}" stroke-width="1" />
  <text x="42" y="${y}" fill="#52525b" font-size="11.5" font-weight="500">${esc(note)}</text>
  <text x="${w - 42}" y="${y}" fill="${SOFT}" font-size="11.5" font-weight="600" text-anchor="end">ticknal.com</text>`;
}

const sign = (n: number) => (n >= 0 ? '+' : '');
const signedSymbol = (n: number) => (n > 0 ? '+' : n < 0 ? '-' : '');
const fmt1 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmt2 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function fmtFlowMoney(valMillion: number, ar: boolean, signed = true): string {
  const abs = Math.abs(valMillion);
  const s = signed ? signedSymbol(valMillion) : '';
  if (abs >= 1000) {
    const bn = (abs / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return ar ? `${s}${bn} مليار جنيه` : `${s}${bn}B EGP`;
  }
  const m = abs.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return ar ? `${s}${m} مليون جنيه` : `${s}${m}M EGP`;
}

export function fmtFlowCompact(valMillion: number, ar: boolean, signed = false): string {
  const abs = Math.abs(valMillion);
  const s = signed ? signedSymbol(valMillion) : '';
  if (abs >= 1000) {
    const bn = (abs / 1000).toFixed(2);
    return ar ? `${s}${bn} مليار` : `${s}${bn}B`;
  }
  const m = abs.toFixed(1);
  return ar ? `${s}${m} م` : `${s}${m}M`;
}

/* ───────────────────────────────────────────────────────────────────────────
 * 1. HOT MONEY STATUS — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateHotMoneyChartSvg(
  data: HotMoneyChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = locale === 'ar';
  const hotMoneyNet = typeof data.todayHotMoneyNetMillion === 'number'
    ? data.todayHotMoneyNetMillion
    : Number((data.todayForeignNetMillion + data.todayArabNetMillion).toFixed(1));
  const risk = data.isFlightRisk;
  const isMixedRecovery = data.rolling30dForeignNetMillion < -250 && hotMoneyNet >= 0;
  const riskColor = risk ? RED : isMixedRecovery ? AMBER : GREEN;
  const statusBadge = risk
    ? ar ? 'تحذير: ضغوط تخارج الأموال الساخنة' : 'HOT MONEY OUTFLOW PRESSURE'
    : isMixedRecovery
    ? ar ? 'شراء تكتيكي وسط تخارج ٣٠ جلسة' : 'TACTICAL INFLOW / 30D OUTFLOW'
    : ar ? 'تجميع مؤسسي إيجابي' : 'INSTITUTIONAL ACCUMULATION';

  const cats = [
    { label: ar ? 'المؤسسات الأجنبية' : 'Foreign Institutions', val: data.todayForeignNetMillion },
    { label: ar ? 'المستثمرون العرب' : 'Arab Investors', val: data.todayArabNetMillion },
    { label: ar ? 'المستثمرون المصريون' : 'Egyptian Investors', val: data.todayEgyptianNetMillion },
  ];
  const maxCatAbs = Math.max(10, ...cats.map((c) => Math.abs(c.val)));

  const cum = data.rolling30dForeignNetMillion;
  const hotMoneyColor = hotMoneyNet >= 0 ? GREEN : RED;
  const cumColor = cum >= 0 ? GREEN : RED;
  const totalDays = Math.max(1, data.inflowDaysCount + data.outflowDaysCount);

  const defs = `
    <linearGradient id="hmCumGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0.28" />
      <stop offset="100%" stop-color="${CYAN}" stop-opacity="0.0" />
    </linearGradient>`;

  if (isSquare) {
    // 1:1 SQUARE MOBILE LAYOUT (1080 x 1080)
    const zeroBarX = 498;
    const maxHalfBarW = 220;
    const sqDivergingRows = cats
      .map((c, idx) => {
        const y = 62 + idx * 48;
        const bw = Math.max(6, (Math.abs(c.val) / maxCatAbs) * maxHalfBarW);
        const col = c.val >= 0 ? GREEN : RED;
        const bx = c.val >= 0 ? zeroBarX : zeroBarX - bw;
        if (ar) {
          return `
          <text x="970" y="${y + 18}" fill="${SOFT}" font-size="15.5" font-weight="700" text-anchor="end">${esc(c.label)}</text>
          <line x1="${zeroBarX - maxHalfBarW}" y1="${y + 12}" x2="${zeroBarX + maxHalfBarW}" y2="${y + 12}" stroke="#18181b" stroke-width="14" stroke-linecap="round" />
          <rect x="${bx.toFixed(1)}" y="${y + 4}" width="${bw.toFixed(1)}" height="16" rx="4" fill="${col}" />
          <text x="26" y="${y + 18}" fill="${col}" font-size="16" font-weight="700" text-anchor="start">${fmtFlowMoney(c.val, ar)}</text>`;
        }
        return `
        <text x="26" y="${y + 18}" fill="${SOFT}" font-size="15" font-weight="600">${esc(c.label)}</text>
        <line x1="${zeroBarX - maxHalfBarW}" y1="${y + 12}" x2="${zeroBarX + maxHalfBarW}" y2="${y + 12}" stroke="#18181b" stroke-width="14" stroke-linecap="round" />
        <rect x="${bx.toFixed(1)}" y="${y + 4}" width="${bw.toFixed(1)}" height="16" rx="4" fill="${col}" />
        <text x="968" y="${y + 18}" fill="${col}" font-size="16" font-weight="700" text-anchor="end">${fmtFlowMoney(c.val, ar)}</text>`;
      })
      .join('');

    const bars = (data.dailyBars30d || []).slice(-30);
    const n = bars.length;
    const plotX = 76;
    const plotW = 824;
    const plotTop = 74;
    const plotH = 310;
    const zeroY = plotTop + plotH * 0.48;
    const halfH = plotH * 0.42;
    const step = n > 0 ? plotW / n : plotW;
    const barW = Math.max(8, step * 0.60);
    const maxDailyAbs = Math.max(10, ...bars.map((b) => Math.abs(b.foreignNetMillion)));
    const cumVals = bars.map((b) => b.cumulativeMillion);
    const minCum = Math.min(0, ...cumVals);
    const maxCum = Math.max(0, ...cumVals);
    const cumSpan = Math.max(1, maxCum - minCum);
    const cumToY = (v: number) => plotTop + 18 + ((maxCum - v) / cumSpan) * (plotH - 36);

    // Dynamic power curve scaling: prevents single extreme outlier sessions (e.g. sovereign block trades)
    // from visually collapsing standard daily institutional inflows and outflows
    const nonZeroAbs = bars.map((b) => Math.abs(b.foreignNetMillion)).filter((v) => v > 0).sort((a, b) => a - b);
    const p90Abs = nonZeroAbs[Math.min(nonZeroAbs.length - 1, Math.floor(nonZeroAbs.length * 0.90))] || 450;
    const visualCap = Math.max(200, p90Abs);
    const minBarH = 10;

    const barRects = bars
      .map((b, i) => {
        const absVal = Math.abs(b.foreignNetMillion);
        const up = b.foreignNetMillion > 0;
        const down = b.foreignNetMillion < 0;
        const col = up ? GREEN : down ? RED : '#71717a';
        const strokeCol = up ? '#34d399' : down ? '#fb7185' : '#a1a1aa';
        const x = plotX + i * step + (step - barW) / 2;

        if (absVal === 0) {
          return `<line x1="${x.toFixed(1)}" y1="${zeroY.toFixed(1)}" x2="${(x + barW).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#71717a" stroke-width="2" />`;
        }

        const ratio = Math.min(1.0, Math.pow(absVal / visualCap, 0.58));
        const h = Math.max(minBarH, ratio * halfH);
        const y = up ? zeroY - h : zeroY;
        const markerY = up ? zeroY - h : zeroY + h;

        return `
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${col}" stroke="${strokeCol}" stroke-width="1" />
          <circle cx="${(x + barW / 2).toFixed(1)}" cy="${markerY.toFixed(1)}" r="2.5" fill="${strokeCol}" />`;
      })
      .join('');

    const pts = bars.map((b, i) => ({
      x: plotX + i * step + step / 2,
      y: cumToY(b.cumulativeMillion),
      date: b.date,
    }));
    const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const areaPathStr =
      pts.length > 1
        ? `M ${pts[0].x.toFixed(1)} ${(plotTop + plotH).toFixed(1)} L ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${pts[pts.length - 1].x.toFixed(1)} ${(plotTop + plotH).toFixed(1)} Z`
        : '';
    const lastPt = pts[pts.length - 1];
    const xLabels = pts
      .filter((_, i) => i === 0 || i === Math.floor(n / 4) || i === Math.floor(n / 2) || i === Math.floor((3 * n) / 4) || i === n - 1)
      .map((p) => `<text x="${p.x.toFixed(1)}" y="${plotTop + plotH + 28}" fill="${MUTED}" font-size="13" font-weight="600" text-anchor="middle">${esc(p.date)}</text>`)
      .join('');

    const sqBody = `
      ${headerBlock(
        W,
        ar ? 'الأموال الساخنة: صافي تعاملات غير المصريين (أجانب وعرب)' : 'Hot Money Pulse: Foreign & Arab Flows',
        ar ? 'من يضخ السيولة ومن يسحبها: تعاملات الأجانب والعرب والمصريين اليوم' : 'Session net positioning & 30-session cumulative trajectory',
        data.date,
        ar ? 'الأموال الساخنة' : 'Hot Money Status',
        statusBadge,
        riskColor,
        ar
      )}

      <!-- Top Full-Width Diverging Bar Card (996 x 216) -->
      <g transform="translate(42, 156)">
        <rect width="996" height="216" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="970" y="34" fill="#ffffff" font-size="16.5" font-weight="700" text-anchor="end">صافي تعاملات فئات المستثمرين اليوم</text>
               <text x="26" y="34" fill="${CYAN}" font-size="15" font-weight="700" text-anchor="start">السيولة: ${data.totalTurnoverBillion.toFixed(2)} مليار جنيه</text>`
            : `<text x="26" y="34" fill="#ffffff" font-size="16.5" font-weight="700">Session Net Flow by Investor Category</text>
               <text x="968" y="34" fill="${CYAN}" font-size="15" font-weight="700" text-anchor="end">Turnover: ${data.totalTurnoverBillion.toFixed(2)}B EGP</text>`
        }
        <line x1="${zeroBarX}" y1="54" x2="${zeroBarX}" y2="198" stroke="#3f3f46" stroke-width="1.2" stroke-dasharray="4 4" />
        ${sqDivergingRows}
      </g>

      <!-- Middle 30-Session Summary Strip (996 x 162) -->
      <g transform="translate(42, 390)">
        <rect width="996" height="162" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="970" y="30" fill="${SOFT}" font-size="13" font-weight="700" text-anchor="end">صافي الأموال الساخنة اليوم</text>
               <text x="970" y="66" fill="${hotMoneyColor}" font-size="28" font-weight="700" text-anchor="end">${fmtFlowMoney(hotMoneyNet, ar)}</text>
               <text x="560" y="30" fill="${SOFT}" font-size="13" font-weight="700" text-anchor="end">التراكمي (٣٠ جلسة)</text>
               <text x="560" y="66" fill="${cumColor}" font-size="28" font-weight="700" text-anchor="end">${fmtFlowMoney(cum, ar)}</text>
               <text x="26" y="30" fill="${SOFT}" font-size="13" font-weight="700" text-anchor="start">جلسات الشراء مقابل البيع</text>
               <text x="26" y="66" fill="#ffffff" font-size="26" font-weight="700" text-anchor="start">
                 <tspan fill="${GREEN}">${data.inflowDaysCount}D</tspan>
                 <tspan fill="${MUTED}" font-size="18"> / </tspan>
                 <tspan fill="${RED}">${data.outflowDaysCount}D</tspan>
               </text>`
            : `<text x="26" y="30" fill="${SOFT}" font-size="13" font-weight="600">Today's Hot Money Net</text>
               <text x="26" y="66" fill="${hotMoneyColor}" font-size="28" font-weight="700">${fmtFlowMoney(hotMoneyNet, ar)}</text>
               <text x="440" y="30" fill="${SOFT}" font-size="13" font-weight="600">30-Session Cumulative</text>
               <text x="440" y="66" fill="${cumColor}" font-size="28" font-weight="700">${fmtFlowMoney(cum, ar)}</text>
               <text x="970" y="30" fill="${SOFT}" font-size="13" font-weight="600" text-anchor="end">Inflow vs. Outflow Days</text>
               <text x="970" y="66" fill="#ffffff" font-size="26" font-weight="700" text-anchor="end">
                 <tspan fill="${GREEN}">${data.inflowDaysCount}D</tspan>
                 <tspan fill="${MUTED}" font-size="18"> / </tspan>
                 <tspan fill="${RED}">${data.outflowDaysCount}D</tspan>
               </text>`
        }

        <g transform="translate(26, 94)">
          <rect width="944" height="16" rx="5" fill="#18181b" />
          <rect x="0" y="0" width="${((data.inflowDaysCount / totalDays) * 944).toFixed(1)}" height="16" rx="5" fill="${GREEN}" />
          <rect x="${((data.inflowDaysCount / totalDays) * 944).toFixed(1)}" y="0" width="${((data.outflowDaysCount / totalDays) * 944).toFixed(1)}" height="16" rx="5" fill="${RED}" />
        </g>
        <text x="26" y="136" fill="${GREEN}" font-size="12.5" font-weight="700">▲ ${Math.round((data.inflowDaysCount / totalDays) * 100)}% ${esc(ar ? 'جلسات شراء' : 'Inflow Sessions')} (${data.inflowDaysCount})</text>
        <text x="970" y="136" fill="${RED}" font-size="12.5" font-weight="700" text-anchor="end">▼ ${Math.round((data.outflowDaysCount / totalDays) * 100)}% ${esc(ar ? 'جلسات بيع' : 'Outflow Sessions')} (${data.outflowDaysCount})</text>
      </g>

      <!-- Bottom Large 30-Session Combo Chart (996 x 440) -->
      <g transform="translate(42, 570)">
        <rect width="996" height="440" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="970" y="38" fill="#ffffff" font-size="16.5" font-weight="700" text-anchor="end">مسار الأموال الساخنة اليومي والتراكمي (أجانب + عرب · آخر ٣٠ جلسة)</text>
               <rect x="26" y="24" width="13" height="13" rx="3" fill="${GREEN}" />
               <text x="44" y="35" fill="${SOFT}" font-size="12.5" font-weight="700">شراء</text>
               <rect x="108" y="24" width="13" height="13" rx="3" fill="${RED}" />
               <text x="126" y="35" fill="${SOFT}" font-size="12.5" font-weight="700">بيع</text>
               <line x1="186" y1="30" x2="213" y2="30" stroke="${CYAN}" stroke-width="3" />
               <text x="221" y="35" fill="${CYAN}" font-size="12.5" font-weight="700">المسار التراكمي</text>`
            : `<text x="26" y="38" fill="#ffffff" font-size="16.5" font-weight="700">30-Session Daily Hot Money Net Bars &amp; Cumulative Curve</text>
               <rect x="610" y="24" width="13" height="13" rx="3" fill="${GREEN}" />
               <text x="628" y="35" fill="${SOFT}" font-size="12.5" font-weight="600">Inflow</text>
               <rect x="695" y="24" width="13" height="13" rx="3" fill="${RED}" />
               <text x="713" y="35" fill="${SOFT}" font-size="12.5" font-weight="600">Outflow</text>
               <line x1="785" y1="30" x2="812" y2="30" stroke="${CYAN}" stroke-width="3" />
               <text x="820" y="35" fill="${CYAN}" font-size="12.5" font-weight="700">Cumulative</text>`
        }

        <line x1="${plotX}" y1="${plotTop + 18}" x2="${plotX + plotW}" y2="${plotTop + 18}" stroke="${GRID}" stroke-width="1" />
        <line x1="${plotX}" y1="${zeroY}" x2="${plotX + plotW}" y2="${zeroY}" stroke="#333338" stroke-width="1" stroke-dasharray="4 4" />
        <line x1="${plotX}" y1="${plotTop + plotH}" x2="${plotX + plotW}" y2="${plotTop + plotH}" stroke="${GRID}" stroke-width="1" />

        <text x="${plotX - 10}" y="${plotTop + 22}" fill="${MUTED}" font-size="11.5" text-anchor="end">+${fmtFlowCompact(maxDailyAbs, ar, false)}</text>
        <text x="${plotX - 10}" y="${zeroY + 4}" fill="${SOFT}" font-size="11.5" text-anchor="end">0</text>
        <text x="${plotX - 10}" y="${plotTop + plotH}" fill="${MUTED}" font-size="11.5" text-anchor="end">-${fmtFlowCompact(maxDailyAbs, ar, false)}</text>

        ${areaPathStr ? `<path d="${areaPathStr}" fill="url(#hmCumGrad)" />` : ''}
        ${barRects}
        ${pts.length > 1 ? `<polyline points="${polylineStr}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />` : ''}
        ${
          lastPt
            ? `<circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="5" fill="${CYAN}" stroke="#000000" stroke-width="2" />
               <rect x="${(plotX + plotW + 8).toFixed(1)}" y="${(lastPt.y - 13).toFixed(1)}" width="76" height="24" rx="6" fill="${CYAN}" fill-opacity="0.16" stroke="${CYAN}" stroke-width="1" />
               <text x="${(plotX + plotW + 46).toFixed(1)}" y="${(lastPt.y + 3).toFixed(1)}" fill="${CYAN}" font-size="11" font-weight="700" text-anchor="middle">${fmtFlowCompact(cum, ar, true)}</text>`
            : ''
        }
        ${xLabels}
      </g>

      ${footerBlock(W, H, ar ? 'محرك تكنال للتحليل الكمي · البورصة المصرية' : 'Ticknal Quantitative Flow Engine · Verified EGX Institutional Flow Data', ar)}
    `;
    return toBase64Svg(svgShell(W, H, defs, sqBody, ar));
  }

  // 16:9 WIDE DESKTOP LAYOUT (1200 x 675)
  const zeroBarX = ar ? 260 : 285;
  const maxHalfBarW = 115;
  const divergingRows = cats
    .map((c, idx) => {
      const y = 52 + idx * 40;
      const bw = Math.max(4, (Math.abs(c.val) / maxCatAbs) * maxHalfBarW);
      const col = c.val >= 0 ? GREEN : RED;
      const bx = c.val >= 0 ? zeroBarX : zeroBarX - bw;
      if (ar) {
        return `
        <text x="526" y="${y + 15}" fill="${SOFT}" font-size="12.5" font-weight="700" text-anchor="end">${esc(c.label)}</text>
        <line x1="${zeroBarX - maxHalfBarW}" y1="${y + 10}" x2="${zeroBarX + maxHalfBarW}" y2="${y + 10}" stroke="#18181b" stroke-width="10" stroke-linecap="round" />
        <rect x="${bx.toFixed(1)}" y="${y + 3}" width="${bw.toFixed(1)}" height="14" rx="4" fill="${col}" />
        <text x="20" y="${y + 15}" fill="${col}" font-size="13" font-weight="700" text-anchor="start">${fmtFlowMoney(c.val, ar)}</text>`;
      }
      return `
      <text x="20" y="${y + 15}" fill="${SOFT}" font-size="12" font-weight="600">${esc(c.label)}</text>
      <line x1="${zeroBarX - maxHalfBarW}" y1="${y + 10}" x2="${zeroBarX + maxHalfBarW}" y2="${y + 10}" stroke="#18181b" stroke-width="10" stroke-linecap="round" />
      <rect x="${bx.toFixed(1)}" y="${y + 3}" width="${bw.toFixed(1)}" height="14" rx="4" fill="${col}" />
      <text x="526" y="${y + 15}" fill="${col}" font-size="13" font-weight="700" text-anchor="end">${fmtFlowMoney(c.val, ar)}</text>`;
    })
    .join('');

  const bars = (data.dailyBars30d || []).slice(-30);
  const n = bars.length;
  const plotX = 68;
  const plotW = 956;
  const plotTop = 52;
  const plotH = 166;
  const zeroY = plotTop + plotH * 0.48;
  const halfH = plotH * 0.42;
  const step = n > 0 ? plotW / n : plotW;
  const barW = Math.max(8, step * 0.58);
  const maxDailyAbs = Math.max(10, ...bars.map((b) => Math.abs(b.foreignNetMillion)));
  const cumVals = bars.map((b) => b.cumulativeMillion);
  const minCum = Math.min(0, ...cumVals);
  const maxCum = Math.max(0, ...cumVals);
  const cumSpan = Math.max(1, maxCum - minCum);
  const cumToY = (v: number) => plotTop + 14 + ((maxCum - v) / cumSpan) * (plotH - 28);

  // Dynamic power curve scaling: prevents single extreme outlier sessions (e.g. sovereign block trades)
  // from visually collapsing standard daily institutional inflows and outflows
  const nonZeroAbs = bars.map((b) => Math.abs(b.foreignNetMillion)).filter((v) => v > 0).sort((a, b) => a - b);
  const p90Abs = nonZeroAbs[Math.min(nonZeroAbs.length - 1, Math.floor(nonZeroAbs.length * 0.90))] || 450;
  const visualCap = Math.max(200, p90Abs);
  const minBarH = 8;

  const barRects = bars
    .map((b, i) => {
      const absVal = Math.abs(b.foreignNetMillion);
      const up = b.foreignNetMillion > 0;
      const down = b.foreignNetMillion < 0;
      const col = up ? GREEN : down ? RED : '#71717a';
      const strokeCol = up ? '#34d399' : down ? '#fb7185' : '#a1a1aa';
      const x = plotX + i * step + (step - barW) / 2;

      if (absVal === 0) {
        return `<line x1="${x.toFixed(1)}" y1="${zeroY.toFixed(1)}" x2="${(x + barW).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#71717a" stroke-width="2" />`;
      }

      const ratio = Math.min(1.0, Math.pow(absVal / visualCap, 0.58));
      const h = Math.max(minBarH, ratio * halfH);
      const y = up ? zeroY - h : zeroY;
      const markerY = up ? zeroY - h : zeroY + h;

      return `
        <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${col}" stroke="${strokeCol}" stroke-width="1" />
        <circle cx="${(x + barW / 2).toFixed(1)}" cy="${markerY.toFixed(1)}" r="2" fill="${strokeCol}" />`;
    })
    .join('');

  const pts = bars.map((b, i) => ({
    x: plotX + i * step + step / 2,
    y: cumToY(b.cumulativeMillion),
    date: b.date,
  }));
  const polylineStr = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPathStr =
    pts.length > 1
      ? `M ${pts[0].x.toFixed(1)} ${(plotTop + plotH).toFixed(1)} L ${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ')} L ${pts[pts.length - 1].x.toFixed(1)} ${(plotTop + plotH).toFixed(1)} Z`
      : '';
  const lastPt = pts[pts.length - 1];
  const xLabels = pts
    .filter((_, i) => i === 0 || i === Math.floor(n / 4) || i === Math.floor(n / 2) || i === Math.floor((3 * n) / 4) || i === n - 1)
    .map((p) => `<text x="${p.x.toFixed(1)}" y="${plotTop + plotH + 20}" fill="${MUTED}" font-size="11" font-weight="500" text-anchor="middle">${esc(p.date)}</text>`)
    .join('');

  const sessionCardX = ar ? 612 : 42;
  const rollingCardX = ar ? 42 : 612;

  const body = `
    ${headerBlock(
      W,
      ar ? 'الأموال الساخنة: صافي تعاملات غير المصريين (أجانب وعرب)' : 'Hot Money Pulse: Foreign & Arab Flows',
      ar ? 'من يضخ السيولة ومن يسحبها: تعاملات الأجانب والعرب والمصريين اليوم' : 'Session net positioning & 30-session cumulative trajectory',
      data.date,
      ar ? 'الأموال الساخنة' : 'Hot Money Status',
      statusBadge,
      riskColor,
      ar
    )}

    <g transform="translate(${sessionCardX}, 154)">
      <rect width="546" height="178" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="526" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">صافي تعاملات المستثمرين اليوم</text>
             <text x="20" y="28" fill="${CYAN}" font-size="12" font-weight="700" text-anchor="start">السيولة: ${data.totalTurnoverBillion.toFixed(2)} مليار</text>`
          : `<text x="20" y="28" fill="#ffffff" font-size="14" font-weight="700">Session Net Flow by Category</text>
             <text x="526" y="28" fill="${CYAN}" font-size="12" font-weight="700" text-anchor="end">Turnover: ${data.totalTurnoverBillion.toFixed(2)}B EGP</text>`
      }
      <line x1="${zeroBarX}" y1="44" x2="${zeroBarX}" y2="166" stroke="#3f3f46" stroke-width="1" stroke-dasharray="3 3" />
      ${divergingRows}
    </g>

    <g transform="translate(${rollingCardX}, 154)">
      <rect width="546" height="178" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="522" y="24" fill="${SOFT}" font-size="11.5" font-weight="700" text-anchor="end">صافي الأموال الساخنة اليوم</text>
             <text x="522" y="55" fill="${hotMoneyColor}" font-size="22" font-weight="700" text-anchor="end">${fmtFlowMoney(hotMoneyNet, ar)}</text>
             <text x="24" y="24" fill="${SOFT}" font-size="11.5" font-weight="700" text-anchor="start">التراكمي (٣٠ جلسة)</text>
             <text x="24" y="55" fill="${cumColor}" font-size="22" font-weight="700" text-anchor="start">${fmtFlowMoney(cum, ar)}</text>
             <line x1="24" y1="69" x2="522" y2="69" stroke="${LINE}" stroke-width="1" />
             <text x="522" y="90" fill="${MUTED}" font-size="11" font-weight="600" text-anchor="end">توزيع جلسات الشراء والبيع (٣٠ جلسة)</text>
             <text x="24" y="90" fill="#ffffff" font-size="12" font-weight="700" text-anchor="start">
               <tspan fill="${GREEN}">${data.inflowDaysCount}D</tspan>
               <tspan fill="${MUTED}"> / </tspan>
               <tspan fill="${RED}">${data.outflowDaysCount}D</tspan>
             </text>`
          : `<text x="24" y="24" fill="${SOFT}" font-size="11.5" font-weight="600">Today's Hot Money Net</text>
             <text x="24" y="55" fill="${hotMoneyColor}" font-size="22" font-weight="700">${fmtFlowMoney(hotMoneyNet, ar)}</text>
             <text x="522" y="24" fill="${SOFT}" font-size="11.5" font-weight="600" text-anchor="end">30-Session Cumulative</text>
             <text x="522" y="55" fill="${cumColor}" font-size="22" font-weight="700" text-anchor="end">${fmtFlowMoney(cum, ar)}</text>
             <line x1="24" y1="69" x2="522" y2="69" stroke="${LINE}" stroke-width="1" />
             <text x="24" y="90" fill="${MUTED}" font-size="11" font-weight="600">30-Session Inflow vs. Outflow Days</text>
             <text x="522" y="90" fill="#ffffff" font-size="12" font-weight="700" text-anchor="end">
               <tspan fill="${GREEN}">${data.inflowDaysCount}D</tspan>
               <tspan fill="${MUTED}"> / </tspan>
               <tspan fill="${RED}">${data.outflowDaysCount}D</tspan>
             </text>`
      }
      <g transform="translate(24, 101)">
        <rect width="498" height="12" rx="4" fill="#18181b" />
        <rect x="0" y="0" width="${((data.inflowDaysCount / totalDays) * 498).toFixed(1)}" height="12" rx="4" fill="${GREEN}" />
        <rect x="${((data.inflowDaysCount / totalDays) * 498).toFixed(1)}" y="0" width="${((data.outflowDaysCount / totalDays) * 498).toFixed(1)}" height="12" rx="4" fill="${RED}" />
      </g>
      <text x="24" y="132" fill="${GREEN}" font-size="11" font-weight="700">▲ ${Math.round((data.inflowDaysCount / totalDays) * 100)}% ${esc(ar ? 'شراء' : 'Inflow')} (${data.inflowDaysCount}D)</text>
      <text x="522" y="132" fill="${RED}" font-size="11" font-weight="700" text-anchor="end">▼ ${Math.round((data.outflowDaysCount / totalDays) * 100)}% ${esc(ar ? 'بيع' : 'Outflow')} (${data.outflowDaysCount}D)</text>
    </g>

    <g transform="translate(42, 348)">
      <rect width="1116" height="254" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="1092" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">مسار الأموال الساخنة اليومي والتراكمي (أجانب + عرب · آخر ٣٠ جلسة)</text>
             <rect x="24" y="17" width="11" height="11" rx="2.5" fill="${GREEN}" />
             <text x="40" y="27" fill="${SOFT}" font-size="11.5" font-weight="700">شراء يومي</text>
             <rect x="122" y="17" width="11" height="11" rx="2.5" fill="${RED}" />
             <text x="138" y="27" fill="${SOFT}" font-size="11.5" font-weight="700">بيع يومي</text>
             <line x1="216" y1="22" x2="240" y2="22" stroke="${CYAN}" stroke-width="2.5" />
             <circle cx="228" cy="22" r="3" fill="${CYAN}" />
             <text x="248" y="27" fill="${CYAN}" font-size="11.5" font-weight="700">المسار التراكمي</text>`
          : `<text x="24" y="28" fill="#ffffff" font-size="14" font-weight="700">30-Session Daily Hot Money Net Bars &amp; Cumulative Flow Trajectory</text>
             <rect x="700" y="17" width="11" height="11" rx="2.5" fill="${GREEN}" />
             <text x="716" y="27" fill="${SOFT}" font-size="11" font-weight="600">Daily Inflow</text>
             <rect x="805" y="17" width="11" height="11" rx="2.5" fill="${RED}" />
             <text x="821" y="27" fill="${SOFT}" font-size="11" font-weight="600">Daily Outflow</text>
             <line x1="918" y1="22" x2="942" y2="22" stroke="${CYAN}" stroke-width="2.5" />
             <circle cx="930" cy="22" r="3" fill="${CYAN}" />
             <text x="950" y="27" fill="${CYAN}" font-size="11" font-weight="700">Cumulative Curve</text>`
      }

      <line x1="${plotX}" y1="${plotTop + 14}" x2="${plotX + plotW}" y2="${plotTop + 14}" stroke="${GRID}" stroke-width="1" />
      <line x1="${plotX}" y1="${zeroY}" x2="${plotX + plotW}" y2="${zeroY}" stroke="#333338" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="${plotX}" y1="${plotTop + plotH}" x2="${plotX + plotW}" y2="${plotTop + plotH}" stroke="${GRID}" stroke-width="1" />

      <text x="${plotX - 10}" y="${plotTop + 18}" fill="${MUTED}" font-size="10.5" text-anchor="end">+${fmtFlowCompact(maxDailyAbs, ar, false)}</text>
      <text x="${plotX - 10}" y="${zeroY + 4}" fill="${SOFT}" font-size="10.5" text-anchor="end">0</text>
      <text x="${plotX - 10}" y="${plotTop + plotH}" fill="${MUTED}" font-size="10.5" text-anchor="end">-${fmtFlowCompact(maxDailyAbs, ar, false)}</text>

      ${areaPathStr ? `<path d="${areaPathStr}" fill="url(#hmCumGrad)" />` : ''}
      ${barRects}
      ${pts.length > 1 ? `<polyline points="${polylineStr}" fill="none" stroke="${CYAN}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" />` : ''}
      ${
        lastPt
          ? `<circle cx="${lastPt.x.toFixed(1)}" cy="${lastPt.y.toFixed(1)}" r="4.5" fill="${CYAN}" stroke="#000000" stroke-width="2" />
             <rect x="${(plotX + plotW + 8).toFixed(1)}" y="${(lastPt.y - 11).toFixed(1)}" width="76" height="20" rx="5" fill="${CYAN}" fill-opacity="0.16" stroke="${CYAN}" stroke-width="1" />
             <text x="${(plotX + plotW + 46).toFixed(1)}" y="${(lastPt.y + 3).toFixed(1)}" fill="${CYAN}" font-size="10" font-weight="700" text-anchor="middle">${fmtFlowCompact(cum, ar, true)}</text>`
          : ''
      }
      ${xLabels}
    </g>

    ${footerBlock(W, H, ar ? 'محرك تكنال للتحليل الكمي · بيانات تدفقات المستثمرين بالبورصة المصرية' : 'Ticknal Quantitative Flow Engine · Verified EGX Institutional Flow Data', ar)}
  `;

  return toBase64Svg(svgShell(W, H, defs, body, ar));
}

/* ───────────────────────────────────────────────────────────────────────────
 * 2. DAILY TRADE SUMMARY — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateTradeSummaryChartSvg(
  data: TradeSummaryChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = locale === 'ar';
  const isBullish = data.egx30ChangePct >= 0;
  const sentimentColor = isBullish ? GREEN : RED;
  const sentimentBadge = ar
    ? isBullish
      ? 'إغلاق إيجابي للمؤشر الرئيسي'
      : 'ضغوط بيعية على المؤشر'
    : data.sentiment.toUpperCase();

  const history =
    data.history20d && data.history20d.length >= 2
      ? data.history20d
      : [
          {
            date: data.date.slice(5),
            egx30Close: data.egx30Close / (1 + data.egx30ChangePct / 100),
            egx70Close: data.egx70Close / (1 + data.egx70ChangePct / 100),
            egx100Close: data.egx100Close / (1 + data.egx100ChangePct / 100),
            turnoverBillion: data.turnoverBillion,
          },
          {
            date: data.date.slice(5),
            egx30Close: data.egx30Close,
            egx70Close: data.egx70Close,
            egx100Close: data.egx100Close,
            turnoverBillion: data.turnoverBillion,
          },
        ];

  const n = history.length;
  const base30 = history[0].egx30Close || 1;
  const base70 = history[0].egx70Close || 1;
  const base100 = history[0].egx100Close || 1;

  const norm30 = history.map((h) => ((h.egx30Close - base30) / base30) * 100);
  const norm70 = history.map((h) => ((h.egx70Close - base70) / base70) * 100);
  const norm100 = history.map((h) => ((h.egx100Close - base100) / base100) * 100);

  const allNorm = [...norm30, ...norm70, ...norm100, 0];
  const minPct = Math.min(...allNorm) - 0.8;
  const maxPct = Math.max(...allNorm) + 0.8;
  const spanPct = Math.max(1, maxPct - minPct);

  const defs = `
    <linearGradient id="ts30Grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${CYAN}" stop-opacity="0.26" />
      <stop offset="100%" stop-color="${CYAN}" stop-opacity="0.0" />
    </linearGradient>`;

  if (isSquare) {
    // 1:1 SQUARE MOBILE LAYOUT (1080 x 1080)
    const sqCard = (x: number, tag: string, accent: string, close: number, chg: number, low?: number, high?: number) => {
      const c = chg >= 0 ? GREEN : RED;
      const lo = low && low > 0 ? low : close * 0.99;
      const hi = high && high > lo ? high : close * 1.01;
      const pos = Math.min(1, Math.max(0, (close - lo) / Math.max(0.01, hi - lo)));
      const barW = 276;
      const dotX = 20 + pos * barW;
      return `
      <g transform="translate(${x}, 156)">
        <rect width="318" height="190" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        <circle cx="26" cy="30" r="5.5" fill="${accent}" />
        <text x="40" y="35" fill="#ffffff" font-size="16" font-weight="700">${esc(tag)}</text>
        <rect x="208" y="16" width="92" height="30" rx="7" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="1.2" />
        <text x="254" y="36" fill="${c}" font-size="14" font-weight="700" text-anchor="middle">${sign(chg)}${chg.toFixed(2)}%</text>
        <text x="20" y="92" fill="#ffffff" font-size="34" font-weight="700">${fmt1(close)}</text>
        <text x="20" y="136" fill="${MUTED}" font-size="11.5" font-weight="600">L: ${fmt1(lo)}</text>
        <text x="296" y="136" fill="${MUTED}" font-size="11.5" font-weight="600" text-anchor="end">H: ${fmt1(hi)}</text>
        <line x1="20" y1="154" x2="${20 + barW}" y2="154" stroke="#27272a" stroke-width="7" stroke-linecap="round" />
        <line x1="20" y1="154" x2="${dotX.toFixed(1)}" y2="154" stroke="${c}" stroke-width="7" stroke-linecap="round" />
        <circle cx="${dotX.toFixed(1)}" cy="154" r="6" fill="#ffffff" stroke="${c}" stroke-width="2.5" />
      </g>`;
    };

    const plotX = 68;
    const plotW = 848;
    const plotTop = 68;
    const plotH = 310;
    const toX = (i: number) => plotX + (i / Math.max(1, n - 1)) * plotW;
    const toY = (v: number) => plotTop + ((maxPct - v) / spanPct) * plotH;
    const zeroY = toY(0);
    const buildCurve = (arr: number[]) => arr.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
    const area30 = `M ${toX(0).toFixed(1)} ${(plotTop + plotH).toFixed(1)} L ${norm30
      .map((v, i) => `${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
      .join(' L ')} L ${toX(n - 1).toFixed(1)} ${(plotTop + plotH).toFixed(1)} Z`;

    const volTop = 445;
    const volH = 140;
    const maxVol = Math.max(1, ...history.map((h) => h.turnoverBillion));
    const avgVol = history.reduce((acc, h) => acc + h.turnoverBillion, 0) / n;
    const avgVolY = volTop + volH - (avgVol / maxVol) * (volH - 18);
    const vStep = plotW / n;
    const vBarW = Math.max(10, vStep * 0.62);
    const volBars = history
      .map((h, i) => {
        const bh = Math.max(5, (h.turnoverBillion / maxVol) * (volH - 18));
        const bx = plotX + i * vStep + (vStep - vBarW) / 2;
        const by = volTop + volH - bh;
        const isLast = i === n - 1;
        return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${vBarW.toFixed(1)}" height="${bh.toFixed(1)}" rx="3" fill="${isLast ? CYAN : '#3f3f46'}" fill-opacity="${isLast ? '0.9' : '0.65'}" />`;
      })
      .join('');

    const dateTicks = history
      .filter((_, i) => i === 0 || i === Math.floor(n / 3) || i === Math.floor((2 * n) / 3) || i === n - 1)
      .map((h, idx, arr) => {
        const origIdx = history.indexOf(h);
        const anchor = idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle';
        return `<text x="${toX(origIdx).toFixed(1)}" y="${volTop + volH + 24}" fill="${MUTED}" font-size="12.5" font-weight="600" text-anchor="${anchor}">${esc(h.date)}</text>`;
      })
      .join('');

    const endY30 = toY(norm30[n - 1]);
    const sqBody = `
      ${headerBlock(
        W,
        ar ? 'حصاد الجلسة: كيف أغلقت مؤشرات البورصة المصرية اليوم؟' : 'EGX Benchmark Performance & Volume',
        ar ? 'أين استقرت مؤشرات البورصة اليوم وكم بلغت قيمة التداولات المنفذة؟' : '20-session relative index trajectories, intraday ranges & turnover',
        data.date,
        ar ? 'حصاد الجلسة' : 'Daily Trade Summary',
        sentimentBadge,
        sentimentColor,
        ar
      )}
      ${sqCard(ar ? 720 : 42, 'EGX 30', CYAN, data.egx30Close, data.egx30ChangePct, data.egx30Low, data.egx30High)}
      ${sqCard(381, 'EGX 70', GREEN, data.egx70Close, data.egx70ChangePct, data.egx70Low, data.egx70High)}
      ${sqCard(ar ? 42 : 720, 'EGX 100', AMBER, data.egx100Close, data.egx100ChangePct, data.egx100Low, data.egx100High)}

      <g transform="translate(42, 366)">
        <rect width="996" height="642" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="970" y="38" fill="#ffffff" font-size="16" font-weight="700" text-anchor="end">الأداء النسبي للمؤشرات (آخر ٢٠ جلسة · %)</text>
               <circle cx="32" cy="32" r="5" fill="${CYAN}" /><text x="44" y="36" fill="#ffffff" font-size="12.5" font-weight="700">EGX 30</text>
               <circle cx="126" cy="32" r="5" fill="${GREEN}" /><text x="138" y="36" fill="#ffffff" font-size="12.5" font-weight="700">EGX 70</text>
               <circle cx="220" cy="32" r="5" fill="${AMBER}" /><text x="232" y="36" fill="#ffffff" font-size="12.5" font-weight="700">EGX 100</text>`
            : `<text x="26" y="38" fill="#ffffff" font-size="16" font-weight="700">20-Session Relative Index Performance (%)</text>
               <circle cx="670" cy="32" r="5" fill="${CYAN}" /><text x="682" y="36" fill="#ffffff" font-size="12.5" font-weight="700">EGX 30</text>
               <circle cx="765" cy="32" r="5" fill="${GREEN}" /><text x="777" y="36" fill="#ffffff" font-size="12.5" font-weight="700">EGX 70</text>
               <circle cx="860" cy="32" r="5" fill="${AMBER}" /><text x="872" y="36" fill="#ffffff" font-size="12.5" font-weight="700">EGX 100</text>`
        }

        <line x1="${plotX}" y1="${plotTop}" x2="${plotX + plotW}" y2="${plotTop}" stroke="${GRID}" stroke-width="1" />
        <line x1="${plotX}" y1="${zeroY.toFixed(1)}" x2="${plotX + plotW}" y2="${zeroY.toFixed(1)}" stroke="#333338" stroke-width="1" stroke-dasharray="4 4" />
        <line x1="${plotX}" y1="${plotTop + plotH}" x2="${plotX + plotW}" y2="${plotTop + plotH}" stroke="${GRID}" stroke-width="1" />

        <text x="${plotX - 10}" y="${plotTop + 12}" fill="${MUTED}" font-size="11.5" text-anchor="end">${sign(maxPct)}${maxPct.toFixed(1)}%</text>
        <text x="${plotX - 10}" y="${(zeroY + 4).toFixed(1)}" fill="${SOFT}" font-size="11.5" text-anchor="end">0.0%</text>
        <text x="${plotX - 10}" y="${plotTop + plotH}" fill="${MUTED}" font-size="11.5" text-anchor="end">${sign(minPct)}${minPct.toFixed(1)}%</text>

        <path d="${area30}" fill="url(#ts30Grad)" />
        <polyline points="${buildCurve(norm100)}" fill="none" stroke="${AMBER}" stroke-width="2.5" stroke-dasharray="5 4" stroke-linejoin="round" />
        <polyline points="${buildCurve(norm70)}" fill="none" stroke="${GREEN}" stroke-width="2.8" stroke-linejoin="round" />
        <polyline points="${buildCurve(norm30)}" fill="none" stroke="${CYAN}" stroke-width="3.5" stroke-linejoin="round" />

        <circle cx="${toX(n - 1).toFixed(1)}" cy="${endY30.toFixed(1)}" r="5" fill="${CYAN}" />
        <text x="${(toX(n - 1) + 10).toFixed(1)}" y="${(endY30 + 4).toFixed(1)}" fill="${CYAN}" font-size="12" font-weight="700">${sign(norm30[n - 1])}${norm30[n - 1].toFixed(1)}%</text>

        <line x1="26" y1="406" x2="970" y2="406" stroke="${LINE}" stroke-width="1" />
        ${
          ar
            ? `<text x="970" y="432" fill="${SOFT}" font-size="14" font-weight="700" text-anchor="end">قيم التداول اليومية (مليار جنيه)</text>
               <text x="26" y="432" fill="${CYAN}" font-size="14" font-weight="700" text-anchor="start">اليوم: ${data.turnoverBillion.toFixed(2)} مليار · المتوسط: ${avgVol.toFixed(2)} مليار</text>`
            : `<text x="26" y="432" fill="${SOFT}" font-size="14" font-weight="700">Session Turnover Profile (Billion EGP)</text>
               <text x="970" y="432" fill="${CYAN}" font-size="14" font-weight="700" text-anchor="end">Today: ${data.turnoverBillion.toFixed(2)}B EGP · 20D Avg: ${avgVol.toFixed(2)}B</text>`
        }

        ${volBars}
        <line x1="${plotX}" y1="${avgVolY.toFixed(1)}" x2="${plotX + plotW}" y2="${avgVolY.toFixed(1)}" stroke="${AMBER}" stroke-width="1.5" stroke-dasharray="4 4" />
        ${dateTicks}
      </g>

      ${footerBlock(W, H, ar ? 'بيانات إغلاق الجلسة الموثقة · محرك تكنال الكمي' : 'Verified EGX End-of-Day Benchmark Data · Ticknal Quantitative Engine', ar)}
    `;
    return toBase64Svg(svgShell(W, H, defs, sqBody, ar));
  }

  // 16:9 WIDE DESKTOP LAYOUT (1200 x 675)
  const plotX = 56;
  const plotW = 596;
  const plotTop = 56;
  const plotH = 216;
  const toX = (i: number) => plotX + (i / Math.max(1, n - 1)) * plotW;
  const toY = (v: number) => plotTop + ((maxPct - v) / spanPct) * plotH;
  const zeroY = toY(0);

  const buildCurve = (arr: number[]) => arr.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(' ');
  const pts30 = buildCurve(norm30);
  const pts70 = buildCurve(norm70);
  const pts100 = buildCurve(norm100);

  const area30 = `M ${toX(0).toFixed(1)} ${(plotTop + plotH).toFixed(1)} L ${norm30
    .map((v, i) => `${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`)
    .join(' L ')} L ${toX(n - 1).toFixed(1)} ${(plotTop + plotH).toFixed(1)} Z`;

  const rawEndY30 = toY(norm30[n - 1]);
  const rawEndY70 = toY(norm70[n - 1]);
  let labelY30 = rawEndY30 + 4;
  let labelY70 = rawEndY70 + 4;
  if (Math.abs(labelY70 - labelY30) < 16) {
    if (labelY30 <= labelY70) {
      labelY30 -= 8;
      labelY70 += 8;
    } else {
      labelY70 -= 8;
      labelY30 += 8;
    }
  }

  const volTop = 316;
  const volH = 92;
  const maxVol = Math.max(1, ...history.map((h) => h.turnoverBillion));
  const avgVol = history.reduce((acc, h) => acc + h.turnoverBillion, 0) / n;
  const avgVolY = volTop + volH - (avgVol / maxVol) * (volH - 14);
  const vStep = plotW / n;
  const vBarW = Math.max(8, vStep * 0.62);

  const volBars = history
    .map((h, i) => {
      const bh = Math.max(4, (h.turnoverBillion / maxVol) * (volH - 14));
      const bx = plotX + i * vStep + (vStep - vBarW) / 2;
      const by = volTop + volH - bh;
      const isLast = i === n - 1;
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${vBarW.toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${isLast ? CYAN : '#3f3f46'}" fill-opacity="${isLast ? '0.9' : '0.6'}" />`;
    })
    .join('');

  const dateTicks = history
    .filter((_, i) => i === 0 || i === Math.floor(n / 3) || i === Math.floor((2 * n) / 3) || i === n - 1)
    .map((h, idx, arr) => {
      const origIdx = history.indexOf(h);
      const x = toX(origIdx);
      const anchor = idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle';
      return `<text x="${x.toFixed(1)}" y="${volTop + volH + 18}" fill="${MUTED}" font-size="11" font-weight="500" text-anchor="${anchor}">${esc(h.date)}</text>`;
    })
    .join('');

  const indexKpiCard = (
    y: number,
    tag: string,
    accent: string,
    subtitle: string,
    close: number,
    chg: number,
    low?: number,
    high?: number
  ) => {
    const c = chg >= 0 ? GREEN : RED;
    const lo = low && low > 0 ? low : close * 0.99;
    const hi = high && high > lo ? high : close * 1.01;
    const pos = Math.min(1, Math.max(0, (close - lo) / Math.max(0.01, hi - lo)));
    const barW = 324;
    const dotX = 20 + pos * barW;

    return `
    <g transform="translate(790, ${y})">
      <rect width="368" height="140" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <circle cx="26" cy="28" r="5" fill="${accent}" />
      <text x="38" y="33" fill="#ffffff" font-size="15" font-weight="700">${esc(tag)}</text>
      <text x="${ar ? 344 : 116}" y="33" fill="${MUTED}" font-size="12" font-weight="600" text-anchor="${ar ? 'end' : 'start'}">${esc(subtitle)}</text>

      <text x="20" y="76" fill="#ffffff" font-size="30" font-weight="700">${fmt1(close)}</text>
      <rect x="248" y="48" width="100" height="34" rx="8" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="1.2" />
      <text x="298" y="70" fill="${c}" font-size="15.5" font-weight="700" text-anchor="middle">${sign(chg)}${chg.toFixed(2)}%</text>

      <text x="20" y="102" fill="${MUTED}" font-size="10.5" font-weight="600">L: ${fmt1(lo)}</text>
      <text x="182" y="102" fill="${SOFT}" font-size="10.5" font-weight="600" text-anchor="middle">${esc(ar ? 'نطاق الجلسة' : 'Intraday Range')}</text>
      <text x="344" y="102" fill="${MUTED}" font-size="10.5" font-weight="600" text-anchor="end">H: ${fmt1(hi)}</text>
      <line x1="20" y1="116" x2="${20 + barW}" y2="116" stroke="#27272a" stroke-width="6" stroke-linecap="round" />
      <line x1="20" y1="116" x2="${dotX.toFixed(1)}" y2="116" stroke="${c}" stroke-width="6" stroke-linecap="round" />
      <circle cx="${dotX.toFixed(1)}" cy="116" r="5.5" fill="#ffffff" stroke="${c}" stroke-width="2.5" />
    </g>`;
  };

  const body = `
    ${headerBlock(
      W,
      ar ? 'حصاد الجلسة: كيف أغلقت مؤشرات البورصة المصرية اليوم؟' : 'EGX Benchmark Performance & Volume Profile',
      ar ? 'أين استقرت مؤشرات البورصة اليوم وكم بلغت قيمة التداولات المنفذة؟' : '20-session relative index trajectories, intraday price ranges & institutional turnover',
      data.date,
      ar ? 'حصاد الجلسة' : 'Daily Trade Summary',
      sentimentBadge,
      sentimentColor,
      ar
    )}

    <g transform="translate(42, 154)">
      <rect width="732" height="448" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="708" y="30" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">الأداء النسبي للمؤشرات (آخر ٢٠ جلسة · %)</text>
             <circle cx="30" cy="25" r="4.5" fill="${CYAN}" /><text x="40" y="29" fill="#ffffff" font-size="11.5" font-weight="700">EGX 30</text>
             <circle cx="110" cy="25" r="4.5" fill="${GREEN}" /><text x="120" y="29" fill="#ffffff" font-size="11.5" font-weight="700">EGX 70</text>
             <circle cx="190" cy="25" r="4.5" fill="${AMBER}" /><text x="200" y="29" fill="#ffffff" font-size="11.5" font-weight="700">EGX 100</text>`
          : `<text x="24" y="30" fill="#ffffff" font-size="14" font-weight="700">20-Session Relative Index Performance (%)</text>
             <circle cx="458" cy="25" r="4.5" fill="${CYAN}" /><text x="468" y="29" fill="#ffffff" font-size="11.5" font-weight="700">EGX 30</text>
             <circle cx="538" cy="25" r="4.5" fill="${GREEN}" /><text x="548" y="29" fill="#ffffff" font-size="11.5" font-weight="700">EGX 70</text>
             <circle cx="618" cy="25" r="4.5" fill="${AMBER}" /><text x="628" y="29" fill="#ffffff" font-size="11.5" font-weight="700">EGX 100</text>`
      }

      <line x1="${plotX}" y1="${plotTop}" x2="${plotX + plotW}" y2="${plotTop}" stroke="${GRID}" stroke-width="1" />
      <line x1="${plotX}" y1="${zeroY.toFixed(1)}" x2="${plotX + plotW}" y2="${zeroY.toFixed(1)}" stroke="#333338" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="${plotX}" y1="${plotTop + plotH}" x2="${plotX + plotW}" y2="${plotTop + plotH}" stroke="${GRID}" stroke-width="1" />

      <text x="${plotX - 8}" y="${plotTop + 10}" fill="${MUTED}" font-size="10.5" text-anchor="end">${sign(maxPct)}${maxPct.toFixed(1)}%</text>
      <text x="${plotX - 8}" y="${(zeroY + 4).toFixed(1)}" fill="${SOFT}" font-size="10.5" text-anchor="end">0.0%</text>
      <text x="${plotX - 8}" y="${plotTop + plotH}" fill="${MUTED}" font-size="10.5" text-anchor="end">${sign(minPct)}${minPct.toFixed(1)}%</text>

      <path d="${area30}" fill="url(#ts30Grad)" />
      <polyline points="${pts100}" fill="none" stroke="${AMBER}" stroke-width="2" stroke-dasharray="4 3" stroke-linejoin="round" stroke-linecap="round" />
      <polyline points="${pts70}" fill="none" stroke="${GREEN}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round" />
      <polyline points="${pts30}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />

      <circle cx="${toX(n - 1).toFixed(1)}" cy="${rawEndY30.toFixed(1)}" r="4.5" fill="${CYAN}" />
      <text x="${(toX(n - 1) + 8).toFixed(1)}" y="${labelY30.toFixed(1)}" fill="${CYAN}" font-size="11" font-weight="700">${sign(norm30[n - 1])}${norm30[n - 1].toFixed(1)}%</text>

      <circle cx="${toX(n - 1).toFixed(1)}" cy="${rawEndY70.toFixed(1)}" r="4" fill="${GREEN}" />
      <text x="${(toX(n - 1) + 8).toFixed(1)}" y="${labelY70.toFixed(1)}" fill="${GREEN}" font-size="11" font-weight="700">${sign(norm70[n - 1])}${norm70[n - 1].toFixed(1)}%</text>

      <line x1="24" y1="290" x2="708" y2="290" stroke="${LINE}" stroke-width="1" />
      ${
        ar
          ? `<text x="708" y="310" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="end">قيم التداول اليومية (مليار جنيه)</text>
             <text x="24" y="310" fill="${CYAN}" font-size="12" font-weight="700" text-anchor="start">اليوم: ${data.turnoverBillion.toFixed(2)} مليار · المتوسط: ${avgVol.toFixed(2)} مليار</text>`
          : `<text x="24" y="310" fill="${SOFT}" font-size="12" font-weight="700">Session Turnover Profile (Billion EGP)</text>
             <text x="708" y="310" fill="${CYAN}" font-size="12" font-weight="700" text-anchor="end">Today: ${data.turnoverBillion.toFixed(2)}B EGP · 20D Avg: ${avgVol.toFixed(2)}B</text>`
      }

      ${volBars}
      <line x1="${plotX}" y1="${avgVolY.toFixed(1)}" x2="${plotX + plotW}" y2="${avgVolY.toFixed(1)}" stroke="${AMBER}" stroke-width="1.2" stroke-dasharray="4 4" />
      ${dateTicks}
    </g>

    ${indexKpiCard(154, 'EGX 30', CYAN, ar ? 'الأسهم القيادية' : 'Blue-Chip Index', data.egx30Close, data.egx30ChangePct, data.egx30Low, data.egx30High)}
    ${indexKpiCard(308, 'EGX 70', GREEN, ar ? 'متساوي الأوزان' : 'Equal Weight (SME)', data.egx70Close, data.egx70ChangePct, data.egx70Low, data.egx70High)}
    ${indexKpiCard(462, 'EGX 100', AMBER, ar ? 'السوق الأوسع' : 'Broad Market EWI', data.egx100Close, data.egx100ChangePct, data.egx100Low, data.egx100High)}

    ${footerBlock(W, H, ar ? 'بيانات إغلاق الجلسة الموثقة · محرك تكنال الكمي' : 'Verified EGX End-of-Day Benchmark Data · Ticknal Quantitative Engine', ar)}
  `;

  return toBase64Svg(svgShell(W, H, defs, body, ar));
}

/* ───────────────────────────────────────────────────────────────────────────
 * 3. MARKET BREADTH — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateMarketBreadthChartSvg(
  data: MarketBreadthChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = locale === 'ar';
  const flatPct = Math.max(0, Number((100 - data.advancersPct - data.declinersPct).toFixed(1)));
  const ratioNum = data.advancers / Math.max(1, data.decliners);
  const ratioStr = ratioNum.toFixed(2);
  const bullish = data.advancers >= data.decliners;
  const statusColor = bullish ? GREEN : RED;
  const statusBadge = bullish
    ? ar ? `اتساع إيجابي (${ratioStr}x)` : `BROAD ACCUMULATION (${ratioStr}x A/D)`
    : ar ? `ضغوط بيعية (${ratioStr}x)` : `NEGATIVE BREADTH (${ratioStr}x A/D)`;

  const R = 84;
  const C = Math.PI * R;
  const advLen = (data.advancersPct / 100) * C;
  const decLen = (data.declinersPct / 100) * C;
  const flatLen = Math.max(0, C - advLen - decLen);

  const sectors = (data.sectorBreakdown || []).slice(0, 6);

  const hist =
    data.history10d && data.history10d.length >= 2
      ? data.history10d
      : [{ date: data.date.slice(5), advancers: data.advancers, decliners: data.decliners, flat: data.flat, total: data.totalStocks }];

  const hn = hist.length;
  const ratios = hist.map((h) => h.advancers / Math.max(1, h.decliners));
  const maxRatio = Math.max(2.0, ...ratios);

  if (isSquare) {
    // 1:1 SQUARE MOBILE LAYOUT (1080 x 1080)
    const sqSectorRows =
      sectors.length > 0
        ? sectors
            .map((s, idx) => {
              const y = 52 + idx * 34;
              const tot = Math.max(1, s.total);
              const barFullW = 212;
              const aw = (s.advancers / tot) * barFullW;
              const dw = (s.decliners / tot) * barFullW;
              const fw = Math.max(0, barFullW - aw - dw);
              const scid = `sq-sec-${idx}`;
              const secLabel = localizeSectorName(s.sector, ar);
              if (ar) {
                return `
                <clipPath id="${scid}"><rect x="352" y="${y - 4}" width="142" height="24" /></clipPath>
                <text x="490" y="${y + 13}" fill="${SOFT}" font-size="12.5" font-weight="700" text-anchor="end" clip-path="url(#${scid})">${esc(secLabel.length > 18 ? secLabel.slice(0, 17) + '…' : secLabel)}</text>
                <g transform="translate(132, ${y})">
                  <rect width="${barFullW}" height="15" rx="4" fill="#18181b" />
                  <rect x="0" y="0" width="${aw.toFixed(1)}" height="15" rx="3" fill="${GREEN}" />
                  <rect x="${aw.toFixed(1)}" y="0" width="${fw.toFixed(1)}" height="15" fill="#52525b" />
                  <rect x="${(aw + fw).toFixed(1)}" y="0" width="${dw.toFixed(1)}" height="15" rx="3" fill="${RED}" />
                </g>
                <text x="20" y="${y + 13}" fill="${MUTED}" font-size="11">(${s.total})</text>
                <text x="56" y="${y + 13}" fill="${RED}" font-size="11.5" font-weight="700">${s.decliners}▼</text>
                <text x="96" y="${y + 13}" fill="${GREEN}" font-size="11.5" font-weight="700">${s.advancers}▲</text>`;
              }
              return `
              <clipPath id="${scid}"><rect x="18" y="${y - 4}" width="132" height="24" /></clipPath>
              <text x="20" y="${y + 13}" fill="${SOFT}" font-size="12" font-weight="600" clip-path="url(#${scid})">${esc(secLabel.length > 15 ? secLabel.slice(0, 14) + '…' : secLabel)}</text>
              <g transform="translate(156, ${y})">
                <rect width="${barFullW}" height="15" rx="4" fill="#18181b" />
                <rect x="0" y="0" width="${aw.toFixed(1)}" height="15" rx="3" fill="${GREEN}" />
                <rect x="${aw.toFixed(1)}" y="0" width="${fw.toFixed(1)}" height="15" fill="#52525b" />
                <rect x="${(aw + fw).toFixed(1)}" y="0" width="${dw.toFixed(1)}" height="15" rx="3" fill="${RED}" />
              </g>
              <text x="382" y="${y + 13}" fill="${GREEN}" font-size="11.5" font-weight="700">${s.advancers}▲</text>
              <text x="428" y="${y + 13}" fill="${RED}" font-size="11.5" font-weight="700">${s.decliners}▼</text>
              <text x="492" y="${y + 13}" fill="${MUTED}" font-size="11" text-anchor="end">(${s.total})</text>`;
            })
            .join('')
        : `<text x="255" y="140" fill="${MUTED}" font-size="13" font-weight="600" text-anchor="middle">${esc(ar ? 'لا تتوفر تفاصيل للقطاعات لهذه الجلسة' : 'Sector breakdown unavailable for this session')}</text>`;

    const hPlotX = 68;
    const hPlotW = 868;
    const hPlotTop = 76;
    const hPlotH = 350;
    const hStep = hn > 0 ? hPlotW / hn : hPlotW;
    const hBarW = Math.max(22, Math.min(54, hStep * 0.56));

    const histBars = hist
      .map((h, i) => {
        const tot = Math.max(1, h.total);
        const ah = (h.advancers / tot) * hPlotH;
        const fh = (h.flat / tot) * hPlotH;
        const dh = Math.max(0, hPlotH - ah - fh);
        const bx = hPlotX + i * hStep + (hStep - hBarW) / 2;
        return `
        <g>
          <rect x="${bx.toFixed(1)}" y="${hPlotTop.toFixed(1)}" width="${hBarW.toFixed(1)}" height="${dh.toFixed(1)}" rx="3" fill="${RED}" fill-opacity="0.72" />
          <rect x="${bx.toFixed(1)}" y="${(hPlotTop + dh).toFixed(1)}" width="${hBarW.toFixed(1)}" height="${fh.toFixed(1)}" fill="#52525b" fill-opacity="0.7" />
          <rect x="${bx.toFixed(1)}" y="${(hPlotTop + dh + fh).toFixed(1)}" width="${hBarW.toFixed(1)}" height="${ah.toFixed(1)}" rx="3" fill="${GREEN}" fill-opacity="0.82" />
          <text x="${(bx + hBarW / 2).toFixed(1)}" y="${hPlotTop + hPlotH + 26}" fill="${MUTED}" font-size="12.5" font-weight="600" text-anchor="middle">${esc(h.date)}</text>
        </g>`;
      })
      .join('');

    const ratioPts = hist.map((h, i) => {
      const r = h.advancers / Math.max(1, h.decliners);
      const x = hPlotX + i * hStep + hStep / 2;
      const y = hPlotTop + hPlotH - Math.min(1, r / maxRatio) * (hPlotH - 22);
      return { x, y, r };
    });
    const ratioLine = ratioPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const sqBody = `
      ${headerBlock(
        W,
        ar ? 'ميزان الجلسة: حركة الأسهم الصاعدة والهابطة' : 'EGX Market Breadth & Sector Participation',
        ar ? 'توزيع الأسهم الصاعدة والهابطة في الجلسة ونشاط القطاعات' : `Verified participation across ${data.totalStocks} traded EGX listed equities (excl. funds)`,
        data.date,
        ar ? 'ميزان الجلسة' : 'Market Breadth',
        statusBadge,
        statusColor,
        ar
      )}

      <!-- Top Left Gauge Card (468 x 268) -->
      <g transform="translate(42, 156)">
        <rect width="468" height="268" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="446" y="32" fill="#ffffff" font-size="15.5" font-weight="700" text-anchor="end">ميزان الصعود والهبوط</text>
               <text x="22" y="32" fill="${CYAN}" font-size="13.5" font-weight="700" text-anchor="start">${data.totalStocks} سهم مقيد</text>`
            : `<text x="22" y="32" fill="#ffffff" font-size="15.5" font-weight="700">Session Breadth Gauge</text>
               <text x="446" y="32" fill="${CYAN}" font-size="13.5" font-weight="700" text-anchor="end">${data.totalStocks} Listed Equities</text>`
        }

        <g transform="translate(132, 172)">
          <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="#18181b" stroke-width="22" />
          <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="${GREEN}" stroke-width="22" stroke-dasharray="${advLen.toFixed(1)} ${C.toFixed(1)}" />
          <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="#71717a" stroke-width="22" stroke-dasharray="${flatLen.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="-${advLen.toFixed(1)}" />
          <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="${RED}" stroke-width="22" stroke-dasharray="${decLen.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="-${(advLen + flatLen).toFixed(1)}" />
          <text x="0" y="-20" fill="${statusColor}" font-size="30" font-weight="700" text-anchor="middle">${ratioStr}x</text>
          <text x="0" y="2" fill="${MUTED}" font-size="11.5" font-weight="600" text-anchor="middle">${esc(ar ? 'معدل A/D' : 'A/D Ratio')}</text>
        </g>

        <g transform="translate(264, 56)">
          <rect width="182" height="54" rx="10" fill="${GREEN}" fill-opacity="0.08" stroke="${GREEN}" stroke-opacity="0.4" />
          <text x="${ar ? 168 : 14}" y="22" fill="${GREEN}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${esc(ar ? 'رابحة' : 'ADVANCERS')}</text>
          <text x="14" y="44" fill="#ffffff" font-size="21" font-weight="700">${data.advancers}</text>
          <text x="168" y="44" fill="${GREEN}" font-size="15.5" font-weight="700" text-anchor="end">${data.advancersPct}%</text>

          <g transform="translate(0, 66)">
            <rect width="182" height="54" rx="10" fill="${RED}" fill-opacity="0.08" stroke="${RED}" stroke-opacity="0.4" />
            <text x="${ar ? 168 : 14}" y="22" fill="${RED}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▼ ${esc(ar ? 'خاسرة' : 'DECLINERS')}</text>
            <text x="14" y="44" fill="#ffffff" font-size="21" font-weight="700">${data.decliners}</text>
            <text x="168" y="44" fill="${RED}" font-size="15.5" font-weight="700" text-anchor="end">${data.declinersPct}%</text>
          </g>

          <g transform="translate(0, 132)">
            <rect width="182" height="54" rx="10" fill="#18181b" stroke="#333338" />
            <text x="${ar ? 168 : 14}" y="22" fill="${SOFT}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">● ${esc(ar ? 'دون تغيير' : 'UNCHANGED')}</text>
            <text x="14" y="44" fill="#ffffff" font-size="21" font-weight="700">${data.flat}</text>
            <text x="168" y="44" fill="${SOFT}" font-size="15.5" font-weight="700" text-anchor="end">${flatPct}%</text>
          </g>
        </g>

        <text x="22" y="220" fill="${MUTED}" font-size="12" font-weight="600">${esc(ar ? 'السيولة:' : 'Turnover:')}</text>
        <text x="22" y="244" fill="${CYAN}" font-size="19" font-weight="700">${data.turnoverBillion.toFixed(2)}B EGP</text>
      </g>

      <!-- Top Right Sector Card (510 x 268) -->
      <g transform="translate(528, 156)">
        <rect width="510" height="268" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        <text x="${ar ? 490 : 20}" y="32" fill="#ffffff" font-size="15.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'اتساع القطاعات القيادية' : 'Sector Breadth Breakdown')}</text>
        ${sqSectorRows}
      </g>

      <!-- Bottom Large 10-Session Breadth Stack + A/D Ratio Chart (996 x 566) -->
      <g transform="translate(42, 442)">
        <rect width="996" height="566" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="970" y="38" fill="#ffffff" font-size="16.5" font-weight="700" text-anchor="end">ميزان الجلسات السابقة (آخر ١٠ جلسات)</text>
               <rect x="26" y="24" width="12" height="12" rx="2.5" fill="${GREEN}" /><text x="44" y="35" fill="${SOFT}" font-size="12" font-weight="700">صاعدة %</text>
               <rect x="128" y="24" width="12" height="12" rx="2.5" fill="${RED}" /><text x="146" y="35" fill="${SOFT}" font-size="12" font-weight="700">هابطة %</text>
               <line x1="226" y1="30" x2="253" y2="30" stroke="${CYAN}" stroke-width="3" /><text x="261" y="35" fill="${CYAN}" font-size="12" font-weight="700">معدل A/D</text>`
            : `<text x="26" y="38" fill="#ffffff" font-size="16.5" font-weight="700">10-Session Market Participation Stack &amp; A/D Ratio Trend</text>
               <rect x="610" y="24" width="12" height="12" rx="2.5" fill="${GREEN}" /><text x="628" y="35" fill="${SOFT}" font-size="12" font-weight="600">Advancers %</text>
               <rect x="720" y="24" width="12" height="12" rx="2.5" fill="${RED}" /><text x="738" y="35" fill="${SOFT}" font-size="12" font-weight="600">Decliners %</text>
               <line x1="825" y1="30" x2="852" y2="30" stroke="${CYAN}" stroke-width="3" /><text x="860" y="35" fill="${CYAN}" font-size="12" font-weight="700">A/D Ratio</text>`
        }

        <line x1="${hPlotX}" y1="${hPlotTop}" x2="${hPlotX + hPlotW}" y2="${hPlotTop}" stroke="${GRID}" stroke-width="1" />
        <line x1="${hPlotX}" y1="${hPlotTop + hPlotH / 2}" x2="${hPlotX + hPlotW}" y2="${hPlotTop + hPlotH / 2}" stroke="#27272a" stroke-width="1" stroke-dasharray="4 4" />
        <line x1="${hPlotX}" y1="${hPlotTop + hPlotH}" x2="${hPlotX + hPlotW}" y2="${hPlotTop + hPlotH}" stroke="${GRID}" stroke-width="1" />

        <text x="${hPlotX - 10}" y="${hPlotTop + 12}" fill="${MUTED}" font-size="11.5" text-anchor="end">100%</text>
        <text x="${hPlotX - 10}" y="${hPlotTop + hPlotH / 2 + 4}" fill="${SOFT}" font-size="11.5" text-anchor="end">50%</text>
        <text x="${hPlotX - 10}" y="${hPlotTop + hPlotH}" fill="${MUTED}" font-size="11.5" text-anchor="end">0%</text>

        ${histBars}
        ${ratioPts.length > 1 ? `<polyline points="${ratioLine}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" />` : ''}
        ${ratioPts
          .map(
            (p) =>
              `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4.5" fill="#000000" stroke="${CYAN}" stroke-width="2.5" />
               <rect x="${(p.x - 22).toFixed(1)}" y="${(p.y - 24).toFixed(1)}" width="44" height="17" rx="4" fill="#000000" fill-opacity="0.82" stroke="#27272a" stroke-width="1" />
               <text x="${p.x.toFixed(1)}" y="${(p.y - 12).toFixed(1)}" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">${p.r.toFixed(2)}x</text>`
          )
          .join('')}
      </g>

      ${footerBlock(W, H, ar ? 'إحصاءات الأسهم المتداولة الفعلية بالبورصة المصرية (باستثناء الصناديق)' : 'Verified EGX Active Listed Equity Breadth (Excludes 169 Mutual Funds)', ar)}
    `;
    return toBase64Svg(svgShell(W, H, '', sqBody, ar));
  }

  // 16:9 WIDE DESKTOP LAYOUT (1200 x 675)
  const sectorRows =
    sectors.length > 0
      ? sectors
          .map((s, idx) => {
            const y = 46 + idx * 28;
            const tot = Math.max(1, s.total);
            const barFullW = 312;
            const aw = (s.advancers / tot) * barFullW;
            const dw = (s.decliners / tot) * barFullW;
            const fw = Math.max(0, barFullW - aw - dw);
            const scid = `w-sec-${idx}`;
            const secLabel = localizeSectorName(s.sector, ar);
            if (ar) {
              return `
              <clipPath id="${scid}"><rect x="464" y="${y - 4}" width="146" height="22" /></clipPath>
              <text x="608" y="${y + 12}" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="end" clip-path="url(#${scid})">${esc(secLabel.length > 20 ? secLabel.slice(0, 19) + '…' : secLabel)}</text>
              <g transform="translate(144, ${y})">
                <rect width="${barFullW}" height="13" rx="3.5" fill="#18181b" />
                <rect x="0" y="0" width="${aw.toFixed(1)}" height="13" rx="3" fill="${GREEN}" />
                <rect x="${aw.toFixed(1)}" y="0" width="${fw.toFixed(1)}" height="13" fill="#52525b" />
                <rect x="${(aw + fw).toFixed(1)}" y="0" width="${dw.toFixed(1)}" height="13" rx="3" fill="${RED}" />
              </g>
              <text x="22" y="${y + 12}" fill="${MUTED}" font-size="10.5">(${s.total})</text>
              <text x="58" y="${y + 12}" fill="${RED}" font-size="11" font-weight="700">${s.decliners}▼</text>
              <text x="100" y="${y + 12}" fill="${GREEN}" font-size="11" font-weight="700">${s.advancers}▲</text>`;
            }
            return `
            <clipPath id="${scid}"><rect x="20" y="${y - 4}" width="142" height="22" /></clipPath>
            <text x="22" y="${y + 12}" fill="${SOFT}" font-size="11.5" font-weight="600" clip-path="url(#${scid})">${esc(secLabel.length > 17 ? secLabel.slice(0, 16) + '…' : secLabel)}</text>
            <g transform="translate(168, ${y})">
              <rect width="${barFullW}" height="13" rx="3.5" fill="#18181b" />
              <rect x="0" y="0" width="${aw.toFixed(1)}" height="13" rx="3" fill="${GREEN}" />
              <rect x="${aw.toFixed(1)}" y="0" width="${fw.toFixed(1)}" height="13" fill="#52525b" />
              <rect x="${(aw + fw).toFixed(1)}" y="0" width="${dw.toFixed(1)}" height="13" rx="3" fill="${RED}" />
            </g>
            <text x="496" y="${y + 12}" fill="${GREEN}" font-size="11" font-weight="700">${s.advancers}▲</text>
            <text x="544" y="${y + 12}" fill="${RED}" font-size="11" font-weight="700">${s.decliners}▼</text>
            <text x="606" y="${y + 12}" fill="${MUTED}" font-size="10.5" text-anchor="end">(${s.total})</text>`;
          })
          .join('')
      : `<text x="290" y="110" fill="${MUTED}" font-size="12" font-weight="600" text-anchor="middle">${esc(ar ? 'لا تتوفر تفاصيل للقطاعات لهذه الجلسة' : 'Sector breakdown unavailable for this session')}</text>`;

  const hPlotX = 64;
  const hPlotW = 984;
  const hPlotTop = 48;
  const hPlotH = 122;
  const hStep = hn > 0 ? hPlotW / hn : hPlotW;
  const hBarW = Math.max(18, Math.min(48, hStep * 0.54));

  const histBars = hist
    .map((h, i) => {
      const tot = Math.max(1, h.total);
      const ah = (h.advancers / tot) * hPlotH;
      const fh = (h.flat / tot) * hPlotH;
      const dh = Math.max(0, hPlotH - ah - fh);
      const bx = hPlotX + i * hStep + (hStep - hBarW) / 2;
      return `
      <g>
        <rect x="${bx.toFixed(1)}" y="${hPlotTop.toFixed(1)}" width="${hBarW.toFixed(1)}" height="${dh.toFixed(1)}" rx="3" fill="${RED}" fill-opacity="0.72" />
        <rect x="${bx.toFixed(1)}" y="${(hPlotTop + dh).toFixed(1)}" width="${hBarW.toFixed(1)}" height="${fh.toFixed(1)}" fill="#52525b" fill-opacity="0.7" />
        <rect x="${bx.toFixed(1)}" y="${(hPlotTop + dh + fh).toFixed(1)}" width="${hBarW.toFixed(1)}" height="${ah.toFixed(1)}" rx="3" fill="${GREEN}" fill-opacity="0.82" />
        <text x="${(bx + hBarW / 2).toFixed(1)}" y="${hPlotTop + hPlotH + 18}" fill="${MUTED}" font-size="10.5" font-weight="600" text-anchor="middle">${esc(h.date)}</text>
      </g>`;
    })
    .join('');

  const ratioPts = hist.map((h, i) => {
    const r = h.advancers / Math.max(1, h.decliners);
    const x = hPlotX + i * hStep + hStep / 2;
    const y = hPlotTop + hPlotH - Math.min(1, r / maxRatio) * (hPlotH - 18);
    return { x, y, r };
  });
  const ratioLine = ratioPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const body = `
    ${headerBlock(
      W,
      ar ? 'ميزان الجلسة: حركة الأسهم الصاعدة والهابطة' : 'EGX Market Breadth & Sector Participation',
      ar ? 'توزيع الأسهم الصاعدة والهابطة في الجلسة ونشاط القطاعات' : `Verified participation across ${data.totalStocks} EGX listed equities (excluding mutual funds)`,
      data.date,
      ar ? 'ميزان الجلسة' : 'Market Breadth',
      statusBadge,
      statusColor,
      ar
    )}

    <g transform="translate(42, 154)">
      <rect width="468" height="226" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="446" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">ميزان الصعود والهبوط للجلسة</text>
             <text x="22" y="28" fill="${CYAN}" font-size="12" font-weight="700" text-anchor="start">${data.totalStocks} سهم مقيد</text>`
          : `<text x="22" y="28" fill="#ffffff" font-size="14" font-weight="700">Session Advance / Decline Gauge</text>
             <text x="446" y="28" fill="${CYAN}" font-size="12" font-weight="700" text-anchor="end">${data.totalStocks} Listed Equities</text>`
      }

      <g transform="translate(132, 148)">
        <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="#18181b" stroke-width="20" />
        <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="${GREEN}" stroke-width="20" stroke-dasharray="${advLen.toFixed(1)} ${C.toFixed(1)}" />
        <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="#71717a" stroke-width="20" stroke-dasharray="${flatLen.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="-${advLen.toFixed(1)}" />
        <path d="M -${R} 0 A ${R} ${R} 0 0 1 ${R} 0" fill="none" stroke="${RED}" stroke-width="20" stroke-dasharray="${decLen.toFixed(1)} ${C.toFixed(1)}" stroke-dashoffset="-${(advLen + flatLen).toFixed(1)}" />
        <text x="0" y="-18" fill="${statusColor}" font-size="28" font-weight="700" text-anchor="middle">${ratioStr}x</text>
        <text x="0" y="2" fill="${MUTED}" font-size="11" font-weight="600" text-anchor="middle">${esc(ar ? 'معدل الصعود للهبوط' : 'A/D Ratio')}</text>
      </g>

      <g transform="translate(268, 46)">
        <rect width="178" height="48" rx="9" fill="${GREEN}" fill-opacity="0.08" stroke="${GREEN}" stroke-opacity="0.4" />
        <text x="${ar ? 164 : 14}" y="19" fill="${GREEN}" font-size="11" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${esc(ar ? 'رابحة' : 'ADVANCERS')}</text>
        <text x="14" y="38" fill="#ffffff" font-size="19" font-weight="700">${data.advancers}</text>
        <text x="164" y="38" fill="${GREEN}" font-size="14.5" font-weight="700" text-anchor="end">${data.advancersPct}%</text>

        <g transform="translate(0, 56)">
          <rect width="178" height="48" rx="9" fill="${RED}" fill-opacity="0.08" stroke="${RED}" stroke-opacity="0.4" />
          <text x="${ar ? 164 : 14}" y="19" fill="${RED}" font-size="11" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▼ ${esc(ar ? 'خاسرة' : 'DECLINERS')}</text>
          <text x="14" y="38" fill="#ffffff" font-size="19" font-weight="700">${data.decliners}</text>
          <text x="164" y="38" fill="${RED}" font-size="14.5" font-weight="700" text-anchor="end">${data.declinersPct}%</text>
        </g>

        <g transform="translate(0, 112)">
          <rect width="178" height="48" rx="9" fill="#18181b" stroke="#333338" />
          <text x="${ar ? 164 : 14}" y="19" fill="${SOFT}" font-size="11" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">● ${esc(ar ? 'دون تغيير' : 'UNCHANGED')}</text>
          <text x="14" y="38" fill="#ffffff" font-size="19" font-weight="700">${data.flat}</text>
          <text x="164" y="38" fill="${SOFT}" font-size="14.5" font-weight="700" text-anchor="end">${flatPct}%</text>
        </g>
      </g>

      <text x="22" y="188" fill="${MUTED}" font-size="11" font-weight="600">${esc(ar ? 'إجمالي قيم التداول:' : 'Session Turnover:')}</text>
      <text x="22" y="208" fill="${CYAN}" font-size="17" font-weight="700">${data.turnoverBillion.toFixed(2)}B EGP</text>
    </g>

    <g transform="translate(528, 154)">
      <rect width="630" height="226" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <text x="${ar ? 608 : 22}" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'توزيع الصعود والهبوط حسب القطاعات القيادية' : 'Sector-by-Sector Breadth Breakdown (Top 6 EGX Sectors)')}</text>
      ${sectorRows}
    </g>

    <g transform="translate(42, 396)">
      <rect width="1116" height="206" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="1092" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">ميزان الجلسات السابقة (آخر ١٠ جلسات)</text>
             <rect x="24" y="17" width="11" height="11" rx="2" fill="${GREEN}" /><text x="40" y="27" fill="${SOFT}" font-size="11.5" font-weight="700">صاعدة %</text>
             <rect x="118" y="17" width="11" height="11" rx="2" fill="${RED}" /><text x="134" y="27" fill="${SOFT}" font-size="11.5" font-weight="700">هابطة %</text>
             <line x1="210" y1="22" x2="234" y2="22" stroke="${CYAN}" stroke-width="2.5" /><circle cx="222" cy="22" r="3" fill="${CYAN}" /><text x="242" y="27" fill="${CYAN}" font-size="11.5" font-weight="700">معدل A/D</text>`
          : `<text x="24" y="28" fill="#ffffff" font-size="14" font-weight="700">10-Session Market Participation Stack &amp; Advance/Decline Ratio Trend</text>
             <rect x="700" y="17" width="11" height="11" rx="2" fill="${GREEN}" /><text x="716" y="27" fill="${SOFT}" font-size="11" font-weight="600">Advancers %</text>
             <rect x="800" y="17" width="11" height="11" rx="2" fill="${RED}" /><text x="816" y="27" fill="${SOFT}" font-size="11" font-weight="600">Decliners %</text>
             <line x1="900" y1="22" x2="924" y2="22" stroke="${CYAN}" stroke-width="2.5" /><circle cx="912" cy="22" r="3" fill="${CYAN}" /><text x="932" y="27" fill="${CYAN}" font-size="11" font-weight="700">A/D Ratio Curve</text>`
      }

      <line x1="${hPlotX}" y1="${hPlotTop}" x2="${hPlotX + hPlotW}" y2="${hPlotTop}" stroke="${GRID}" stroke-width="1" />
      <line x1="${hPlotX}" y1="${hPlotTop + hPlotH / 2}" x2="${hPlotX + hPlotW}" y2="${hPlotTop + hPlotH / 2}" stroke="#27272a" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="${hPlotX}" y1="${hPlotTop + hPlotH}" x2="${hPlotX + hPlotW}" y2="${hPlotTop + hPlotH}" stroke="${GRID}" stroke-width="1" />

      <text x="${hPlotX - 10}" y="${hPlotTop + 10}" fill="${MUTED}" font-size="10.5" text-anchor="end">100%</text>
      <text x="${hPlotX - 10}" y="${hPlotTop + hPlotH / 2 + 4}" fill="${SOFT}" font-size="10.5" text-anchor="end">50%</text>
      <text x="${hPlotX - 10}" y="${hPlotTop + hPlotH}" fill="${MUTED}" font-size="10.5" text-anchor="end">0%</text>

      ${histBars}
      ${ratioPts.length > 1 ? `<polyline points="${ratioLine}" fill="none" stroke="${CYAN}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />` : ''}
      ${ratioPts
        .map(
          (p) =>
            `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="#000000" stroke="${CYAN}" stroke-width="2.2" />
             <rect x="${(p.x - 19).toFixed(1)}" y="${(p.y - 21).toFixed(1)}" width="38" height="15" rx="3.5" fill="#000000" fill-opacity="0.82" stroke="#27272a" stroke-width="1" />
             <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" fill="#ffffff" font-size="9.5" font-weight="700" text-anchor="middle">${p.r.toFixed(2)}x</text>`
        )
        .join('')}
    </g>

    ${footerBlock(W, H, ar ? 'إحصاءات الأسهم المتداولة الفعلية بالبورصة المصرية (باستثناء وثائق الصناديق)' : 'Verified EGX Active Listed Equity Breadth (Excludes 169 Mutual Funds & Non-Traded Symbols)', ar)}
  `;

  return toBase64Svg(svgShell(W, H, '', body, ar));
}

/* ───────────────────────────────────────────────────────────────────────────
 * 4. GAINERS & LOSERS — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateGainersLosersChartSvg(
  data: GainersLosersChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = locale === 'ar';
  const gainers = (data.topGainers || []).slice(0, 5);
  const losers = (data.topLosers || []).slice(0, 5);

  const maxAbsPct = Math.max(
    5,
    ...gainers.map((g) => Math.abs(g.changePct)),
    ...losers.map((l) => Math.abs(l.changePct))
  );

  const fmtTurnover = (s: MoverStock) => {
    const t = s.turnover ?? s.close * s.volume;
    if (t >= 1_000_000) return `${(t / 1_000_000).toFixed(1)}M`;
    return `${Math.round(t / 1_000)}K`;
  };

  if (isSquare) {
    // 1:1 SQUARE MOBILE LAYOUT (1080 x 1080)
    const centerAxisX = 498;
    const leftBarEnd = 468;
    const rightBarStart = 528;
    const maxWingW = 280;
    const tornadoRows = Array.from({ length: 5 })
      .map((_, i) => {
        const g = gainers[i];
        const l = losers[i];
        const y = 54 + i * 32;
        const gw = g ? Math.max(8, (Math.abs(g.changePct) / maxAbsPct) * maxWingW) : 0;
        const lw = l ? Math.max(8, (Math.abs(l.changePct) / maxAbsPct) * maxWingW) : 0;
        return `
        <g>
          <rect x="${leftBarEnd - maxWingW}" y="${y + 3}" width="${maxWingW}" height="14" rx="3.5" fill="#141416" />
          <rect x="${rightBarStart}" y="${y + 3}" width="${maxWingW}" height="14" rx="3.5" fill="#141416" />
          ${
            l
              ? `<text x="24" y="${y + 15}" fill="${RED}" font-size="12.5" font-weight="700">${esc(l.ticker)} (${l.changePct.toFixed(2)}%)</text>
                 <rect x="${(leftBarEnd - lw).toFixed(1)}" y="${y + 1}" width="${lw.toFixed(1)}" height="18" rx="4" fill="${RED}" fill-opacity="0.86" />`
              : ''
          }
          <text x="${centerAxisX}" y="${y + 15}" fill="${MUTED}" font-size="12" font-weight="700" text-anchor="middle">#${i + 1}</text>
          ${
            g
              ? `<rect x="${rightBarStart}" y="${y + 1}" width="${gw.toFixed(1)}" height="18" rx="4" fill="${GREEN}" fill-opacity="0.86" />
                 <text x="972" y="${y + 15}" fill="${GREEN}" font-size="12.5" font-weight="700" text-anchor="end">${esc(g.ticker)} (+${g.changePct.toFixed(2)}%)</text>`
              : ''
          }
        </g>`;
      })
      .join('');

    const sqStockCard = (s: MoverStock, idx: number, isGainer: boolean, colX: number) => {
      const color = isGainer ? GREEN : RED;
      const y = 412 + idx * 116;
      const name = s.companyName || s.ticker;
      const shownName = name.length > 21 ? `${name.slice(0, 20)}…` : name;
      const cid = `sq-mv-${isGainer ? 'g' : 'l'}-${idx}`;
      const tcid = `sq-mvt-${isGainer ? 'g' : 'l'}-${idx}`;
      const avatarX = ar ? 442 : 44;
      const avatar = s.logoDataUri
        ? `<circle cx="${avatarX}" cy="50" r="26" fill="#ffffff" />
           <clipPath id="${cid}"><circle cx="${avatarX}" cy="50" r="24" /></clipPath>
           <image href="${s.logoDataUri}" xlink:href="${s.logoDataUri}" x="${avatarX - 24}" y="26" width="48" height="48" preserveAspectRatio="xMidYMid meet" clip-path="url(#${cid})" />
           <circle cx="${avatarX}" cy="50" r="26" fill="none" stroke="${color}" stroke-width="1.8" />`
        : `<circle cx="${avatarX}" cy="50" r="26" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.8" />
           <text x="${avatarX}" y="56" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">${esc(s.ticker.slice(0, 4))}</text>`;

      if (ar) {
        return `
        <g transform="translate(${colX}, ${y})">
          <rect width="486" height="100" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
          ${avatar}
          <clipPath id="${tcid}"><rect x="136" y="10" width="268" height="82" /></clipPath>
          <g clip-path="url(#${tcid})">
            <text x="400" y="38" fill="#ffffff" font-size="14.5" font-weight="700" text-anchor="end">${esc(shownName)}</text>
            <text x="400" y="62" fill="${SOFT}" font-size="13" font-weight="600" text-anchor="end">${esc(s.ticker)} · ${s.close.toFixed(2)} EGP</text>
            <text x="400" y="84" fill="${MUTED}" font-size="12" font-weight="600" text-anchor="end">السيولة: ${fmtTurnover(s)} EGP</text>
          </g>
          <rect x="18" y="28" width="110" height="44" rx="10" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.5" />
          <text x="73" y="56" fill="${color}" font-size="16.5" font-weight="700" text-anchor="middle">${sign(s.changePct)}${s.changePct.toFixed(2)}%</text>
        </g>`;
      }

      return `
      <g transform="translate(${colX}, ${y})">
        <rect width="486" height="100" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${avatar}
        <clipPath id="${tcid}"><rect x="80" y="10" width="268" height="82" /></clipPath>
        <g clip-path="url(#${tcid})">
          <text x="84" y="38" fill="#ffffff" font-size="14.5" font-weight="700">${esc(shownName)}</text>
          <text x="84" y="62" fill="${SOFT}" font-size="13" font-weight="600">${esc(s.ticker)} · ${s.close.toFixed(2)} EGP</text>
          <text x="84" y="84" fill="${MUTED}" font-size="12" font-weight="500">Turnover: ${fmtTurnover(s)} EGP</text>
        </g>

        <rect x="358" y="28" width="110" height="44" rx="10" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.5" />
        <text x="413" y="56" fill="${color}" font-size="16.5" font-weight="700" text-anchor="middle">${sign(s.changePct)}${s.changePct.toFixed(2)}%</text>
      </g>`;
    };

    const sqBody = `
      ${headerBlock(
        W,
        ar ? 'قائمة الرابحين والخاسرين: أين ذهبت سيولة الأسهم اليوم؟' : 'Session Top Gainers & Losers',
        ar ? 'أعلى ٥ أسهم ارتفاعاً وتراجعاً والأسهم الأكثر نشاطاً في التداول' : 'Highest-momentum listed EGX equities filtered by active turnover',
        data.date,
        ar ? 'الرابحون والخاسرون' : 'Top Movers',
        undefined,
        undefined,
        ar
      )}

      <g transform="translate(42, 156)">
        <rect width="996" height="232" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        <text x="24" y="32" fill="${RED}" font-size="13.5" font-weight="700">◀ ${esc(ar ? 'الأكثر تراجعاً (% تغير)' : 'TOP 5 LOSERS (% DROP)')}</text>
        <text x="972" y="32" fill="${GREEN}" font-size="13.5" font-weight="700" text-anchor="end">${esc(ar ? 'الأكثر ارتفاعاً (% صعود)' : 'TOP 5 GAINERS (% SURGE)')} ▶</text>
        <line x1="${centerAxisX}" y1="46" x2="${centerAxisX}" y2="212" stroke="#27272a" stroke-width="1" stroke-dasharray="3 3" />
        ${tornadoRows}
      </g>

      ${gainers.map((s, i) => sqStockCard(s, i, true, ar ? 552 : 42)).join('')}
      ${losers.map((s, i) => sqStockCard(s, i, false, ar ? 42 : 552)).join('')}

      ${footerBlock(W, H, ar ? 'فلتر السيولة النشطة · الأسهم المقيدة بالبورصة المصرية فقط' : 'Active Liquidity Filter · Verified EGX Listed Equities Only', ar)}
    `;
    return toBase64Svg(svgShell(W, H, '', sqBody, ar));
  }

  // 16:9 WIDE DESKTOP LAYOUT (1200 x 675)
  const centerAxisX = 218;
  const leftBarEnd = 198;
  const rightBarStart = 238;
  const maxWingW = 90;
  const wideTornadoRows = Array.from({ length: 5 })
    .map((_, i) => {
      const g = gainers[i];
      const l = losers[i];
      const y = 78 + i * 70;
      const gw = g ? Math.max(6, (Math.abs(g.changePct) / maxAbsPct) * maxWingW) : 0;
      const lw = l ? Math.max(6, (Math.abs(l.changePct) / maxAbsPct) * maxWingW) : 0;
      return `
      <g>
        <line x1="16" y1="${y + 30}" x2="420" y2="${y + 30}" stroke="#141416" stroke-width="1" />
        <rect x="${leftBarEnd - maxWingW}" y="${y + 3}" width="${maxWingW}" height="16" rx="3.5" fill="#141416" />
        <rect x="${rightBarStart}" y="${y + 3}" width="${maxWingW}" height="16" rx="3.5" fill="#141416" />
        ${
          l
            ? `<text x="16" y="${y + 15}" fill="${RED}" font-size="11" font-weight="700">${esc(l.ticker)} ${l.changePct.toFixed(1)}%</text>
               <rect x="${(leftBarEnd - lw).toFixed(1)}" y="${y + 1}" width="${lw.toFixed(1)}" height="20" rx="4" fill="${RED}" fill-opacity="0.86" />`
            : ''
        }
        <text x="${centerAxisX}" y="${y + 15}" fill="${MUTED}" font-size="11" font-weight="700" text-anchor="middle">#${i + 1}</text>
        ${
          g
            ? `<rect x="${rightBarStart}" y="${y + 1}" width="${gw.toFixed(1)}" height="20" rx="4" fill="${GREEN}" fill-opacity="0.86" />
               <text x="420" y="${y + 15}" fill="${GREEN}" font-size="11" font-weight="700" text-anchor="end">${esc(g.ticker)} +${g.changePct.toFixed(1)}%</text>`
            : ''
        }
      </g>`;
    })
    .join('');

  const wideStockCard = (s: MoverStock, idx: number, isGainer: boolean, colX: number) => {
    const color = isGainer ? GREEN : RED;
    const y = 196 + idx * 82;
    const name = s.companyName || s.ticker;
    const shownName = name.length > 16 ? `${name.slice(0, 15)}…` : name;
    const cid = `w-mv-${isGainer ? 'g' : 'l'}-${idx}`;
    const tcid = `w-mvt-${isGainer ? 'g' : 'l'}-${idx}`;
    const avatarX = ar ? 292 : 32;
    const avatar = s.logoDataUri
      ? `<circle cx="${avatarX}" cy="36" r="19" fill="#ffffff" />
         <clipPath id="${cid}"><circle cx="${avatarX}" cy="36" r="17" /></clipPath>
         <image href="${s.logoDataUri}" xlink:href="${s.logoDataUri}" x="${avatarX - 17}" y="19" width="34" height="34" preserveAspectRatio="xMidYMid meet" clip-path="url(#${cid})" />
         <circle cx="${avatarX}" cy="36" r="19" fill="none" stroke="${color}" stroke-width="1.5" />`
      : `<circle cx="${avatarX}" cy="36" r="19" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="1.5" />
         <text x="${avatarX}" y="40" fill="#ffffff" font-size="11" font-weight="700" text-anchor="middle">${esc(s.ticker.slice(0, 4))}</text>`;

    if (ar) {
      return `
      <g transform="translate(${colX}, ${y})">
        <rect width="324" height="72" rx="11" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${avatar}
        <clipPath id="${tcid}"><rect x="100" y="6" width="166" height="60" /></clipPath>
        <g clip-path="url(#${tcid})">
          <text x="264" y="28" fill="#ffffff" font-size="12.5" font-weight="700" text-anchor="end">${esc(shownName)}</text>
          <text x="264" y="46" fill="${SOFT}" font-size="11.5" font-weight="600" text-anchor="end">${esc(s.ticker)} · ${s.close.toFixed(2)}</text>
          <text x="264" y="61" fill="${MUTED}" font-size="10.5" font-weight="600" text-anchor="end">السيولة: ${fmtTurnover(s)} EGP</text>
        </g>

        <rect x="12" y="19" width="82" height="34" rx="8" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.2" />
        <text x="53" y="41" fill="${color}" font-size="13" font-weight="700" text-anchor="middle">${sign(s.changePct)}${s.changePct.toFixed(2)}%</text>
      </g>`;
    }

    return `
    <g transform="translate(${colX}, ${y})">
      <rect width="324" height="72" rx="11" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${avatar}
      <clipPath id="${tcid}"><rect x="58" y="6" width="164" height="60" /></clipPath>
      <g clip-path="url(#${tcid})">
        <text x="60" y="28" fill="#ffffff" font-size="12.5" font-weight="700">${esc(shownName)}</text>
        <text x="60" y="46" fill="${SOFT}" font-size="11.5" font-weight="600">${esc(s.ticker)} · ${s.close.toFixed(2)}</text>
        <text x="60" y="61" fill="${MUTED}" font-size="10.5">Vol: ${fmtTurnover(s)} EGP</text>
      </g>

      <rect x="230" y="19" width="82" height="34" rx="8" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.2" />
      <text x="271" y="41" fill="${color}" font-size="13" font-weight="700" text-anchor="middle">${sign(s.changePct)}${s.changePct.toFixed(2)}%</text>
    </g>`;
  };

  const gainColX = ar ? 834 : 494;
  const loseColX = ar ? 494 : 834;

  const body = `
    ${headerBlock(
      W,
      ar ? 'قائمة الرابحين والخاسرين: أين ذهبت سيولة الأسهم اليوم؟' : 'Session Top Gainers & Losers Leaderboard',
      ar ? 'أعلى ٥ أسهم ارتفاعاً وتراجعاً والأسهم الأكثر نشاطاً في التداول' : 'Highest-momentum listed EGX equities filtered by active institutional turnover',
      data.date,
      ar ? 'الرابحون والخاسرون' : 'Top Session Movers',
      undefined,
      undefined,
      ar
    )}

    <!-- Left Tornado Chart Card (436 x 448) -->
    <g transform="translate(42, 154)">
      <rect width="436" height="448" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <text x="${ar ? 420 : 16}" y="30" fill="#ffffff" font-size="14" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'مقارنة قوة الزخم السعري (%)' : 'Momentum Spread Tornado (%)')}</text>
      <text x="16" y="54" fill="${RED}" font-size="11" font-weight="700">◀ ${esc(ar ? 'الأكثر هبوطاً' : 'LOSERS')}</text>
      <text x="420" y="54" fill="${GREEN}" font-size="11" font-weight="700" text-anchor="end">${esc(ar ? 'الأكثر صعوداً' : 'GAINERS')} ▶</text>
      <line x1="${centerAxisX}" y1="64" x2="${centerAxisX}" y2="424" stroke="#27272a" stroke-width="1" stroke-dasharray="3 3" />
      ${wideTornadoRows}
    </g>

    <!-- Right Column Headers -->
    <g transform="translate(${gainColX}, 154)">
      <rect width="324" height="32" rx="8" fill="${GREEN}" fill-opacity="0.12" stroke="${GREEN}" stroke-opacity="0.5" />
      <text x="${ar ? 308 : 16}" y="21" fill="${GREEN}" font-size="12.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${esc(ar ? 'الأكثر ارتفاعاً (TOP 5)' : 'TOP 5 GAINERS')}</text>
    </g>
    <g transform="translate(${loseColX}, 154)">
      <rect width="324" height="32" rx="8" fill="${RED}" fill-opacity="0.12" stroke="${RED}" stroke-opacity="0.5" />
      <text x="${ar ? 308 : 16}" y="21" fill="${RED}" font-size="12.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▼ ${esc(ar ? 'الأكثر انخفاضاً (TOP 5)' : 'TOP 5 LOSERS')}</text>
    </g>

    ${gainers.map((s, i) => wideStockCard(s, i, true, gainColX)).join('')}
    ${losers.map((s, i) => wideStockCard(s, i, false, loseColX)).join('')}

    ${footerBlock(W, H, ar ? 'فلتر السيولة النشطة · الأسهم المقيدة بالبورصة المصرية فقط' : 'Active Liquidity Filter · Verified EGX Listed Equities Only', ar)}
  `;

  return toBase64Svg(svgShell(W, H, '', body, ar));
}

/* ───────────────────────────────────────────────────────────────────────────
 * 5. USD/EGP UPDATE — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateUsdEgpUpdateChartSvg(
  data: UsdEgpUpdateChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = locale === 'ar';
  const pct = (a: number) => Number((((a - data.officialUsd) / data.officialUsd) * 100).toFixed(2));
  const spread = pct(data.compositeFair);
  const goldGap = pct(data.saghaGoldUsd);
  const gdrGap = pct(data.londonGdrUsd);
  const score = Math.min(100, Math.max(0, data.devaluationRiskScore || 0));
  const scoreColor = score >= 70 ? RED : score >= 48 ? '#f97316' : score >= 25 ? AMBER : GREEN;
  const shortRiskBadge =
    score >= 70
      ? ar ? `مخاطر العملة: ${score}/100 · ضغوط حادة` : `FX PRESSURE: ${score}/100 · HIGH`
      : score >= 48
      ? ar ? `مخاطر العملة: ${score}/100 · تراجع متسارع` : `FX PRESSURE: ${score}/100 · ACCELERATED`
      : score >= 25
      ? ar ? `مخاطر العملة: ${score}/100 · هبوط مدار` : `FX PRESSURE: ${score}/100 · MANAGED DRIFT`
      : ar ? `مخاطر العملة: ${score}/100 · استقرار نسبي` : `FX PRESSURE: ${score}/100 · ANCHORED`;

  const localizedRiskLabel = ar
    ? score >= 70
      ? 'ضغوط تراجع حادة ومتسارعة وفجوة تسعيرية مع الأسواق الموازية'
      : score >= 48
      ? 'ضغوط تراجع متسارعة للجنيه وزخم صعودي يومي متواصل'
      : score >= 25
      ? 'هبوط تدريجي مدار من البنك المركزي دون تسارع حاد'
      : 'استقرار نسبي وتحرك محدود لسعر الصرف الرسمي والموازي'
    : data.devaluationRiskLabel;

  const hist =
    data.history20d && data.history20d.length >= 2
      ? data.history20d
      : [
          {
            date: data.date.slice(5),
            officialUsd: data.officialUsd,
            compositeFair: data.compositeFair,
            saghaGoldUsd: data.saghaGoldUsd,
            londonGdrUsd: data.londonGdrUsd,
          },
          {
            date: data.date.slice(5),
            officialUsd: data.officialUsd,
            compositeFair: data.compositeFair,
            saghaGoldUsd: data.saghaGoldUsd,
            londonGdrUsd: data.londonGdrUsd,
          },
        ];

  const n = hist.length;
  const allRates = hist.flatMap((h) => [h.officialUsd, h.compositeFair, h.saghaGoldUsd, h.londonGdrUsd]);
  const minRate = Math.min(...allRates) - 0.35;
  const maxRate = Math.max(...allRates) + 0.35;
  const spanRate = Math.max(0.5, maxRate - minRate);

  const defs = `
    <linearGradient id="fxRiskSpectrum" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${GREEN}" />
      <stop offset="50%" stop-color="${AMBER}" />
      <stop offset="100%" stop-color="${RED}" />
    </linearGradient>`;

  if (isSquare) {
    // 1:1 SQUARE MOBILE LAYOUT (1080 x 1080)
    const sqRateCard = (x: number, y: number, label: string, val: number, gapPct: number, color: string, isBase = false) => {
      const barW = Math.min(160, Math.max(10, Math.abs(gapPct) * 26));
      if (ar) {
        return `
        <g transform="translate(${x}, ${y})">
          <rect width="488" height="106" rx="14" fill="#000000" stroke="${isBase ? '#3f3f46' : LINE}" stroke-width="1.5" />
          <circle cx="464" cy="30" r="5" fill="${color}" />
          <text x="450" y="35" fill="${SOFT}" font-size="14" font-weight="700" text-anchor="end">${esc(label)}</text>
          <text x="464" y="78" fill="#ffffff" font-size="30" font-weight="700" text-anchor="end">${fmt2(val)} <tspan fill="${MUTED}" font-size="13.5" font-weight="600">EGP</tspan></text>
          ${
            isBase
              ? `${
                    data.delta30dEgp !== undefined && data.pct30d !== undefined
                      ? `<rect x="24" y="42" width="170" height="34" rx="8" fill="#18181b" stroke="#3f3f46" />
                         <text x="109" y="64" fill="${scoreColor}" font-size="12" font-weight="700" text-anchor="middle">30D: +${data.delta30dEgp.toFixed(2)} (+${Math.abs(data.pct30d).toFixed(1)}%)</text>`
                      : `<rect x="24" y="42" width="128" height="34" rx="8" fill="#18181b" stroke="#333338" />
                         <text x="88" y="64" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="middle">سعر الأساس</text>`
                  }`
              : `<rect x="24" y="64" width="168" height="10" rx="5" fill="#18181b" />
                 <rect x="24" y="64" width="${barW.toFixed(1)}" height="10" rx="5" fill="${color}" />
                 <text x="24" y="50" fill="${color}" font-size="14.5" font-weight="700" text-anchor="start">${sign(gapPct)}${gapPct.toFixed(2)}% فجوة</text>`
          }
        </g>`;
      }
      return `
      <g transform="translate(${x}, ${y})">
        <rect width="488" height="106" rx="14" fill="#000000" stroke="${isBase ? '#3f3f46' : LINE}" stroke-width="1.5" />
        <circle cx="24" cy="30" r="5" fill="${color}" />
        <text x="38" y="35" fill="${SOFT}" font-size="13.5" font-weight="600">${esc(label)}</text>
        <text x="24" y="78" fill="#ffffff" font-size="30" font-weight="700">${fmt2(val)} <tspan fill="${MUTED}" font-size="13.5" font-weight="500">EGP</tspan></text>
        ${
          isBase
            ? `${
                    data.delta30dEgp !== undefined && data.pct30d !== undefined
                      ? `<rect x="294" y="42" width="170" height="34" rx="8" fill="#18181b" stroke="#3f3f46" />
                         <text x="379" y="64" fill="${scoreColor}" font-size="12" font-weight="700" text-anchor="middle">30D: +${data.delta30dEgp.toFixed(2)} (+${Math.abs(data.pct30d).toFixed(1)}%)</text>`
                      : `<rect x="336" y="42" width="128" height="34" rx="8" fill="#18181b" stroke="#333338" />
                         <text x="400" y="64" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="middle">CBE BENCHMARK</text>`
                  }`
            : `<rect x="296" y="64" width="168" height="10" rx="5" fill="#18181b" />
               <rect x="296" y="64" width="${barW.toFixed(1)}" height="10" rx="5" fill="${color}" />
               <text x="464" y="50" fill="${color}" font-size="14.5" font-weight="700" text-anchor="end">${sign(gapPct)}${gapPct.toFixed(2)}% spread</text>`
        }
      </g>`;
    };

    const plotX = 68;
    const plotW = 876;
    const plotTop = 76;
    const plotH = 270;
    const toX = (i: number) => plotX + (i / Math.max(1, n - 1)) * plotW;
    const toY = (v: number) => plotTop + ((maxRate - v) / spanRate) * plotH;
    const linePts = (getter: (h: FxHistoryPoint) => number) =>
      hist.map((h, i) => `${toX(i).toFixed(1)},${toY(getter(h)).toFixed(1)}`).join(' ');

    const corridorPath =
      n > 1
        ? `M ${hist.map((h, i) => `${toX(i).toFixed(1)} ${toY(h.compositeFair).toFixed(1)}`).join(' L ')} L ${[...hist]
            .reverse()
            .map((h, revIdx) => `${toX(n - 1 - revIdx).toFixed(1)} ${toY(h.officialUsd).toFixed(1)}`)
            .join(' L ')} Z`
        : '';

    const dateLabels = hist
      .filter((_, i) => i === 0 || i === Math.floor(n / 3) || i === Math.floor((2 * n) / 3) || i === n - 1)
      .map((h, idx, arr) => {
        const origIdx = hist.indexOf(h);
        const anchor = idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle';
        return `<text x="${toX(origIdx).toFixed(1)}" y="${plotTop + plotH + 26}" fill="${MUTED}" font-size="12.5" font-weight="600" text-anchor="${anchor}">${esc(h.date)}</text>`;
      })
      .join('');

    const sqBody = `
      ${headerBlock(
        W,
        ar ? 'حقيقة سعر الدولار: تقييم الضغوط على الجنيه ومؤشر مخاطر التعويم' : 'USD/EGP Triangulation & Fair Value Corridor',
        ar ? 'مقارنة سعر البنك الرسمي مع دولار الذهب وشهادات لندن لكشف أي فجوة تسعير' : 'Official CBE interbank rate vs. Sagha Gold & London CIB GDR implied rates',
        data.date,
        ar ? 'سعر الدولار ومخاطر الجنيه' : 'USD/EGP Update',
        shortRiskBadge,
        scoreColor,
        ar
      )}

      ${sqRateCard(ar ? 550 : 42, 156, ar ? 'السعر الرسمي بالبنك المركزي (CBE)' : 'Official CBE Interbank Rate', data.officialUsd, 0, '#ffffff', true)}
      ${sqRateCard(ar ? 42 : 550, 156, ar ? 'القيمة العادلة المركبة (Composite)' : 'Triangulated Composite Fair Value', data.compositeFair, spread, CYAN)}
      ${sqRateCard(ar ? 550 : 42, 276, ar ? 'دولار الصاغة الضمني (Sagha 24K)' : 'Sagha Gold 24K Implied USD', data.saghaGoldUsd, goldGap, AMBER)}
      ${sqRateCard(ar ? 42 : 550, 276, ar ? 'دولار شهادات التجاري الدولي (LSE GDR)' : 'London CIB GDR Implied USD', data.londonGdrUsd, gdrGap, BLUE)}

      <!-- Middle 20-Session Multi-Line Chart (996 x 404) -->
      <g transform="translate(42, 400)">
        <rect width="996" height="404" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        <text x="${ar ? 970 : 26}" y="36" fill="#ffffff" font-size="16" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'مسار سعر الصرف الرسمي والموازي (آخر ٢٠ جلسة)' : '20-Session Official vs. Shadow-Proxy Clearing Trajectory (EGP/USD)')}</text>

        <line x1="26" y1="54" x2="48" y2="54" stroke="#ffffff" stroke-width="3" /><text x="56" y="58" fill="#ffffff" font-size="12" font-weight="600">${esc(ar ? 'الرسمي' : 'Official CBE')}</text>
        <line x1="170" y1="54" x2="192" y2="54" stroke="${CYAN}" stroke-width="3" /><text x="200" y="58" fill="${CYAN}" font-size="12" font-weight="700">${esc(ar ? 'العادل المركب' : 'Composite Fair')}</text>
        <line x1="330" y1="54" x2="352" y2="54" stroke="${AMBER}" stroke-width="2.5" stroke-dasharray="5 4" /><text x="360" y="58" fill="${AMBER}" font-size="12" font-weight="600">${esc(ar ? 'دولار الصاغة' : 'Sagha Gold')}</text>
        <line x1="480" y1="54" x2="502" y2="54" stroke="${BLUE}" stroke-width="2.5" stroke-dasharray="3 3" /><text x="510" y="58" fill="${BLUE}" font-size="12" font-weight="600">${esc(ar ? 'شهادات لندن' : 'London CIB GDR')}</text>

        <line x1="${plotX}" y1="${plotTop}" x2="${plotX + plotW}" y2="${plotTop}" stroke="${GRID}" stroke-width="1" />
        <line x1="${plotX}" y1="${plotTop + plotH / 2}" x2="${plotX + plotW}" y2="${plotTop + plotH / 2}" stroke="${GRID}" stroke-width="1" stroke-dasharray="4 4" />
        <line x1="${plotX}" y1="${plotTop + plotH}" x2="${plotX + plotW}" y2="${plotTop + plotH}" stroke="${GRID}" stroke-width="1" />

        <text x="${plotX - 10}" y="${plotTop + 12}" fill="${MUTED}" font-size="11.5" text-anchor="end">${maxRate.toFixed(1)}</text>
        <text x="${plotX - 10}" y="${plotTop + plotH / 2 + 4}" fill="${SOFT}" font-size="11.5" text-anchor="end">${((maxRate + minRate) / 2).toFixed(1)}</text>
        <text x="${plotX - 10}" y="${plotTop + plotH}" fill="${MUTED}" font-size="11.5" text-anchor="end">${minRate.toFixed(1)}</text>

        ${corridorPath ? `<path d="${corridorPath}" fill="${CYAN}" fill-opacity="0.10" />` : ''}
        <polyline points="${linePts((h) => h.londonGdrUsd)}" fill="none" stroke="${BLUE}" stroke-width="2.5" stroke-dasharray="3 3" stroke-linejoin="round" />
        <polyline points="${linePts((h) => h.saghaGoldUsd)}" fill="none" stroke="${AMBER}" stroke-width="2.5" stroke-dasharray="5 4" stroke-linejoin="round" />
        <polyline points="${linePts((h) => h.officialUsd)}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" />
        <polyline points="${linePts((h) => h.compositeFair)}" fill="none" stroke="${CYAN}" stroke-width="3.2" stroke-linejoin="round" />

        <circle cx="${toX(n - 1).toFixed(1)}" cy="${toY(data.officialUsd).toFixed(1)}" r="4.5" fill="#ffffff" />
        <circle cx="${toX(n - 1).toFixed(1)}" cy="${toY(data.compositeFair).toFixed(1)}" r="5" fill="${CYAN}" />
        ${dateLabels}
      </g>

      <!-- Bottom Risk & ATR Panel (996 x 186) -->
      <g transform="translate(42, 822)">
        <rect width="996" height="186" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="470" y="38" fill="#ffffff" font-size="15.5" font-weight="700" text-anchor="end">مؤشر ضغوط وتراجع الجنيه</text>
               <text x="26" y="38" fill="${scoreColor}" font-size="20" font-weight="700" text-anchor="start">${score} / 100</text>`
            : `<text x="26" y="38" fill="#ffffff" font-size="15.5" font-weight="700">EGP Pressure & Depreciation Index</text>
               <text x="470" y="38" fill="${scoreColor}" font-size="20" font-weight="700" text-anchor="end">${score} / 100</text>`
        }
        <rect x="26" y="60" width="444" height="16" rx="8" fill="url(#fxRiskSpectrum)" fill-opacity="0.3" />
        <rect x="26" y="60" width="${Math.max(16, (score / 100) * 444).toFixed(1)}" height="16" rx="8" fill="${scoreColor}" />
        <circle cx="${(26 + (score / 100) * 444).toFixed(1)}" cy="68" r="9" fill="#ffffff" stroke="${scoreColor}" stroke-width="3" />
        <text x="26" y="106" fill="${GREEN}" font-size="12" font-weight="600">${esc(ar ? 'منخفض (استقرار نسبي)' : '0 · Low Pressure')}</text>
        <text x="248" y="106" fill="#f97316" font-size="12" font-weight="600" text-anchor="middle">${esc(ar ? 'متوسط (هبوط متسارع)' : '50 · Accelerated Drift')}</text>
        <text x="470" y="106" fill="${RED}" font-size="12" font-weight="600" text-anchor="end">${esc(ar ? 'مرتفع (ضغوط حادة)' : '100 · High Pressure')}</text>
        <text x="${ar ? 470 : 26}" y="146" fill="${MUTED}" font-size="12.5" font-weight="600" text-anchor="${ar ? 'end' : 'start'}">${esc(localizedRiskLabel)}</text>

        <line x1="504" y1="24" x2="504" y2="162" stroke="${LINE}" stroke-width="1" />

        ${
          ar
            ? `<text x="970" y="38" fill="#ffffff" font-size="15.5" font-weight="700" text-anchor="end">معدل تذبذب الصرف (ATR 14D / 90D)</text>
               <text x="532" y="38" fill="${CYAN}" font-size="17" font-weight="700" text-anchor="start">${(data.atrCompressionRatio * 100).toFixed(1)}%</text>`
            : `<text x="532" y="38" fill="#ffffff" font-size="15.5" font-weight="700">FX Volatility Regime (14D vs 90D ATR)</text>
               <text x="970" y="38" fill="${CYAN}" font-size="17" font-weight="700" text-anchor="end">${(data.atrCompressionRatio * 100).toFixed(1)}%</text>`
        }

        <text x="532" y="84" fill="${SOFT}" font-size="12.5" font-weight="600">14D ATR (${data.atr14.toFixed(2)} EGP)</text>
        <rect x="690" y="70" width="280" height="16" rx="6" fill="#18181b" />
        <rect x="690" y="70" width="${Math.min(280, Math.max(16, (data.atr14 / Math.max(0.4, data.atr90 * 1.3)) * 280)).toFixed(1)}" height="16" rx="6" fill="${CYAN}" />

        <text x="532" y="134" fill="${SOFT}" font-size="12.5" font-weight="600">90D ATR (${data.atr90.toFixed(2)} EGP)</text>
        <rect x="690" y="120" width="280" height="16" rx="6" fill="#18181b" />
        <rect x="690" y="120" width="${Math.min(280, Math.max(16, (data.atr90 / Math.max(0.4, data.atr90 * 1.3)) * 280)).toFixed(1)}" height="16" rx="6" fill="#71717a" />
      </g>

      ${footerBlock(W, H, ar ? 'نموذج تكنال الرباعي لتسعير العملة · (٣٥٪ تيذر + ٣٠٪ شهادات لندن + ٢٥٪ الذهب + ١٠٪ الرسمي)' : 'Ticknal 4-Way Currency Triangulation · (35% USDT + 30% London GDR + 25% Sagha Gold + 10% CBE Spot)', ar)}
    `;
    return toBase64Svg(svgShell(W, H, defs, sqBody, ar));
  }

  // 16:9 WIDE DESKTOP LAYOUT (1200 x 675)
  const plotX = 56;
  const plotW = 594;
  const plotTop = 58;
  const plotH = 198;
  const toX = (i: number) => plotX + (i / Math.max(1, n - 1)) * plotW;
  const toY = (v: number) => plotTop + ((maxRate - v) / spanRate) * plotH;

  const linePts = (getter: (h: FxHistoryPoint) => number) =>
    hist.map((h, i) => `${toX(i).toFixed(1)},${toY(getter(h)).toFixed(1)}`).join(' ');

  const offLine = linePts((h) => h.officialUsd);
  const fairLine = linePts((h) => h.compositeFair);
  const goldLine = linePts((h) => h.saghaGoldUsd);
  const gdrLine = linePts((h) => h.londonGdrUsd);

  const corridorPath =
    n > 1
      ? `M ${hist.map((h, i) => `${toX(i).toFixed(1)} ${toY(h.compositeFair).toFixed(1)}`).join(' L ')} L ${[...hist]
          .reverse()
          .map((h, revIdx) => `${toX(n - 1 - revIdx).toFixed(1)} ${toY(h.officialUsd).toFixed(1)}`)
          .join(' L ')} Z`
      : '';

  const dateLabels = hist
    .filter((_, i) => i === 0 || i === Math.floor(n / 3) || i === Math.floor((2 * n) / 3) || i === n - 1)
    .map((h, idx, arr) => {
      const origIdx = hist.indexOf(h);
      const anchor = idx === 0 ? 'start' : idx === arr.length - 1 ? 'end' : 'middle';
      return `<text x="${toX(origIdx).toFixed(1)}" y="${plotTop + plotH + 20}" fill="${MUTED}" font-size="10.5" font-weight="500" text-anchor="${anchor}">${esc(h.date)}</text>`;
    })
    .join('');

  const rateCard = (y: number, label: string, val: number, gapPct: number, color: string, isBase = false) => {
    const barW = Math.min(130, Math.max(8, Math.abs(gapPct) * 22));
    if (ar) {
      return `
      <g transform="translate(754, ${y})">
        <rect width="404" height="68" rx="11" fill="#000000" stroke="${isBase ? '#3f3f46' : LINE}" stroke-width="1.5" />
        <circle cx="384" cy="23" r="4" fill="${color}" />
        <text x="372" y="27" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="end">${esc(label)}</text>
        <text x="384" y="54" fill="#ffffff" font-size="21" font-weight="700" text-anchor="end">${fmt2(val)} <tspan fill="${MUTED}" font-size="11" font-weight="600">EGP</tspan></text>
        ${
          isBase
            ? `${
                  data.delta30dEgp !== undefined && data.pct30d !== undefined
                    ? `<rect x="18" y="20" width="145" height="28" rx="6" fill="#18181b" stroke="#3f3f46" />
                       <text x="90" y="38" fill="${scoreColor}" font-size="10.5" font-weight="700" text-anchor="middle">30D: +${data.delta30dEgp.toFixed(2)} (+${Math.abs(data.pct30d).toFixed(1)}%)</text>`
                    : `<rect x="18" y="20" width="112" height="28" rx="6" fill="#18181b" stroke="#333338" />
                       <text x="74" y="38" fill="${SOFT}" font-size="11" font-weight="700" text-anchor="middle">سعر الأساس</text>`
                }`
            : `<rect x="18" y="42" width="144" height="7" rx="3.5" fill="#18181b" />
               <rect x="18" y="42" width="${barW.toFixed(1)}" height="7" rx="3.5" fill="${color}" />
               <text x="18" y="32" fill="${color}" font-size="12" font-weight="700" text-anchor="start">${sign(gapPct)}${gapPct.toFixed(2)}% فجوة</text>`
        }
      </g>`;
    }
    return `
    <g transform="translate(754, ${y})">
      <rect width="404" height="68" rx="11" fill="#000000" stroke="${isBase ? '#3f3f46' : LINE}" stroke-width="1.5" />
      <circle cx="20" cy="23" r="4" fill="${color}" />
      <text x="32" y="27" fill="${SOFT}" font-size="11.5" font-weight="600">${esc(label)}</text>
      <text x="20" y="54" fill="#ffffff" font-size="21" font-weight="700">${fmt2(val)} <tspan fill="${MUTED}" font-size="11" font-weight="500">EGP</tspan></text>
      ${
        isBase
          ? `${
                  data.delta30dEgp !== undefined && data.pct30d !== undefined
                    ? `<rect x="240" y="20" width="145" height="28" rx="6" fill="#18181b" stroke="#3f3f46" />
                       <text x="312" y="38" fill="${scoreColor}" font-size="10.5" font-weight="700" text-anchor="middle">30D: +${data.delta30dEgp.toFixed(2)} (+${Math.abs(data.pct30d).toFixed(1)}%)</text>`
                    : `<rect x="274" y="20" width="112" height="28" rx="6" fill="#18181b" stroke="#333338" />
                       <text x="330" y="38" fill="${SOFT}" font-size="10.5" font-weight="700" text-anchor="middle">CBE BENCHMARK</text>`
                }`
          : `<rect x="242" y="42" width="144" height="7" rx="3.5" fill="#18181b" />
             <rect x="242" y="42" width="${barW.toFixed(1)}" height="7" rx="3.5" fill="${color}" />
             <text x="386" y="32" fill="${color}" font-size="12" font-weight="700" text-anchor="end">${sign(gapPct)}${gapPct.toFixed(2)}% spread</text>`
      }
    </g>`;
  };

  const body = `
    ${headerBlock(
      W,
      ar ? 'حقيقة سعر الدولار: تقييم الضغوط على الجنيه ومؤشر مخاطر التعويم' : 'USD/EGP Triangulation & Fair Value Corridor',
      ar ? 'مقارنة سعر البنك الرسمي مع دولار الذهب وشهادات لندن لكشف أي فجوة تسعير' : 'Official CBE interbank rate vs. Sagha Gold & London CIB GDR implied clearing rates',
      data.date,
      ar ? 'سعر الدولار ومخاطر الجنيه' : 'USD/EGP Update',
      shortRiskBadge,
      scoreColor,
      ar
    )}

    <g transform="translate(42, 154)">
      <rect width="696" height="300" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <text x="${ar ? 674 : 22}" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'مسار سعر الصرف الرسمي والموازي (آخر ٢٠ جلسة)' : '20-Session Official vs. Shadow-Proxy Clearing Trajectory (EGP/USD)')}</text>

      <line x1="22" y1="43" x2="40" y2="43" stroke="#ffffff" stroke-width="2.5" /><text x="46" y="47" fill="#ffffff" font-size="10.5" font-weight="600">${esc(ar ? 'الرسمي' : 'Official CBE')}</text>
      <line x1="140" y1="43" x2="158" y2="43" stroke="${CYAN}" stroke-width="2.5" /><text x="164" y="47" fill="${CYAN}" font-size="10.5" font-weight="700">${esc(ar ? 'العادل المركب' : 'Composite Fair')}</text>
      <line x1="278" y1="43" x2="296" y2="43" stroke="${AMBER}" stroke-width="2" stroke-dasharray="4 3" /><text x="302" y="47" fill="${AMBER}" font-size="10.5" font-weight="600">${esc(ar ? 'دولار الصاغة' : 'Sagha Gold')}</text>
      <line x1="402" y1="43" x2="420" y2="43" stroke="${BLUE}" stroke-width="2" stroke-dasharray="2 3" /><text x="426" y="47" fill="${BLUE}" font-size="10.5" font-weight="600">${esc(ar ? 'شهادات لندن' : 'London CIB GDR')}</text>

      <line x1="${plotX}" y1="${plotTop}" x2="${plotX + plotW}" y2="${plotTop}" stroke="${GRID}" stroke-width="1" />
      <line x1="${plotX}" y1="${plotTop + plotH / 2}" x2="${plotX + plotW}" y2="${plotTop + plotH / 2}" stroke="${GRID}" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="${plotX}" y1="${plotTop + plotH}" x2="${plotX + plotW}" y2="${plotTop + plotH}" stroke="${GRID}" stroke-width="1" />

      <text x="${plotX - 8}" y="${plotTop + 10}" fill="${MUTED}" font-size="10" text-anchor="end">${maxRate.toFixed(1)}</text>
      <text x="${plotX - 8}" y="${plotTop + plotH / 2 + 4}" fill="${SOFT}" font-size="10" text-anchor="end">${((maxRate + minRate) / 2).toFixed(1)}</text>
      <text x="${plotX - 8}" y="${plotTop + plotH}" fill="${MUTED}" font-size="10" text-anchor="end">${minRate.toFixed(1)}</text>

      ${corridorPath ? `<path d="${corridorPath}" fill="${CYAN}" fill-opacity="0.10" />` : ''}
      <polyline points="${gdrLine}" fill="none" stroke="${BLUE}" stroke-width="2" stroke-dasharray="3 3" stroke-linejoin="round" />
      <polyline points="${goldLine}" fill="none" stroke="${AMBER}" stroke-width="2" stroke-dasharray="5 4" stroke-linejoin="round" />
      <polyline points="${offLine}" fill="none" stroke="#ffffff" stroke-width="2.6" stroke-linejoin="round" />
      <polyline points="${fairLine}" fill="none" stroke="${CYAN}" stroke-width="2.8" stroke-linejoin="round" />

      <circle cx="${toX(n - 1).toFixed(1)}" cy="${toY(data.officialUsd).toFixed(1)}" r="4" fill="#ffffff" />
      <circle cx="${toX(n - 1).toFixed(1)}" cy="${toY(data.compositeFair).toFixed(1)}" r="4.5" fill="${CYAN}" />
      ${dateLabels}
    </g>

    ${rateCard(154, ar ? 'السعر الرسمي بالبنك المركزي (CBE)' : 'Official CBE Interbank Rate', data.officialUsd, 0, '#ffffff', true)}
    ${rateCard(231, ar ? 'القيمة العادلة المركبة (Composite)' : 'Triangulated Composite Fair Value', data.compositeFair, spread, CYAN)}
    ${rateCard(308, ar ? 'دولار الصاغة الضمني (Sagha 24K)' : 'Sagha Gold 24K Implied USD', data.saghaGoldUsd, goldGap, AMBER)}
    ${rateCard(385, ar ? 'دولار شهادات التجاري الدولي (LSE GDR)' : 'London CIB GDR Implied USD', data.londonGdrUsd, gdrGap, BLUE)}

    <g transform="translate(42, 470)">
      <rect width="1116" height="132" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />

      ${
        ar
          ? `<text x="520" y="30" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">مؤشر ضغوط وتراجع الجنيه</text>
             <text x="24" y="30" fill="${scoreColor}" font-size="17" font-weight="700" text-anchor="start">${score} / 100</text>`
          : `<text x="24" y="30" fill="#ffffff" font-size="14" font-weight="700">EGP Pressure & Depreciation Index</text>
             <text x="520" y="30" fill="${scoreColor}" font-size="17" font-weight="700" text-anchor="end">${score} / 100</text>`
      }
      <rect x="24" y="46" width="496" height="14" rx="7" fill="url(#fxRiskSpectrum)" fill-opacity="0.3" />
      <rect x="24" y="46" width="${Math.max(14, (score / 100) * 496).toFixed(1)}" height="14" rx="7" fill="${scoreColor}" />
      <circle cx="${(24 + (score / 100) * 496).toFixed(1)}" cy="53" r="7.5" fill="#ffffff" stroke="${scoreColor}" stroke-width="3" />
      <text x="24" y="82" fill="${GREEN}" font-size="10.5" font-weight="600">${esc(ar ? 'منخفض (استقرار نسبي)' : '0 · Low Pressure')}</text>
      <text x="272" y="82" fill="#f97316" font-size="10.5" font-weight="600" text-anchor="middle">${esc(ar ? 'متوسط (هبوط متسارع)' : '50 · Accelerated Drift')}</text>
      <text x="520" y="82" fill="${RED}" font-size="10.5" font-weight="600" text-anchor="end">${esc(ar ? 'مرتفع (ضغوط حادة)' : '100 · High Pressure')}</text>
      <text x="${ar ? 520 : 24}" y="108" fill="${MUTED}" font-size="11.5" font-weight="600" text-anchor="${ar ? 'end' : 'start'}">${esc(localizedRiskLabel)}</text>

      <line x1="556" y1="18" x2="556" y2="114" stroke="${LINE}" stroke-width="1" />

      ${
        ar
          ? `<text x="1090" y="30" fill="#ffffff" font-size="14" font-weight="700" text-anchor="end">معدل تذبذب سعر الصرف (ATR 14D مقابل 90D)</text>
             <text x="584" y="30" fill="${CYAN}" font-size="15.5" font-weight="700" text-anchor="start">${(data.atrCompressionRatio * 100).toFixed(1)}% نسبة التذبذب</text>`
          : `<text x="584" y="30" fill="#ffffff" font-size="14" font-weight="700">FX Volatility Regime (14D vs. 90D True Range)</text>
             <text x="1090" y="30" fill="${CYAN}" font-size="15.5" font-weight="700" text-anchor="end">${(data.atrCompressionRatio * 100).toFixed(1)}% Ratio</text>`
      }

      <text x="584" y="64" fill="${SOFT}" font-size="11.5" font-weight="600">14D ATR (${data.atr14.toFixed(2)} EGP)</text>
      <rect x="740" y="52" width="350" height="14" rx="5" fill="#18181b" />
      <rect x="740" y="52" width="${Math.min(350, Math.max(16, (data.atr14 / Math.max(0.4, data.atr90 * 1.3)) * 350)).toFixed(1)}" height="14" rx="5" fill="${CYAN}" />

      <text x="584" y="98" fill="${SOFT}" font-size="11.5" font-weight="600">90D ATR (${data.atr90.toFixed(2)} EGP)</text>
      <rect x="740" y="86" width="350" height="14" rx="5" fill="#18181b" />
      <rect x="740" y="86" width="${Math.min(350, Math.max(16, (data.atr90 / Math.max(0.4, data.atr90 * 1.3)) * 350)).toFixed(1)}" height="14" rx="5" fill="#71717a" />
    </g>

    ${footerBlock(W, H, ar ? 'نموذج تكنال الرباعي لتسعير العملة · (٣٥٪ تيذر + ٣٠٪ شهادات لندن + ٢٥٪ دولار الصاغة + ١٠٪ الرسمي)' : 'Ticknal 4-Way Currency Triangulation · (35% USDT + 30% London GDR + 25% Sagha Gold + 10% CBE Spot)', ar)}
  `;

  return toBase64Svg(svgShell(W, H, defs, body, ar));
}

/* ───────────────────────────────────────────────────────────────────────────
 * 6. DAILY MARKET SNAPSHOT — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 *    KPI strip (EGX 30 · USD/EGP · Foreign net · Breadth) + EGX trend,
 *    investor flows, USD/EGP trend and breadth panels.
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateMarketSnapshotChartSvg(
  data: MarketSnapshotChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const ar = locale === 'ar';
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;

  type Box = { x: number; y: number; w: number; h: number };
  type TextOpts = { size?: number; weight?: number; fill?: string; anchor?: 'start' | 'end' | 'middle'; raw?: boolean };

  const defs: string[] = [];

  // ── Formatting ────────────────────────────────────────────────────────────
  const fmtNum = (n: number, d = 1) => n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtPct = (n: number) => `\u200E${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toFixed(2)}%\u200E`;
  const fmtMoney = (m: number, signed = true) => {
    const s = signed ? (m > 0 ? '+' : m < 0 ? '-' : '') : '';
    const abs = Math.abs(m);
    if (abs >= 1000) return ar ? `\u200F${s}${(abs / 1000).toFixed(2)} مليار` : `${s}${(abs / 1000).toFixed(2)}B`;
    return ar ? `\u200F${s}${abs.toFixed(1)} مليون` : `${s}${abs.toFixed(1)}M`;
  };
  const tone = (n: number) => (n > 0 ? GREEN : n < 0 ? RED : SOFT);
  // USD/EGP rising means the pound is weakening → warning tone
  const fxTone = (n: number) => (n > 0 ? AMBER : n < 0 ? GREEN : SOFT);

  // ── RTL-aware primitives (charts stay left→right in both locales) ────────
  const mirror = (b: Box): Box => (ar ? { ...b, x: W - b.x - b.w } : b);
  const flipAnchor = (a: 'start' | 'end' | 'middle') => (ar ? (a === 'start' ? 'end' : a === 'end' ? 'start' : 'middle') : a);
  const text = (x: number, y: number, s: string, o: TextOpts = {}) =>
    `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="${o.fill ?? '#ffffff'}" font-size="${o.size ?? 13}" font-weight="${o.weight ?? 600}" text-anchor="${o.anchor ?? 'start'}">${o.raw ? s : esc(s)}</text>`;
  /** Text positioned from the panel's logical start edge (left in EN, right in AR). */
  const lt = (b: Box, lx: number, ly: number, s: string, o: TextOpts = {}) =>
    text(ar ? b.x + b.w - lx : b.x + lx, b.y + ly, s, { ...o, anchor: flipAnchor(o.anchor ?? 'start') });
  const frame = (b: Box) =>
    `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.2" />`;
  const hline = (b: Box, ly: number, inset = 20) =>
    `<line x1="${b.x + inset}" y1="${b.y + ly}" x2="${b.x + b.w - inset}" y2="${b.y + ly}" stroke="${LINE}" stroke-width="1" />`;
  const panelTitle = (b: Box, title: string, aside?: string, asideFill: string = MUTED) =>
    lt(b, 20, 32, title, { size: isSquare ? 16 : 15, weight: 700 }) +
    (aside ? lt(b, b.w - 20, 32, aside, { size: 12.5, weight: 700, fill: asideFill, anchor: 'end' }) : '');

  // ── Line chart (area + high/low markers + last point) ─────────────────────
  const lineChart = (
    gx: number,
    gy: number,
    w: number,
    h: number,
    series: Array<{ date: string; close: number }>,
    color: string,
    id: string,
    decimals: number
  ) => {
    if (series.length < 2) {
      return text(gx + w / 2, gy + h / 2, ar ? 'لا تتوفر بيانات كافية' : 'Not enough history', { size: 12, fill: MUTED, anchor: 'middle' });
    }
    const vals = series.map((p) => p.close);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = (max - min) * 0.18 || max * 0.01 || 1;
    const lo = min - pad;
    const hi = max + pad;
    const X = (i: number) => gx + (i * w) / (vals.length - 1);
    const Y = (v: number) => gy + h - ((v - lo) / (hi - lo)) * h;
    const pts = vals.map((v, i) => `${X(i).toFixed(1)},${Y(v).toFixed(1)}`);
    defs.push(`<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.22" /><stop offset="100%" stop-color="${color}" stop-opacity="0" /></linearGradient>`);
    const area = `M ${X(0).toFixed(1)} ${(gy + h).toFixed(1)} L ${pts.join(' L ')} L ${X(vals.length - 1).toFixed(1)} ${(gy + h).toFixed(1)} Z`;
    const iMax = vals.indexOf(max);
    const iMin = vals.indexOf(min);
    const edgeAnchor = (i: number): 'start' | 'end' | 'middle' => (X(i) < gx + 36 ? 'start' : X(i) > gx + w - 36 ? 'end' : 'middle');
    const last = vals.length - 1;
    const grid = [0, 0.5, 1]
      .map((f) => `<line x1="${gx}" y1="${(gy + h * f).toFixed(1)}" x2="${gx + w}" y2="${(gy + h * f).toFixed(1)}" stroke="${GRID}" stroke-width="1" ${f === 0.5 ? 'stroke-dasharray="3 4"' : ''} />`)
      .join('');
    return `
      ${grid}
      <path d="${area}" fill="url(#${id})" />
      <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
      <circle cx="${X(iMax).toFixed(1)}" cy="${Y(max).toFixed(1)}" r="3" fill="#000000" stroke="${SOFT}" stroke-width="1.5" />
      ${text(X(iMax), Y(max) - 9, fmtNum(max, decimals), { size: 11, fill: SOFT, anchor: edgeAnchor(iMax) })}
      <circle cx="${X(iMin).toFixed(1)}" cy="${Y(min).toFixed(1)}" r="3" fill="#000000" stroke="${SOFT}" stroke-width="1.5" />
      ${text(X(iMin), Y(min) + 18, fmtNum(min, decimals), { size: 11, fill: SOFT, anchor: edgeAnchor(iMin) })}
      <circle cx="${X(last).toFixed(1)}" cy="${Y(vals[last]).toFixed(1)}" r="7" fill="${color}" fill-opacity="0.2" />
      <circle cx="${X(last).toFixed(1)}" cy="${Y(vals[last]).toFixed(1)}" r="3.6" fill="${color}" />
      ${text(gx, gy + h + 18, series[0].date.slice(5), { size: 11, fill: MUTED })}
      ${text(gx + w, gy + h + 18, series[last].date.slice(5), { size: 11, fill: MUTED, anchor: 'end' })}`;
  };

  // ── Copy ──────────────────────────────────────────────────────────────────
  const L = ar
    ? {
        pill: 'ملخص السوق',
        title: 'الملخص اليومي للسوق',
        subtitle: 'المؤشرات · تدفقات المستثمرين · الدولار · حركة الأسهم',
        egx30: 'EGX 30',
        usd: 'الدولار الرسمي · البنك المركزي',
        hotMoney: 'صافي الأموال الساخنة',
        breadth: 'حركة الأسهم',
        turnover: (b: number) => `قيمة تداول الأسهم ${b.toFixed(2)} مليار جنيه`,
        overPeriod: (p: string, n: number) => `${p} خلال ${n} جلسة`,
        split: (s: string, bl: string) => `أسهم ${s} · أذون ${bl}`,
        hotSplit: (f: string, a: string) => `أجانب ${f} · عرب ${a}`,
        rose: (pct: number, total: number) => `صعود ${pct.toFixed(0)}% من ${total} سهماً`,
        egxPanel: (n: number) => `EGX 30 · آخر ${n} جلسة`,
        fromHigh: (p: string) => `${p} من القمة`,
        flowsPanel: 'صافي التعاملات حسب الجنسية',
        flowsAside: 'اليوم · جنيه',
        foreign: 'الأجانب',
        arab: 'العرب',
        egyptian: 'المصريون',
        hot30: 'الأموال الساخنة (أجانب + عرب) · 30 جلسة',
        hotDays: (i: number, o: number) => `${i} جلسة دخول · ${o} جلسة خروج`,
        usdPanel: (n: number) => `الدولار / الجنيه · آخر ${n} جلسة`,
        fair: (v: number, sp: string) => `القيمة العادلة (تكنال) ${v.toFixed(2)} · فارق ${sp}`,
        official: 'سعر الإغلاق الرسمي للبنك المركزي',
        breadthPanel: 'حركة الأسهم',
        ad: (r: string) => `${r}x صعود`,
        up: 'صاعد',
        flat: 'ثابت',
        down: 'هابط',
        topG: 'الأعلى ارتفاعاً',
        topL: 'الأكثر تراجعاً',
        footer: 'المصادر: البورصة المصرية والبنك المركزي · صافي التدفقات يشمل الأسهم وأذون الخزانة',
      }
    : {
        pill: 'Market Snapshot',
        title: 'Daily Market Snapshot',
        subtitle: 'Indices · investor flows · USD/EGP · breadth',
        egx30: 'EGX 30',
        usd: 'USD/EGP · CBE official',
        hotMoney: 'Hot money net · all markets',
        breadth: 'Advancers / decliners',
        turnover: (b: number) => `Equity turnover ${b.toFixed(2)}B EGP`,
        overPeriod: (p: string, n: number) => `${p} over ${n} sessions`,
        split: (s: string, bl: string) => `Stocks ${s} · T-bills ${bl}`,
        hotSplit: (f: string, a: string) => `Foreign ${f} · Arab ${a}`,
        rose: (pct: number, total: number) => `${pct.toFixed(0)}% of ${total} stocks rose`,
        egxPanel: (n: number) => `EGX 30 · last ${n} sessions`,
        fromHigh: (p: string) => `${p} from high`,
        flowsPanel: 'Net flow by investor',
        flowsAside: 'Today · EGP',
        foreign: 'Foreigners',
        arab: 'Arabs',
        egyptian: 'Egyptians',
        hot30: 'Hot money (foreign + Arab) · 30 sessions',
        hotDays: (i: number, o: number) => `${i} inflow · ${o} outflow sessions`,
        usdPanel: (n: number) => `USD/EGP · last ${n} sessions`,
        fair: (v: number, sp: string) => `Ticknal fair value ${v.toFixed(2)} · spread ${sp}`,
        official: 'Official CBE closing rate',
        breadthPanel: 'Market breadth',
        ad: (r: string) => `A/D ${r}x`,
        up: 'up',
        flat: 'flat',
        down: 'down',
        topG: 'Top gainer',
        topL: 'Top decliner',
        footer: 'Sources: EGX, CBE · Net flows include listed stocks and T-bills',
      };

  // ── Derived metrics ───────────────────────────────────────────────────────
  const totalStocks = Math.max(1, data.advancers + data.decliners + data.flat);
  const advPct = (data.advancers / totalStocks) * 100;
  const adRatio = (data.advancers / Math.max(1, data.decliners)).toFixed(2);
  const egxHist = data.egx30History;
  const egxHigh = egxHist.length ? Math.max(...egxHist.map((p) => p.close)) : data.egx30.close;
  const fromHighPct = egxHigh > 0 ? ((data.egx30.close - egxHigh) / egxHigh) * 100 : 0;
  const usdHist = data.usdHistory;
  const usdPeriodPct = usdHist.length >= 2 && usdHist[0].close > 0 ? ((data.usdClose - usdHist[0].close) / usdHist[0].close) * 100 : 0;

  // ── KPI tile ──────────────────────────────────────────────────────────────
  const kpi = (b: Box, label: string, value: string, valueFill: string, delta: string | undefined, deltaFill: string, sub: string, rawValue = false) => {
    const vSize = isSquare ? 34 : 29;
    return `
      ${frame(b)}
      ${lt(b, 20, 30, label, { size: 13, weight: 600, fill: SOFT })}
      ${delta ? lt(b, b.w - 20, 30, delta, { size: 14, weight: 700, fill: deltaFill, anchor: 'end' }) : ''}
      ${lt(b, 20, isSquare ? 72 : 68, value, { size: vSize, weight: 700, fill: valueFill, raw: rawValue })}
      ${lt(b, 20, b.h - 16, sub, { size: 12, weight: 500, fill: MUTED })}`;
  };

  const breadthValue = `<tspan fill="${GREEN}">${data.advancers}</tspan><tspan fill="${MUTED}"> / </tspan><tspan fill="${RED}">${data.decliners}</tspan>`;

  const todayHotMoneyM = Number((data.foreign.totalM + data.arab.totalM).toFixed(1));

  const kpiTiles = (boxes: Box[]) =>
    kpi(boxes[0], L.egx30, fmtNum(data.egx30.close), '#ffffff', fmtPct(data.egx30.changePct), tone(data.egx30.changePct), L.turnover(data.equityTurnoverBillion)) +
    kpi(boxes[1], L.usd, data.usdClose.toFixed(2), '#ffffff', fmtPct(data.usdChangePct), fxTone(data.usdChangePct), L.overPeriod(fmtPct(usdPeriodPct), usdHist.length)) +
    kpi(boxes[2], L.hotMoney, fmtMoney(todayHotMoneyM), tone(todayHotMoneyM), undefined, MUTED, L.hotSplit(fmtMoney(data.foreign.totalM), fmtMoney(data.arab.totalM))) +
    kpi(boxes[3], L.breadth, breadthValue, '#ffffff', L.ad(adRatio), Number(adRatio) >= 1 ? GREEN : RED, L.rose(advPct, totalStocks), true);

  // ── EGX panel ─────────────────────────────────────────────────────────────
  const egxPanel = (b: Box) => {
    const rowsH = 96;
    const chartTop = 58;
    const chartH = b.h - chartTop - rowsH - 26;
    const row = (ly: number, name: string, p: SnapshotIndexPoint) =>
      lt(b, 20, ly, name, { size: 13.5, weight: 600, fill: SOFT }) +
      lt(b, b.w - 96, ly, fmtNum(p.close), { size: 14, weight: 700, anchor: 'end' }) +
      lt(b, b.w - 20, ly, fmtPct(p.changePct), { size: 13.5, weight: 700, fill: tone(p.changePct), anchor: 'end' });
    return `
      ${frame(b)}
      ${panelTitle(b, L.egxPanel(egxHist.length), L.fromHigh(fmtPct(fromHighPct)), fromHighPct < -0.005 ? RED : SOFT)}
      ${lineChart(b.x + 20, b.y + chartTop, b.w - 40, chartH, egxHist, data.egx30.changePct >= 0 ? GREEN : RED, `snapEgx${isSquare ? 'Sq' : 'W'}${ar ? 'Ar' : 'En'}`, 0)}
      ${hline(b, b.h - rowsH)}
      ${row(b.h - rowsH + 36, 'EGX 70 EWI', data.egx70)}
      ${row(b.h - rowsH + 72, 'EGX 100 EWI', data.egx100)}`;
  };

  // ── Investor flows panel ──────────────────────────────────────────────────
  const flowsPanel = (b: Box) => {
    const top = 56;
    const bottomH = 84;
    const rowH = (b.h - top - bottomH) / 3;
    const rows: Array<[string, SnapshotFlowSplit]> = [
      [L.foreign, data.foreign],
      [L.arab, data.arab],
      [L.egyptian, data.egyptian],
    ];
    const maxAbs = Math.max(1, ...rows.map(([, f]) => Math.abs(f.totalM)));
    const barX = b.x + 20;
    const barW = b.w - 40;
    const cx = barX + barW / 2;
    const body = rows
      .map(([name, f], i) => {
        const y0 = top + i * rowH;
        const len = Math.max(3, (Math.abs(f.totalM) / maxAbs) * (barW / 2));
        // Negative extends left, positive extends right (both locales)
        const bx = f.totalM >= 0 ? cx : cx - len;
        const by = b.y + y0 + 26;
        return `
          ${lt(b, 20, y0 + 16, name, { size: 13.5, weight: 600, fill: SOFT })}
          ${lt(b, b.w - 20, y0 + 16, fmtMoney(f.totalM), { size: 15, weight: 700, fill: tone(f.totalM), anchor: 'end' })}
          <line x1="${barX}" y1="${by + 4}" x2="${barX + barW}" y2="${by + 4}" stroke="${LINE}" stroke-width="1" />
          <rect x="${bx.toFixed(1)}" y="${by}" width="${len.toFixed(1)}" height="8" rx="4" fill="${tone(f.totalM)}" />
          <line x1="${cx}" y1="${by - 4}" x2="${cx}" y2="${by + 12}" stroke="#3f3f46" stroke-width="1" />
          ${lt(b, 20, y0 + 52, L.split(fmtMoney(f.stocksM), fmtMoney(f.billsM)), { size: 11.5, weight: 500, fill: MUTED })}`;
      })
      .join('');
    return `
      ${frame(b)}
      ${panelTitle(b, L.flowsPanel, L.flowsAside)}
      ${body}
      ${hline(b, b.h - bottomH + 6)}
      ${lt(b, 20, b.h - bottomH + 34, L.hot30, { size: 12, weight: 600, fill: SOFT })}
      ${lt(b, b.w - 20, b.h - 24, fmtMoney(data.hotMoney30dNetMillion), { size: 17, weight: 700, fill: tone(data.hotMoney30dNetMillion), anchor: 'end' })}
      ${lt(b, 20, b.h - 24, L.hotDays(data.hotMoney30dInflowDays, data.hotMoney30dOutflowDays), { size: 11.5, weight: 500, fill: MUTED })}`;
  };

  // ── USD/EGP section ───────────────────────────────────────────────────────
  const usdSection = (b: Box, framed: boolean) => {
    const chartTop = 56;
    const chartH = b.h - chartTop - 56;
    const foot =
      typeof data.usdFairValue === 'number' && data.usdFairValue > 0
        ? L.fair(data.usdFairValue, fmtPct(((data.usdFairValue - data.usdClose) / data.usdClose) * 100))
        : L.official;
    return `
      ${framed ? frame(b) : ''}
      ${panelTitle(b, L.usdPanel(usdHist.length), fmtPct(usdPeriodPct), fxTone(usdPeriodPct))}
      ${lineChart(b.x + 20, b.y + chartTop, b.w - 40, chartH, usdHist, AMBER, `snapUsd${isSquare ? 'Sq' : 'W'}${ar ? 'Ar' : 'En'}`, 2)}
      ${lt(b, 20, b.h - 12, foot, { size: 11.5, weight: 500, fill: MUTED })}`;
  };

  // ── Breadth section ───────────────────────────────────────────────────────
  const breadthSection = (b: Box, framed: boolean) => {
    const barX = b.x + 20;
    const barW = b.w - 40;
    const gap = 3;
    const usable = barW - gap * 2;
    const wa = (data.advancers / totalStocks) * usable;
    const wf = (data.flat / totalStocks) * usable;
    const wd = (data.decliners / totalStocks) * usable;
    // Advancers sit on the logical start edge
    const segs = ar
      ? [{ w: wd, c: RED }, { w: wf, c: '#52525b' }, { w: wa, c: GREEN }]
      : [{ w: wa, c: GREEN }, { w: wf, c: '#52525b' }, { w: wd, c: RED }];
    let cursor = barX;
    const bars = segs
      .map((s) => {
        const r = s.w > 0.5 ? `<rect x="${cursor.toFixed(1)}" y="${b.y + 50}" width="${Math.max(0, s.w).toFixed(1)}" height="12" rx="3" fill="${s.c}" />` : '';
        cursor += s.w + gap;
        return r;
      })
      .join('');
    const pct = (n: number) => `${((n / totalStocks) * 100).toFixed(0)}%`;
    const movers =
      data.topGainer && data.topLoser
        ? `
          ${lt(b, 20, b.h - 38, L.topG, { size: 11.5, weight: 500, fill: MUTED })}
          ${lt(b, 20, b.h - 16, `${data.topGainer.ticker}  ${fmtPct(data.topGainer.changePct)}`, { size: 14, weight: 700, fill: GREEN })}
          ${lt(b, b.w - 20, b.h - 38, L.topL, { size: 11.5, weight: 500, fill: MUTED, anchor: 'end' })}
          ${lt(b, b.w - 20, b.h - 16, `${data.topLoser.ticker}  ${fmtPct(data.topLoser.changePct)}`, { size: 14, weight: 700, fill: RED, anchor: 'end' })}`
        : '';
    return `
      ${framed ? frame(b) : ''}
      ${panelTitle(b, L.breadthPanel, L.ad(adRatio), Number(adRatio) >= 1 ? GREEN : RED)}
      ${bars}
      ${lt(b, 20, 86, ar ? `${data.advancers} صاعد (\u200E${pct(data.advancers)}\u200E)` : `${data.advancers} ${L.up} · ${pct(data.advancers)}`, { size: 12.5, weight: 700, fill: GREEN })}
      ${lt(b, b.w / 2, 86, `${data.flat} ${L.flat}`, { size: 12.5, weight: 600, fill: SOFT, anchor: 'middle' })}
      ${lt(b, b.w - 20, 86, ar ? `${data.decliners} هابط (\u200E${pct(data.decliners)}\u200E)` : `${data.decliners} ${L.down} · ${pct(data.decliners)}`, { size: 12.5, weight: 700, fill: RED, anchor: 'end' })}
      ${movers}`;
  };

  const header = headerBlock(W, L.title, L.subtitle, data.date, L.pill, undefined, undefined, ar);
  const footer = footerBlock(W, H, L.footer, ar);

  let body: string;
  if (!isSquare) {
    const kpiW = (1116 - 3 * 16) / 4;
    const kpiBoxes = [0, 1, 2, 3].map((i) => mirror({ x: 42 + i * (kpiW + 16), y: 152, w: kpiW, h: 100 }));
    const colW = (1116 - 2 * 16) / 3;
    const top = 268;
    const h = 348;
    const egxBox = mirror({ x: 42, y: top, w: colW, h });
    const flowsBox = mirror({ x: 42 + colW + 16, y: top, w: colW, h });
    const rightBox = mirror({ x: 42 + 2 * (colW + 16), y: top, w: colW, h });
    const usdH = 196;
    const usdBox = { ...rightBox, h: usdH };
    const brBox = { ...rightBox, y: rightBox.y + usdH, h: h - usdH };
    body = `
      ${header}
      ${kpiTiles(kpiBoxes)}
      ${egxPanel(egxBox)}
      ${flowsPanel(flowsBox)}
      ${frame(rightBox)}
      ${usdSection(usdBox, false)}
      ${hline(rightBox, usdH)}
      ${breadthSection(brBox, false)}
      ${footer}`;
  } else {
    const kpiW = (996 - 16) / 2;
    const kpiBoxes = [
      { x: 42, y: 152, w: kpiW, h: 104 },
      { x: 42 + kpiW + 16, y: 152, w: kpiW, h: 104 },
      { x: 42, y: 272, w: kpiW, h: 104 },
      { x: 42 + kpiW + 16, y: 272, w: kpiW, h: 104 },
    ].map(mirror);
    const colW = kpiW;
    const egxBox = mirror({ x: 42, y: 392, w: colW, h: 318 });
    const flowsBox = mirror({ x: 42 + colW + 16, y: 392, w: colW, h: 318 });
    const usdBox = mirror({ x: 42, y: 726, w: colW, h: 290 });
    const brBox = mirror({ x: 42 + colW + 16, y: 726, w: colW, h: 290 });
    body = `
      ${header}
      ${kpiTiles(kpiBoxes)}
      ${egxPanel(egxBox)}
      ${flowsPanel(flowsBox)}
      ${usdSection(usdBox, true)}
      ${breadthSection(brBox, true)}
      ${footer}`;
  }

  return toBase64Svg(svgShell(W, H, defs.join(''), body, ar));
}

export const generateInvestorFlowsChartSvg = generateHotMoneyChartSvg;
export const generateEgx30ChartSvg = generateTradeSummaryChartSvg;
export const generateFxArbitrageChartSvg = generateUsdEgpUpdateChartSvg;

/* ───────────────────────────────────────────────────────────────────────────
 * 6. TREND & BREAKOUTS — Wide (1200x675 16:9) & Square (1080x1080 1:1)
 * ─────────────────────────────────────────────────────────────────────────── */
export function generateTrendBreakoutsChartSvg(
  data: TrendBreakoutsChartData,
  locale: 'en' | 'ar' = 'en',
  variant: ChartVariant = 'wide'
): string {
  const isSquare = variant === 'square';
  const W = isSquare ? 1080 : 1200;
  const H = isSquare ? 1080 : 675;
  const ar = locale === 'ar';

  const net20 = data.new20dHighs - data.new20dLows;
  const isNetBullish = net20 >= 0;
  const statusColor = isNetBullish ? GREEN : RED;
  const statusBadge = isNetBullish
    ? ar ? `توسع في القمم (+${net20})` : `BULLISH EXPANSION (+${net20} NET NH)`
    : ar ? `سيطرة القيعان (${net20})` : `BREAKDOWN DOMINANCE (${net20} NET NL)`;

  const hist =
    data.history10d && data.history10d.length >= 2
      ? data.history10d
      : [{
          date: data.date.slice(5),
          new20dHighs: data.new20dHighs,
          new20dLows: data.new20dLows,
          net20d: net20,
          aboveSma50Pct: data.aboveSma50Pct,
          total: data.totalStocks,
        }];

  const horizons = [
    {
      labelEn: '20-Day (1-Month)',
      labelAr: '٢٠ جلسة (شهر واحد)',
      highs: data.new20dHighs,
      highsPct: data.new20dHighsPct,
      lows: data.new20dLows,
      lowsPct: data.new20dLowsPct,
    },
    {
      labelEn: '60-Day (3-Month)',
      labelAr: '٦٠ جلسة (٣ أشهر)',
      highs: data.new60dHighs,
      highsPct: data.new60dHighsPct,
      lows: data.new60dLows,
      lowsPct: data.new60dLowsPct,
    },
    {
      labelEn: '52-Week (1-Year)',
      labelAr: '٥٢ أسبوعاً (سنة)',
      highs: data.new52wHighs,
      highsPct: data.new52wHighsPct,
      lows: data.new52wLows,
      lowsPct: data.new52wLowsPct,
    },
  ];

  const smas = [
    { labelEn: 'Above 20D SMA (Short-Term)', labelAr: 'أعلى من متوسط ٢٠ يوم (قصير الأجل)', count: data.aboveSma20, pct: data.aboveSma20Pct, color: CYAN },
    { labelEn: 'Above 50D SMA (Medium-Term)', labelAr: 'أعلى من متوسط ٥٠ يوم (متوسط الأجل)', count: data.aboveSma50, pct: data.aboveSma50Pct, color: GREEN },
    { labelEn: 'Above 200D SMA (Long-Term)', labelAr: 'أعلى من متوسط ٢٠٠ يوم (طويل الأجل)', count: data.aboveSma200, pct: data.aboveSma200Pct, color: AMBER },
  ];

  const breakouts = (data.topBreakouts || []).slice(0, 3);
  const breakdowns = (data.topBreakdowns || []).slice(0, 3);

  // Common Header & Footer
  const header = headerBlock(
    W,
    ar ? 'اتجاهات واختراقات السوق: القمم والقيعان ومسار الأسهم' : 'EGX Trend & Breakouts: New Highs / Lows & Regimes',
    ar ? `رصد اختراق القمم وكسر القيعان ومستويات المتوسطات عبر ${data.totalStocks} سهم مقيد` : `Multi-horizon structural breakouts across ${data.totalStocks} listed equities and moving average regimes`,
    data.date,
    ar ? 'اختراقات المسار' : 'Trend & Breakouts',
    statusBadge,
    statusColor,
    ar
  );

  const footer = footerBlock(
    W,
    H,
    ar ? 'بيانات القمم والقيعان والمتوسطات المتحركة الفعلية (دون الصناديق) · محرك تكنال الكمي' : 'Verified Donchian Highs/Lows & Moving Average Breadth · Ticknal Quantitative Engine',
    ar
  );

  if (isSquare) {
    // ── 1:1 SQUARE LAYOUT (1080 x 1080) ──
    // Horizon Breakout Matrix Cards (Top Left: 476 x 270)
    const hzRows = horizons
      .map((h, i) => {
        const y = 46 + i * 70;
        const diff = h.highs - h.lows;
        const diffColor = diff >= 0 ? GREEN : RED;
        return `
        <g transform="translate(16, ${y})">
          <rect width="444" height="60" rx="8" fill="#0d0d0e" stroke="${LINE}" stroke-width="1" />
          <text x="${ar ? 426 : 14}" y="22" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? h.labelAr : h.labelEn)}</text>
          <text x="${ar ? 14 : 426}" y="22" fill="${diffColor}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'start' : 'end'}">${diff >= 0 ? '+' : ''}${diff} Net</text>
          
          <g transform="translate(14, 32)">
            <text x="${ar ? 400 : 0}" y="15" fill="${GREEN}" font-size="13" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${h.highs} <tspan font-size="11" fill="${MUTED}">(${h.highsPct}%)</tspan></text>
            <text x="${ar ? 0 : 400}" y="15" fill="${RED}" font-size="13" font-weight="700" text-anchor="${ar ? 'start' : 'end'}">▼ ${h.lows} <tspan font-size="11" fill="${MUTED}">(${h.lowsPct}%)</tspan></text>
          </g>
        </g>`;
      })
      .join('');

    // SMA Regime Cards (Top Right: 504 x 270)
    const smaBars = smas
      .map((s, i) => {
        const y = 46 + i * 70;
        const barW = 460;
        const fillW = Math.max(3, (s.pct / 100) * barW);
        return `
        <g transform="translate(20, ${y})">
          <text x="${ar ? barW : 0}" y="18" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? s.labelAr : s.labelEn)}</text>
          <text x="${ar ? 0 : barW}" y="18" fill="${s.color}" font-size="13.5" font-weight="700" text-anchor="${ar ? 'start' : 'end'}">${s.pct}% <tspan font-size="11" fill="${MUTED}">(${s.count})</tspan></text>
          <rect x="0" y="28" width="${barW}" height="14" rx="4" fill="#18181b" />
          <rect x="${ar ? (barW - fillW).toFixed(1) : '0'}" y="28" width="${fillW.toFixed(1)}" height="14" rx="4" fill="${s.color}" />
        </g>`;
      })
      .join('');

    // Bottom Historical Diverging NH vs NL Chart (996 x 450)
    const chX = 64;
    const chW = 868;
    const chY = 64;
    const chH = 260;
    const zeroY = chY + chH / 2;
    const maxBarVal = Math.max(10, ...hist.map((h) => Math.max(h.new20dHighs, h.new20dLows)));
    const step = hist.length > 0 ? chW / hist.length : chW;
    const bW = Math.max(18, Math.min(48, step * 0.48));

    const histDivergingBars = hist
      .map((h, i) => {
        const cx = chX + i * step + step / 2;
        const bx = cx - bW / 2;
        const hH = (h.new20dHighs / maxBarVal) * (chH / 2 - 16);
        const lH = (h.new20dLows / maxBarVal) * (chH / 2 - 16);
        return `
        <g>
          <rect x="${bx.toFixed(1)}" y="${(zeroY - hH).toFixed(1)}" width="${bW.toFixed(1)}" height="${Math.max(1, hH).toFixed(1)}" rx="3" fill="${GREEN}" />
          <rect x="${bx.toFixed(1)}" y="${zeroY.toFixed(1)}" width="${bW.toFixed(1)}" height="${Math.max(1, lH).toFixed(1)}" rx="3" fill="${RED}" />
          <text x="${cx.toFixed(1)}" y="${(chY + chH + 20).toFixed(1)}" fill="${MUTED}" font-size="11" font-weight="600" text-anchor="middle">${esc(h.date)}</text>
        </g>`;
      })
      .join('');

    // SMA50% Overlay Line
    const smaPts = hist.map((h, i) => {
      const x = chX + i * step + step / 2;
      const y = chY + chH - (h.aboveSma50Pct / 100) * chH;
      return { x, y, pct: h.aboveSma50Pct };
    });
    const smaPoly = smaPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // Breakouts & Breakdowns Summary
    const moversText = `
      <g transform="translate(42, 930)">
        <rect width="996" height="68" rx="10" fill="#0c0c0e" stroke="${LINE}" stroke-width="1" />
        <text x="${ar ? 974 : 20}" y="26" fill="${GREEN}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${esc(ar ? 'أبرز اختراقات القمم:' : 'KEY BREAKOUTS:')} <tspan fill="#ffffff">${breakouts.map((b) => `${b.ticker} (+${b.changePct}%)`).join('  ') || (ar ? 'لا يوجد' : 'None')}</tspan></text>
        <text x="${ar ? 974 : 20}" y="50" fill="${RED}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▼ ${esc(ar ? 'أبرز كسر القيعان:' : 'KEY BREAKDOWNS:')} <tspan fill="#ffffff">${breakdowns.map((b) => `${b.ticker} (${b.changePct}%)`).join('  ') || (ar ? 'لا يوجد' : 'None')}</tspan></text>
      </g>`;

    const sqBody = `
      ${header}

      <!-- Top Left: Multi-Horizon Highs vs Lows (476 x 272) -->
      <g transform="translate(42, 156)">
        <rect width="476" height="272" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        <text x="${ar ? 454 : 20}" y="30" fill="#ffffff" font-size="15" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'القمم والقيعان متعددة الآجال' : 'Multi-Horizon New Highs / Lows')}</text>
        ${hzRows}
      </g>

      <!-- Top Right: Moving Average Trend Regimes (504 x 272) -->
      <g transform="translate(534, 156)">
        <rect width="504" height="272" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        <text x="${ar ? 480 : 20}" y="30" fill="#ffffff" font-size="15" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'نسبة الأسهم أعلى المتوسطات المتحركة' : '% of Equities Above Moving Averages')}</text>
        ${smaBars}
      </g>

      <!-- Bottom: 10-Session NH vs NL Divergence Chart (996 x 460) -->
      <g transform="translate(42, 448)">
        <rect width="996" height="460" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
        ${
          ar
            ? `<text x="970" y="34" fill="#ffffff" font-size="16" font-weight="700" text-anchor="end">مسار القمم والقيعان (آخر ١٠ جلسات · قمة/قاع ٢٠ يوماً)</text>
               <rect x="26" y="22" width="12" height="12" rx="2.5" fill="${GREEN}" /><text x="44" y="32" fill="${SOFT}" font-size="11.5" font-weight="700">قمم جديدة (+)</text>
               <rect x="150" y="22" width="12" height="12" rx="2.5" fill="${RED}" /><text x="168" y="32" fill="${SOFT}" font-size="11.5" font-weight="700">قيعان جديدة (-)</text>
               <line x1="274" y1="28" x2="298" y2="28" stroke="${CYAN}" stroke-width="2.5" /><text x="306" y="32" fill="${CYAN}" font-size="11.5" font-weight="700">أعلى من متوسط 50D %</text>`
            : `<text x="26" y="34" fill="#ffffff" font-size="16" font-weight="700">10-Session New Highs vs. Lows Trajectory &amp; 50D SMA Breadth</text>
               <rect x="580" y="22" width="12" height="12" rx="2.5" fill="${GREEN}" /><text x="598" y="32" fill="${SOFT}" font-size="11.5" font-weight="600">20D Highs (+)</text>
               <rect x="700" y="22" width="12" height="12" rx="2.5" fill="${RED}" /><text x="718" y="32" fill="${SOFT}" font-size="11.5" font-weight="600">20D Lows (-)</text>
               <line x1="816" y1="28" x2="840" y2="28" stroke="${CYAN}" stroke-width="2.5" /><text x="848" y="32" fill="${CYAN}" font-size="11.5" font-weight="700">% Above 50D SMA</text>`
        }

        <line x1="${chX}" y1="${zeroY.toFixed(1)}" x2="${(chX + chW).toFixed(1)}" y2="${zeroY.toFixed(1)}" stroke="#333338" stroke-width="1.2" stroke-dasharray="4 4" />
        <line x1="${chX}" y1="${chY}" x2="${(chX + chW).toFixed(1)}" y2="${chY}" stroke="${GRID}" stroke-width="1" />
        <line x1="${chX}" y1="${chY + chH}" x2="${(chX + chW).toFixed(1)}" y2="${chY + chH}" stroke="${GRID}" stroke-width="1" />

        <text x="${chX - 10}" y="${chY + 12}" fill="${GREEN}" font-size="11" font-weight="700" text-anchor="end">+${maxBarVal} NH</text>
        <text x="${chX - 10}" y="${(zeroY + 4).toFixed(1)}" fill="${SOFT}" font-size="11" text-anchor="end">0</text>
        <text x="${chX - 10}" y="${chY + chH}" fill="${RED}" font-size="11" font-weight="700" text-anchor="end">-${maxBarVal} NL</text>

        ${histDivergingBars}
        ${smaPts.length > 1 ? `<polyline points="${smaPoly}" fill="none" stroke="${CYAN}" stroke-width="2.5" stroke-dasharray="4 3" stroke-linejoin="round" />` : ''}
        ${smaPts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3.5" fill="${CYAN}" />`).join('')}

        <text x="${(chX + chW + 8).toFixed(1)}" y="${chY + 12}" fill="${CYAN}" font-size="10.5" font-weight="600">100%</text>
        <text x="${(chX + chW + 8).toFixed(1)}" y="${(zeroY + 4).toFixed(1)}" fill="${CYAN}" font-size="10.5" font-weight="600">50%</text>
        <text x="${(chX + chW + 8).toFixed(1)}" y="${chY + chH}" fill="${CYAN}" font-size="10.5" font-weight="600">0%</text>
      </g>

      ${moversText}
      ${footer}
    `;

    return toBase64Svg(svgShell(W, H, '', sqBody, ar));
  }

  // ── 16:9 WIDE DESKTOP LAYOUT (1200 x 675) ──
  // Left Column (Horizons + Regimes: 540 x 448)
  const wHzRows = horizons
    .map((h, i) => {
      const y = 40 + i * 52;
      const diff = h.highs - h.lows;
      const diffColor = diff >= 0 ? GREEN : RED;
      return `
      <g transform="translate(16, ${y})">
        <rect width="508" height="46" rx="8" fill="#0d0d0e" stroke="${LINE}" stroke-width="1" />
        <text x="${ar ? 490 : 14}" y="19" fill="${SOFT}" font-size="12" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? h.labelAr : h.labelEn)}</text>
        <text x="${ar ? 14 : 490}" y="19" fill="${diffColor}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'start' : 'end'}">${diff >= 0 ? '+' : ''}${diff} Net</text>
        
        <g transform="translate(14, 25)">
          <text x="${ar ? 462 : 0}" y="13" fill="${GREEN}" font-size="12.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${h.highs} <tspan font-size="10.5" fill="${MUTED}">(${h.highsPct}%)</tspan></text>
          <text x="${ar ? 0 : 462}" y="13" fill="${RED}" font-size="12.5" font-weight="700" text-anchor="${ar ? 'start' : 'end'}">▼ ${h.lows} <tspan font-size="10.5" fill="${MUTED}">(${h.lowsPct}%)</tspan></text>
        </g>
      </g>`;
    })
    .join('');

  const wSmaBars = smas
    .map((s, i) => {
      const y = 246 + i * 58;
      const barW = 508;
      const fillW = Math.max(3, (s.pct / 100) * barW);
      return `
      <g transform="translate(16, ${y})">
        <text x="${ar ? barW : 0}" y="16" fill="${SOFT}" font-size="11.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? s.labelAr : s.labelEn)}</text>
        <text x="${ar ? 0 : barW}" y="16" fill="${s.color}" font-size="12.5" font-weight="700" text-anchor="${ar ? 'start' : 'end'}">${s.pct}% <tspan font-size="10.5" fill="${MUTED}">(${s.count})</tspan></text>
        <rect x="0" y="24" width="${barW}" height="12" rx="3.5" fill="#18181b" />
        <rect x="${ar ? (barW - fillW).toFixed(1) : '0'}" y="24" width="${fillW.toFixed(1)}" height="12" rx="3.5" fill="${s.color}" />
      </g>`;
    })
    .join('');

  // Right Column (Historical Diverging NH-NL Chart: 560 x 368 + Tickers Box 560 x 68)
  const rChX = 52;
  const rChW = 468;
  const rChY = 56;
  const rChH = 220;
  const rZeroY = rChY + rChH / 2;
  const rMaxVal = Math.max(10, ...hist.map((h) => Math.max(h.new20dHighs, h.new20dLows)));
  const rStep = hist.length > 0 ? rChW / hist.length : rChW;
  const rBarW = Math.max(16, Math.min(36, rStep * 0.52));

  const rHistBars = hist
    .map((h, i) => {
      const cx = rChX + i * rStep + rStep / 2;
      const bx = cx - rBarW / 2;
      const hH = (h.new20dHighs / rMaxVal) * (rChH / 2 - 14);
      const lH = (h.new20dLows / rMaxVal) * (rChH / 2 - 14);
      return `
      <g>
        <rect x="${bx.toFixed(1)}" y="${(rZeroY - hH).toFixed(1)}" width="${rBarW.toFixed(1)}" height="${Math.max(1, hH).toFixed(1)}" rx="2.5" fill="${GREEN}" />
        <rect x="${bx.toFixed(1)}" y="${rZeroY.toFixed(1)}" width="${rBarW.toFixed(1)}" height="${Math.max(1, lH).toFixed(1)}" rx="2.5" fill="${RED}" />
        <text x="${cx.toFixed(1)}" y="${(rChY + rChH + 18).toFixed(1)}" fill="${MUTED}" font-size="10" font-weight="600" text-anchor="middle">${esc(h.date)}</text>
      </g>`;
    })
    .join('');

  const rSmaPts = hist.map((h, i) => {
    const x = rChX + i * rStep + rStep / 2;
    const y = rChY + rChH - (h.aboveSma50Pct / 100) * rChH;
    return { x, y, pct: h.aboveSma50Pct };
  });
  const rSmaPoly = rSmaPts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const wideMovers = `
    <g transform="translate(598, 534)">
      <rect width="560" height="68" rx="10" fill="#0c0c0e" stroke="${LINE}" stroke-width="1" />
      <text x="${ar ? 540 : 16}" y="26" fill="${GREEN}" font-size="11" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▲ ${esc(ar ? 'أبرز اختراقات القمم:' : 'KEY BREAKOUTS:')} <tspan fill="#ffffff">${breakouts.map((b) => `${b.ticker} (+${b.changePct}%)`).join('  ') || (ar ? 'لا يوجد' : 'None')}</tspan></text>
      <text x="${ar ? 540 : 16}" y="50" fill="${RED}" font-size="11" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">▼ ${esc(ar ? 'أبرز كسر القيعان:' : 'KEY BREAKDOWNS:')} <tspan fill="#ffffff">${breakdowns.map((b) => `${b.ticker} (${b.changePct}%)`).join('  ') || (ar ? 'لا يوجد' : 'None')}</tspan></text>
    </g>`;

  const body = `
    ${header}

    <!-- Left Box: Horizons + Moving Averages (540 x 448) -->
    <g transform="translate(42, 154)">
      <rect width="540" height="448" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <text x="${ar ? 516 : 20}" y="28" fill="#ffffff" font-size="14" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'القمم والقيعان متعددة الآجال (Donchian Highs/Lows)' : 'Multi-Horizon Breakouts (Donchian Highs/Lows)')}</text>
      ${wHzRows}

      <line x1="20" y1="204" x2="520" y2="204" stroke="${LINE}" stroke-width="1" />
      <text x="${ar ? 516 : 20}" y="226" fill="#ffffff" font-size="13.5" font-weight="700" text-anchor="${ar ? 'end' : 'start'}">${esc(ar ? 'نسبة الأسهم أعلى المتوسطات المتحركة' : '% of Equities Above Moving Averages')}</text>
      ${wSmaBars}
    </g>

    <!-- Right Box: 10-Session Historical NH vs NL Chart (560 x 366) -->
    <g transform="translate(598, 154)">
      <rect width="560" height="366" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${
        ar
          ? `<text x="536" y="28" fill="#ffffff" font-size="13.5" font-weight="700" text-anchor="end">مسار القمم والقيعان (آخر ١٠ جلسات)</text>
             <rect x="20" y="18" width="10" height="10" rx="2" fill="${GREEN}" /><text x="36" y="27" fill="${SOFT}" font-size="10.5" font-weight="700">قمم (+)</text>
             <rect x="96" y="18" width="10" height="10" rx="2" fill="${RED}" /><text x="112" y="27" fill="${SOFT}" font-size="10.5" font-weight="700">قيعان (-)</text>
             <line x1="172" y1="23" x2="192" y2="23" stroke="${CYAN}" stroke-width="2" /><text x="198" y="27" fill="${CYAN}" font-size="10.5" font-weight="700">أعلى من 50D %</text>`
          : `<text x="20" y="28" fill="#ffffff" font-size="13.5" font-weight="700">10-Session NH vs. NL Divergence</text>
             <rect x="270" y="18" width="10" height="10" rx="2" fill="${GREEN}" /><text x="286" y="27" fill="${SOFT}" font-size="10.5" font-weight="600">Highs (+)</text>
             <rect x="360" y="18" width="10" height="10" rx="2" fill="${RED}" /><text x="376" y="27" fill="${SOFT}" font-size="10.5" font-weight="600">Lows (-)</text>
             <line x1="440" y1="23" x2="460" y2="23" stroke="${CYAN}" stroke-width="2" /><text x="466" y="27" fill="${CYAN}" font-size="10.5" font-weight="700">50D SMA %</text>`
      }

      <line x1="${rChX}" y1="${rZeroY.toFixed(1)}" x2="${(rChX + rChW).toFixed(1)}" y2="${rZeroY.toFixed(1)}" stroke="#333338" stroke-width="1" stroke-dasharray="3 3" />
      <line x1="${rChX}" y1="${rChY}" x2="${(rChX + rChW).toFixed(1)}" y2="${rChY}" stroke="${GRID}" stroke-width="1" />
      <line x1="${rChX}" y1="${rChY + rChH}" x2="${(rChX + rChW).toFixed(1)}" y2="${rChY + rChH}" stroke="${GRID}" stroke-width="1" />

      <text x="${rChX - 6}" y="${rChY + 10}" fill="${GREEN}" font-size="10" font-weight="700" text-anchor="end">+${rMaxVal}</text>
      <text x="${rChX - 6}" y="${(rZeroY + 3).toFixed(1)}" fill="${SOFT}" font-size="10" text-anchor="end">0</text>
      <text x="${rChX - 6}" y="${rChY + rChH}" fill="${RED}" font-size="10" font-weight="700" text-anchor="end">-${rMaxVal}</text>

      ${rHistBars}
      ${rSmaPts.length > 1 ? `<polyline points="${rSmaPoly}" fill="none" stroke="${CYAN}" stroke-width="2.2" stroke-dasharray="3 3" stroke-linejoin="round" />` : ''}
      ${rSmaPts.map((p) => `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${CYAN}" />`).join('')}

      <text x="${(rChX + rChW + 6).toFixed(1)}" y="${rChY + 10}" fill="${CYAN}" font-size="9.5">100%</text>
      <text x="${(rChX + rChW + 6).toFixed(1)}" y="${(rZeroY + 3).toFixed(1)}" fill="${CYAN}" font-size="9.5">50%</text>
      <text x="${(rChX + rChW + 6).toFixed(1)}" y="${rChY + rChH}" fill="${CYAN}" font-size="9.5">0%</text>
    </g>

    ${wideMovers}
    ${footer}
  `;

  return toBase64Svg(svgShell(W, H, '', body, ar));
}

export function generateLocalizedTakeBundle<T>(
  generator: (data: T, locale: 'en' | 'ar', variant?: ChartVariant) => string,
  data: T
): string {
  return JSON.stringify({
    en: generator(data, 'en', 'wide'),
    ar: generator(data, 'ar', 'wide'),
    enSquare: generator(data, 'en', 'square'),
    arSquare: generator(data, 'ar', 'square'),
  });
}

export function resolveLocalizedChartSvg(
  rawImageUrl?: string | null,
  targetLocale: string = 'en',
  variant: ChartVariant = 'wide'
): string | null {
  if (!rawImageUrl) return null;
  if (rawImageUrl.startsWith('{') && rawImageUrl.includes('"')) {
    try {
      const parsed = JSON.parse(rawImageUrl);
      if (variant === 'square') {
        if (targetLocale === 'ar' && parsed.arSquare) return parsed.arSquare;
        if (parsed.enSquare) return parsed.enSquare;
      }
      if (targetLocale === 'ar' && parsed.ar) return parsed.ar;
      if (parsed.en) return parsed.en;
      return Object.values(parsed)[0] as string;
    } catch {}
  }
  return rawImageUrl;
}

export function resolveLocalizedChartSvgVariants(
  rawImageUrl?: string | null,
  targetLocale: string = 'en'
): { wideUrl: string | null; squareUrl: string | null } {
  const wideUrl = resolveLocalizedChartSvg(rawImageUrl, targetLocale, 'wide');
  const squareUrl = resolveLocalizedChartSvg(rawImageUrl, targetLocale, 'square') || wideUrl;
  return { wideUrl, squareUrl };
}
