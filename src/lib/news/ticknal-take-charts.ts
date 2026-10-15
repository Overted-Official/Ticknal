/**
 * Ticknal Take 1:1 vector SVG snapshot cards (1080x1080) for web feed + social media.
 * Rules: every piece of text is passed through xmlEscape EXACTLY ONCE (never pre-escape strings),
 * remote images (ticker logos) must be embedded as data URIs because SVGs rendered through <img>
 * cannot load external resources.
 */

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
const MUTED = '#71717a';
const SOFT = '#a1a1aa';
const LINE = '#222222';

export interface HotMoneyChartData {
  date: string;
  totalTurnoverBillion: number;
  todayForeignNetMillion: number;
  todayArabNetMillion: number;
  todayEgyptianNetMillion: number;
  rolling30dForeignNetMillion: number;
  inflowDaysCount: number;
  outflowDaysCount: number;
  isFlightRisk: boolean;
  dailyBars30d: Array<{ date: string; foreignNetMillion: number; cumulativeMillion: number }>;
}

export interface TradeSummaryChartData {
  date: string;
  egx30Close: number;
  egx30ChangePct: number;
  egx70Close: number;
  egx70ChangePct: number;
  egx100Close: number;
  egx100ChangePct: number;
  turnoverBillion: number;
  sentiment: string;
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
}

export interface MoverStock {
  ticker: string;
  companyName?: string;
  logoDataUri?: string | null;
  close: number;
  changePct: number;
  volume: number;
}

export interface GainersLosersChartData {
  date: string;
  topGainers: MoverStock[];
  topLosers: MoverStock[];
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
}

const SVG_OPEN = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 1080 1080" width="1080" height="1080" style="background:#000000;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <rect width="1080" height="1080" fill="#000000" />
  <rect x="24" y="24" width="1032" height="1032" rx="20" fill="#000000" stroke="${LINE}" stroke-width="1.5" />`;

function header(title: string, subtitle: string, date: string, pill: string): string {
  return `
  <g transform="translate(60, 52)">
    <svg viewBox="5 6 54 54" width="28" height="28" fill="none">
      <path fill="#FFFFFF" d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z" />
    </svg>
    <text x="38" y="22" fill="#FFFFFF" font-size="22" font-weight="600" letter-spacing="-0.04em">ticknal</text>
    <rect x="118" y="2" width="118" height="24" rx="7" fill="#000000" stroke="#333333" stroke-width="1" />
    <text x="177" y="18" fill="${SOFT}" font-size="12" font-weight="600" text-anchor="middle">Ticknal take</text>
  </g>
  <text x="1020" y="73" fill="${MUTED}" font-size="15" font-weight="500" text-anchor="end">${esc(date)}</text>
  <g transform="translate(60, 126)">
    <text x="0" y="0" fill="${SOFT}" font-size="13" font-weight="700" letter-spacing="0.1em">${esc(pill.toUpperCase())}</text>
    <text x="0" y="38" fill="#ffffff" font-size="32" font-weight="700" letter-spacing="-0.02em">${esc(title)}</text>
    <text x="0" y="68" fill="${MUTED}" font-size="16">${esc(subtitle)}</text>
  </g>`;
}

function footer(note: string): string {
  return `
  <line x1="60" y1="1000" x2="1020" y2="1000" stroke="${LINE}" stroke-width="1" />
  <text x="60" y="1032" fill="#52525b" font-size="13" font-weight="500">${esc(note)}</text>
  <text x="1020" y="1032" fill="${SOFT}" font-size="13" font-weight="600" text-anchor="end">ticknal.com</text>`;
}

const sign = (n: number) => (n >= 0 ? '+' : '');
const fmt1 = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/* ───────────────────────── 1. HOT MONEY ───────────────────────── */
export function generateHotMoneyChartSvg(data: HotMoneyChartData, locale: 'en' | 'ar' = 'en'): string {
  const ar = locale === 'ar';
  const risk = data.isFlightRisk;
  const riskColor = risk ? RED : GREEN;
  const flowCard = (x: number, label: string, v: number) => {
    const c = v >= 0 ? GREEN : RED;
    return `
    <g transform="translate(${x}, 335)">
      <rect width="306" height="170" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <text x="24" y="38" fill="${SOFT}" font-size="14" font-weight="600">${esc(label)}</text>
      <text x="24" y="92" fill="${c}" font-size="34" font-weight="700">${sign(v)}${fmt1(v)}M</text>
      <text x="24" y="118" fill="${MUTED}" font-size="13">${ar ? 'مليون جنيه' : 'EGP million'}</text>
      <rect x="24" y="130" width="116" height="26" rx="6" fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-opacity="0.45" />
      <text x="82" y="148" fill="${c}" font-size="12" font-weight="700" text-anchor="middle">${v >= 0 ? (ar ? 'صافي شراء' : 'NET BUYER') : (ar ? 'صافي بيع' : 'NET SELLER')}</text>
    </g>`;
  };

  // Chart geometry (relative to chart card at translate(60, 525), 960 x 440)
  const bars = (data.dailyBars30d || []).slice(-30);
  const n = bars.length;
  const plotX = 32;
  const plotW = 896;
  const zeroY = 270;
  const half = 88;
  const step = n > 0 ? plotW / n : plotW;
  const barW = Math.max(6, step * 0.6);
  const maxAbs = Math.max(1, ...bars.map((b) => Math.abs(b.foreignNetMillion)));
  const maxCum = Math.max(1, ...bars.map((b) => Math.abs(b.cumulativeMillion)));

  const barEls = bars
    .map((b, i) => {
      const h = Math.max(2, (Math.abs(b.foreignNetMillion) / maxAbs) * half);
      const x = plotX + i * step + (step - barW) / 2;
      const up = b.foreignNetMillion >= 0;
      const y = up ? zeroY - h : zeroY;
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${up ? GREEN : RED}" fill-opacity="0.55" />`;
    })
    .join('');

  const linePts = bars
    .map((b, i) => {
      const x = plotX + i * step + step / 2;
      const y = zeroY - (b.cumulativeMillion / maxCum) * half;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const cum = data.rolling30dForeignNetMillion;
  const cumColor = cum >= 0 ? GREEN : RED;
  const midBar = bars[Math.floor(n / 2)];

  return toBase64Svg(`${SVG_OPEN}
  ${header(
    ar ? 'تدفقات الأجانب والعرب في البورصة' : 'Foreign & Arab Institutional Flows',
    ar ? 'رصد حركة الأموال الساخنة خلال آخر ٣٠ جلسة' : 'Hot money status over the last 30 sessions',
    data.date,
    ar ? 'الأموال الساخنة' : 'Hot Money Status'
  )}

  <g transform="translate(60, 215)">
    <rect width="960" height="100" rx="14" fill="${riskColor}" fill-opacity="0.1" stroke="${riskColor}" stroke-width="1.5" />
    <text x="30" y="42" fill="#ffffff" font-size="20" font-weight="700">${esc(
      risk
        ? ar ? 'تحذير: خروج أموال ساخنة من السوق' : 'WARNING: Foreign capital flight in progress'
        : ar ? 'تدفقات إيجابية: تجميع مؤسسي' : 'POSITIVE: Institutional accumulation'
    )}</text>
    <text x="30" y="72" fill="#d4d4d8" font-size="15">${esc(
      risk
        ? ar ? 'الأجانب والعرب بائعون صافون. تجنب الاندفاع وراء إشارات الشراء الآن.' : 'Foreign and Arab investors are net sellers. Be cautious acting on buy signals.'
        : ar ? 'صافي دخول سيولة مؤسسية يدعم الاتجاه الصاعد.' : 'Net institutional inflows support the uptrend.'
    )}</text>
  </g>

  ${flowCard(60, ar ? 'صافي الأجانب' : 'Foreign Net', data.todayForeignNetMillion)}
  ${flowCard(387, ar ? 'صافي العرب' : 'Arab Net', data.todayArabNetMillion)}
  ${flowCard(714, ar ? 'صافي المصريين' : 'Egyptian Net', data.todayEgyptianNetMillion)}

  <g transform="translate(60, 525)">
    <rect width="960" height="440" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
    <text x="32" y="44" fill="#ffffff" font-size="18" font-weight="700">${esc(ar ? 'حركة الأجانب خلال ٣٠ جلسة' : '30-Session Foreign Flow')}</text>

    <text x="32" y="86" fill="${SOFT}" font-size="13">${esc(ar ? 'صافي تراكمي' : 'Cumulative net')}</text>
    <text x="32" y="124" fill="${cumColor}" font-size="34" font-weight="700">${sign(cum)}${fmt1(cum)}M EGP</text>

    <text x="560" y="86" fill="${SOFT}" font-size="13">${esc(ar ? 'أيام الشراء / أيام البيع' : 'Inflow days / Outflow days')}</text>
    <text x="560" y="124" fill="#ffffff" font-size="30" font-weight="700">
      <tspan fill="${GREEN}">${data.inflowDaysCount}</tspan><tspan fill="${MUTED}" font-weight="400"> / </tspan><tspan fill="${RED}">${data.outflowDaysCount}</tspan>
    </text>

    <line x1="${plotX}" y1="${zeroY - half}" x2="${plotX + plotW}" y2="${zeroY - half}" stroke="#18181b" stroke-width="1" />
    <line x1="${plotX}" y1="${zeroY + half}" x2="${plotX + plotW}" y2="${zeroY + half}" stroke="#18181b" stroke-width="1" />
    <line x1="${plotX}" y1="${zeroY}" x2="${plotX + plotW}" y2="${zeroY}" stroke="#3f3f46" stroke-width="1" stroke-dasharray="4 4" />
    ${barEls}
    ${n > 1 ? `<polyline points="${linePts}" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />` : ''}

    ${n > 0 ? `<text x="${plotX}" y="388" fill="${MUTED}" font-size="12">${esc(bars[0].date)}</text>
    <text x="${plotX + plotW / 2}" y="388" fill="${MUTED}" font-size="12" text-anchor="middle">${esc(midBar.date)}</text>
    <text x="${plotX + plotW}" y="388" fill="${MUTED}" font-size="12" text-anchor="end">${esc(bars[n - 1].date)}</text>` : ''}

    <rect x="32" y="408" width="12" height="12" rx="3" fill="${GREEN}" fill-opacity="0.55" />
    <text x="52" y="419" fill="${SOFT}" font-size="12">${esc(ar ? 'صافي يومي' : 'Daily net')}</text>
    <line x1="170" y1="414" x2="196" y2="414" stroke="#ffffff" stroke-width="2.5" />
    <text x="204" y="419" fill="${SOFT}" font-size="12">${esc(ar ? 'تراكمي' : 'Cumulative')}</text>
  </g>

  ${footer(ar ? 'محرك تكنال للتحليل الكمي · البورصة المصرية' : 'Ticknal flow engine · EGX investor flows')}
</svg>`);
}

/* ───────────────────────── 2. TRADE SUMMARY ───────────────────────── */
export function generateTradeSummaryChartSvg(data: TradeSummaryChartData, locale: 'en' | 'ar' = 'en'): string {
  const ar = locale === 'ar';
  const indexCard = (y: number, h: number, tag: string, tagW: number, desc: string, close: number, chg: number) => {
    const c = chg >= 0 ? GREEN : RED;
    return `
    <g transform="translate(60, ${y})">
      <rect width="960" height="${h}" rx="16" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <rect x="24" y="24" width="${tagW}" height="30" rx="8" fill="#000000" stroke="#333333" />
      <text x="${24 + tagW / 2}" y="44" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">${esc(tag)}</text>
      <text x="${24 + tagW + 14}" y="44" fill="${MUTED}" font-size="14">${esc(desc)}</text>
      <text x="24" y="124" fill="#ffffff" font-size="48" font-weight="700">${fmt1(close)}</text>
      <text x="24" y="156" fill="${MUTED}" font-size="14">${ar ? 'نقطة' : 'points'}</text>
      <rect x="750" y="62" width="180" height="62" rx="12" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="1.5" />
      <text x="840" y="103" fill="${c}" font-size="28" font-weight="700" text-anchor="middle">${sign(chg)}${chg}%</text>
    </g>`;
  };

  return toBase64Svg(`${SVG_OPEN}
  ${header(
    ar ? 'أداء المؤشرات والسيولة' : 'EGX Indices & Turnover',
    ar ? 'إغلاقات EGX 30 و 70 و 100 وقيمة التداول' : 'EGX 30, 70 and 100 closes with session turnover',
    data.date,
    ar ? 'ملخص التداول اليومي' : 'Daily Trade Summary'
  )}
  ${indexCard(215, 200, 'EGX 30', 76, ar ? 'الأسهم القيادية' : 'Blue-chip benchmark', data.egx30Close, data.egx30ChangePct)}
  ${indexCard(435, 200, 'EGX 70', 76, ar ? 'الشركات الصغيرة والمتوسطة' : 'Small and mid caps (equal weight)', data.egx70Close, data.egx70ChangePct)}
  ${indexCard(655, 200, 'EGX 100', 88, ar ? 'السوق الأوسع' : 'Broad market (equal weight)', data.egx100Close, data.egx100ChangePct)}

  <g transform="translate(60, 875)">
    <rect width="960" height="100" rx="16" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
    <text x="28" y="40" fill="${SOFT}" font-size="14">${esc(ar ? 'قيمة التداول' : 'Session turnover')}</text>
    <text x="28" y="76" fill="#ffffff" font-size="28" font-weight="700">${data.turnoverBillion.toFixed(2)}B EGP</text>
    <text x="932" y="40" fill="${SOFT}" font-size="14" text-anchor="end">${esc(ar ? 'معنويات السوق' : 'Sentiment')}</text>
    <text x="932" y="76" fill="${GREEN}" font-size="24" font-weight="700" text-anchor="end">${esc(data.sentiment.toUpperCase())}</text>
  </g>

  ${footer(ar ? 'بيانات نهاية اليوم · محرك تكنال' : 'Verified end-of-day data · Ticknal')}
</svg>`);
}

/* ───────────────────────── 3. MARKET BREADTH ───────────────────────── */
export function generateMarketBreadthChartSvg(data: MarketBreadthChartData, locale: 'en' | 'ar' = 'en'): string {
  const ar = locale === 'ar';
  const flatPct = Math.max(0, Number((100 - data.advancersPct - data.declinersPct).toFixed(1)));
  const total = 960;
  const advW = (data.advancersPct / 100) * total;
  const decW = (data.declinersPct / 100) * total;
  const flatW = Math.max(0, total - advW - decW);
  const ratio = (data.advancers / Math.max(1, data.decliners)).toFixed(2);
  const bullish = data.advancers >= data.decliners;

  const label = (x: number, w: number, text: string) =>
    w >= 64 ? `<text x="${x + w / 2}" y="28" fill="#000000" font-size="14" font-weight="700" text-anchor="middle">${esc(text)}</text>` : '';

  const statCard = (x: number, color: string, icon: string, name: string, count: number, pct: number, sub: string) => `
    <g transform="translate(${x}, 330)">
      <rect width="306" height="300" rx="16" fill="#000000" stroke="${color}" stroke-width="1.5" />
      <text x="24" y="46" fill="${color}" font-size="16" font-weight="700">${esc(icon + ' ' + name)}</text>
      <text x="24" y="136" fill="${color}" font-size="68" font-weight="700">${count}</text>
      <text x="24" y="176" fill="#ffffff" font-size="18" font-weight="600">${esc(sub)}</text>
      <line x1="24" y1="206" x2="282" y2="206" stroke="${LINE}" />
      <text x="24" y="246" fill="${SOFT}" font-size="14">${esc(ar ? 'نسبة من السوق' : 'Share of market')}</text>
      <text x="24" y="278" fill="${color}" font-size="26" font-weight="700">${pct}%</text>
    </g>`;

  return toBase64Svg(`${SVG_OPEN}
  ${header(
    ar ? 'اتساع السوق' : 'EGX Market Breadth',
    ar ? 'الأسهم الصاعدة مقابل الهابطة مقابل دون تغيير' : 'Advancers vs decliners vs unchanged',
    data.date,
    ar ? 'اتساع السوق' : 'Market Breadth'
  )}

  <g transform="translate(60, 225)">
    <rect width="960" height="42" rx="10" fill="#18181b" />
    <clipPath id="barClip"><rect width="960" height="42" rx="10" /></clipPath>
    <g clip-path="url(#barClip)">
      <rect x="0" y="0" width="${advW.toFixed(1)}" height="42" fill="${GREEN}" />
      <rect x="${advW.toFixed(1)}" y="0" width="${decW.toFixed(1)}" height="42" fill="${RED}" />
      <rect x="${(advW + decW).toFixed(1)}" y="0" width="${flatW.toFixed(1)}" height="42" fill="#71717a" />
    </g>
    ${label(0, advW, `${data.advancersPct}%`)}
    ${label(advW, decW, `${data.declinersPct}%`)}
    ${label(advW + decW, flatW, `${flatPct}%`)}
  </g>

  ${statCard(60, GREEN, '▲', ar ? 'صاعدة' : 'ADVANCERS', data.advancers, data.advancersPct, ar ? 'سهم رابح' : 'stocks up')}
  ${statCard(387, RED, '▼', ar ? 'هابطة' : 'DECLINERS', data.decliners, data.declinersPct, ar ? 'سهم خاسر' : 'stocks down')}
  ${statCard(714, SOFT, '●', ar ? 'دون تغيير' : 'UNCHANGED', data.flat, flatPct, ar ? 'سهم مستقر' : 'stocks flat')}

  <g transform="translate(60, 660)">
    <rect width="960" height="305" rx="16" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
    <text x="32" y="46" fill="#ffffff" font-size="20" font-weight="700">${esc(ar ? 'نسبة الصعود إلى الهبوط' : 'Advance / Decline ratio')}</text>
    <text x="32" y="124" fill="${bullish ? GREEN : RED}" font-size="52" font-weight="700">${ratio}x</text>
    <text x="32" y="162" fill="${MUTED}" font-size="14">${esc(
      bullish
        ? ar ? 'اتساع إيجابي: المشترون يسيطرون' : 'Positive breadth: buyers are in control'
        : ar ? 'اتساع سلبي: البائعون يسيطرون' : 'Negative breadth: sellers are in control'
    )}</text>
    <line x1="32" y1="196" x2="928" y2="196" stroke="${LINE}" />
    <text x="32" y="236" fill="${SOFT}" font-size="14">${esc(ar ? 'أسهم متداولة' : 'Stocks traded')}</text>
    <text x="32" y="274" fill="#ffffff" font-size="26" font-weight="700">${data.totalStocks}</text>
    <text x="500" y="236" fill="${SOFT}" font-size="14">${esc(ar ? 'قيمة التداول' : 'Session turnover')}</text>
    <text x="500" y="274" fill="${CYAN}" font-size="26" font-weight="700">${data.turnoverBillion.toFixed(2)}B EGP</text>
  </g>

  ${footer(ar ? 'تحليل كمي لحظي · محرك تكنال' : 'Quantitative breadth analytics · Ticknal')}
</svg>`);
}

/* ───────────────────────── 4. GAINERS & LOSERS ───────────────────────── */
export function generateGainersLosersChartSvg(data: GainersLosersChartData, locale: 'en' | 'ar' = 'en'): string {
  const ar = locale === 'ar';
  const volTxt = (v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${Math.round(v / 1000)}K`);

  const row = (s: MoverStock, idx: number, gainer: boolean, colX: number) => {
    const color = gainer ? GREEN : RED;
    const y = 300 + idx * 134;
    const name = s.companyName || s.ticker;
    const shown = name.length > 22 ? `${name.slice(0, 21)}…` : name;
    const cid = `logo-${gainer ? 'g' : 'l'}${idx}`;
    const avatar = s.logoDataUri
      ? `<circle cx="52" cy="60" r="30" fill="#ffffff" />
         <clipPath id="${cid}"><circle cx="52" cy="60" r="26" /></clipPath>
         <image href="${s.logoDataUri}" xlink:href="${s.logoDataUri}" x="26" y="34" width="52" height="52" preserveAspectRatio="xMidYMid meet" clip-path="url(#${cid})" />
         <circle cx="52" cy="60" r="30" fill="none" stroke="${color}" stroke-width="2" />`
      : `<circle cx="52" cy="60" r="30" fill="${color}" fill-opacity="0.15" stroke="${color}" stroke-width="2" />
         <text x="52" y="66" fill="#ffffff" font-size="15" font-weight="700" text-anchor="middle">${esc(s.ticker.slice(0, 4))}</text>`;
    return `
    <g transform="translate(${colX}, ${y})">
      <rect width="460" height="120" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      ${avatar}
      <text x="96" y="46" fill="#ffffff" font-size="16" font-weight="700">${esc(shown)}</text>
      <text x="96" y="72" fill="${SOFT}" font-size="14" font-weight="600">${esc(s.ticker)} · ${s.close.toFixed(2)} EGP</text>
      <text x="96" y="96" fill="#52525b" font-size="12">${esc(ar ? 'حجم' : 'Vol')} ${volTxt(s.volume)}</text>
      <rect x="324" y="36" width="124" height="48" rx="10" fill="${color}" fill-opacity="0.14" stroke="${color}" stroke-width="1.5" />
      <text x="386" y="68" fill="${color}" font-size="19" font-weight="700" text-anchor="middle">${sign(s.changePct)}${s.changePct.toFixed(2)}%</text>
    </g>`;
  };

  const colHeader = (x: number, color: string, text: string) => `
    <g transform="translate(${x}, 222)">
      <rect width="460" height="52" rx="10" fill="${color}" fill-opacity="0.12" stroke="${color}" />
      <text x="24" y="33" fill="${color}" font-size="17" font-weight="700">${esc(text)}</text>
    </g>`;

  return toBase64Svg(`${SVG_OPEN}
  ${header(
    ar ? 'الأكثر ارتفاعا وانخفاضا' : 'Session Gainers & Losers',
    ar ? 'أكبر ٥ أسهم رابحة وخاسرة (سيولة أكثر من مليون جنيه)' : 'Top 5 movers of the session (turnover above 1M EGP)',
    data.date,
    ar ? 'أكثر الأسهم حركة' : 'Top Movers'
  )}
  ${colHeader(60, GREEN, `▲ ${ar ? 'الأكثر ارتفاعا' : 'TOP 5 GAINERS'}`)}
  ${colHeader(560, RED, `▼ ${ar ? 'الأكثر انخفاضا' : 'TOP 5 LOSERS'}`)}
  ${(data.topGainers || []).slice(0, 5).map((s, i) => row(s, i, true, 60)).join('')}
  ${(data.topLosers || []).slice(0, 5).map((s, i) => row(s, i, false, 560)).join('')}
  ${footer(ar ? 'فلتر السيولة: أكثر من مليون جنيه' : 'Liquidity filter: minimum 1M EGP turnover')}
</svg>`);
}

/* ───────────────────────── 5. USD/EGP ───────────────────────── */
export function generateUsdEgpUpdateChartSvg(data: UsdEgpUpdateChartData, locale: 'en' | 'ar' = 'en'): string {
  const ar = locale === 'ar';
  const pct = (a: number) => Number((((a - data.officialUsd) / data.officialUsd) * 100).toFixed(1));
  const spread = pct(data.compositeFair);
  const goldGap = pct(data.saghaGoldUsd);
  const gdrGap = pct(data.londonGdrUsd);
  const score = Math.min(100, Math.max(0, data.devaluationRiskScore || 0));
  const scoreColor = score > 60 ? RED : score > 35 ? AMBER : GREEN;

  const proxy = (x: number, color: string, name: string, value: number, gap: number) => `
    <g transform="translate(${x}, 435)">
      <rect width="306" height="200" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
      <text x="24" y="40" fill="${color}" font-size="14" font-weight="700">${esc('● ' + name)}</text>
      <text x="24" y="96" fill="#ffffff" font-size="38" font-weight="700">${value.toFixed(2)}</text>
      <text x="24" y="124" fill="${MUTED}" font-size="13">EGP / USD</text>
      <rect x="24" y="148" width="132" height="28" rx="7" fill="${color}" fill-opacity="0.14" />
      <text x="90" y="167" fill="${color}" font-size="12" font-weight="700" text-anchor="middle">${sign(gap)}${gap}% ${esc(ar ? 'فجوة' : 'vs official')}</text>
    </g>`;

  return toBase64Svg(`${SVG_OPEN}
  ${header(
    ar ? 'الدولار وضغوط التعويم' : 'USD/EGP Fair Value & Devaluation Risk',
    ar ? 'السعر الرسمي مقابل المؤشرات الموازية' : 'Official rate vs. shadow-market proxies',
    data.date,
    ar ? 'تحديث سعر الصرف' : 'USD/EGP Update'
  )}

  <g transform="translate(60, 225)">
    <rect width="470" height="190" rx="16" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
    <text x="28" y="44" fill="${SOFT}" font-size="15" font-weight="600">${esc(ar ? 'السعر الرسمي (المركزي)' : 'Official rate (CBE)')}</text>
    <text x="28" y="112" fill="#ffffff" font-size="54" font-weight="700">${data.officialUsd.toFixed(2)}</text>
    <text x="28" y="150" fill="${MUTED}" font-size="15">EGP per 1 USD</text>

    <g transform="translate(490, 0)">
      <rect width="470" height="190" rx="16" fill="#000000" stroke="${CYAN}" stroke-width="1.5" />
      <text x="28" y="44" fill="${CYAN}" font-size="15" font-weight="600">${esc(ar ? 'السعر العادل المقدر' : 'Composite fair value')}</text>
      <text x="28" y="112" fill="${CYAN}" font-size="54" font-weight="700">${data.compositeFair.toFixed(2)}</text>
      <text x="28" y="150" fill="${MUTED}" font-size="15">${sign(spread)}${spread}% ${esc(ar ? 'عن الرسمي' : 'vs official')}</text>
    </g>
  </g>

  ${proxy(60, AMBER, ar ? 'دولار الصاغة' : 'Sagha gold implied', data.saghaGoldUsd, goldGap)}
  ${proxy(387, '#1d9bf0', ar ? 'شهادات لندن' : 'London CIB GDR', data.londonGdrUsd, gdrGap)}

  <g transform="translate(714, 435)">
    <rect width="306" height="200" rx="14" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
    <text x="24" y="40" fill="${SOFT}" font-size="14" font-weight="700">${esc('● ' + (ar ? 'تذبذب العملة' : 'ATR compression'))}</text>
    <text x="24" y="96" fill="#ffffff" font-size="38" font-weight="700">${data.atrCompressionRatio.toFixed(2)}x</text>
    <text x="24" y="124" fill="${MUTED}" font-size="13">ATR14 / ATR90</text>
    <rect x="24" y="148" width="132" height="28" rx="7" fill="${GREEN}" fill-opacity="0.14" />
    <text x="90" y="167" fill="${GREEN}" font-size="12" font-weight="700" text-anchor="middle">${esc(data.atrCompressionRatio < 0.7 ? (ar ? 'نطاق مضغوط' : 'COMPRESSED') : (ar ? 'طبيعي' : 'NORMAL'))}</text>
  </g>

  <g transform="translate(60, 665)">
    <rect width="960" height="300" rx="16" fill="#000000" stroke="${LINE}" stroke-width="1.5" />
    <text x="32" y="46" fill="#ffffff" font-size="20" font-weight="700">${esc(ar ? 'مؤشر ضغط التعويم' : 'Devaluation pressure index')}</text>
    <text x="32" y="130" fill="${scoreColor}" font-size="62" font-weight="700">${score}<tspan font-size="26" fill="${MUTED}" font-weight="400"> / 100</tspan></text>
    <text x="32" y="172" fill="#ffffff" font-size="18" font-weight="600">${esc(data.devaluationRiskLabel)}</text>
    <rect x="32" y="214" width="896" height="16" rx="8" fill="#18181b" />
    <rect x="32" y="214" width="${Math.max(16, (score / 100) * 896).toFixed(0)}" height="16" rx="8" fill="${scoreColor}" />
    <text x="32" y="262" fill="${MUTED}" font-size="13">${esc(ar ? 'منخفض' : 'Low')}</text>
    <text x="928" y="262" fill="${MUTED}" font-size="13" text-anchor="end">${esc(ar ? 'مرتفع' : 'High')}</text>
  </g>

  ${footer(ar ? 'نموذج تكنال لمخاطر العملة' : 'Ticknal currency triangulation model')}
</svg>`);
}

export const generateInvestorFlowsChartSvg = generateHotMoneyChartSvg;
export const generateEgx30ChartSvg = generateTradeSummaryChartSvg;
export const generateFxArbitrageChartSvg = generateUsdEgpUpdateChartSvg;

export function generateLocalizedTakeBundle<T>(generator: (data: T, locale: 'en' | 'ar') => string, data: T): string {
  return JSON.stringify({ en: generator(data, 'en'), ar: generator(data, 'ar') });
}

export function resolveLocalizedChartSvg(rawImageUrl?: string | null, targetLocale: string = 'en'): string | null {
  if (!rawImageUrl) return null;
  if (rawImageUrl.startsWith('{') && rawImageUrl.includes('"')) {
    try {
      const parsed = JSON.parse(rawImageUrl);
      if (targetLocale === 'ar' && parsed.ar) return parsed.ar;
      if (parsed.en) return parsed.en;
      return Object.values(parsed)[0] as string;
    } catch {}
  }
  return rawImageUrl;
}
