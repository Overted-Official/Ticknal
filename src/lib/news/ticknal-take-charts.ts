/**
 * Ticknal Take High-Fidelity 1:1 Vector SVG Chart Snapshot Generators
 * Generates pure-pitch-black (#000000) square vector cards (1080x1080) optimized for social media feeds (X/Twitter, LinkedIn, Instagram).
 * Features tabular-nums, modern sans-serif typography, verified Ticknal branding, and bulletproof XML escaping.
 */

export function xmlEscape(val: any): string {
  if (val == null) return '';
  return String(val)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toBase64Svg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

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
  dailyBars30d: Array<{
    date: string;
    foreignNetMillion: number;
    cumulativeMillion: number;
  }>;
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

export interface GainersLosersChartData {
  date: string;
  topGainers: Array<{ ticker: string; companyName?: string; close: number; changePct: number; volume: number }>;
  topLosers: Array<{ ticker: string; companyName?: string; close: number; changePct: number; volume: number }>;
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

function renderBrandHeader(title: string, subtitle: string, date: string, categoryPill: string): string {
  return `
  <!-- Brand and Verification Header -->
  <g transform="translate(60, 52)">
    <svg viewBox="5 6 54 54" width="28" height="28" fill="none">
      <path fill="#FFFFFF" d="M6 22H21C29 22 28 10 37 10H58V20H48.5A11 11 0 0 0 37.5 31V56H27.5V42A10 10 0 0 0 17.5 32H6Z" />
    </svg>
    <text x="36" y="21" fill="#FFFFFF" font-family="EuclidCircularSemibold, system-ui, sans-serif" font-size="21" font-weight="600" letter-spacing="-0.04em">ticknal</text>
    <!-- Verified Badge -->
    <svg x="110" y="4" viewBox="0 0 22 22" width="18" height="18" fill="#1d9bf0">
      <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.136 2.136 5.477-5.477 1.294 1.294-6.771 6.777z"/>
    </svg>
    <rect x="138" y="2" width="130" height="22" rx="6" fill="#18181b" stroke="#333333" stroke-width="1" />
    <text x="203" y="17" fill="#a1a1aa" font-size="11" font-weight="600" text-anchor="middle" letter-spacing="0.04em">Ticknal take</text>
  </g>

  <!-- Date and Category Right Badge -->
  <text x="1020" y="73" fill="#71717a" font-size="14" font-weight="500" text-anchor="end" font-variant-numeric="tabular-nums">${xmlEscape(date)}</text>

  <!-- Title and Subtitle -->
  <g transform="translate(60, 126)">
    <text x="0" y="0" fill="#a1a1aa" font-size="13" font-weight="700" letter-spacing="0.1em">${xmlEscape(categoryPill.toUpperCase())}</text>
    <text x="0" y="36" fill="#ffffff" font-size="32" font-weight="700" letter-spacing="-0.02em">${xmlEscape(title)}</text>
    <text x="0" y="66" fill="#71717a" font-size="16" font-weight="400">${xmlEscape(subtitle)}</text>
  </g>
  `;
}

function renderFooter(disclaimer: string): string {
  return `
  <!-- Footer Bar -->
  <line x1="60" y1="1000" x2="1020" y2="1000" stroke="#222222" stroke-width="1" />
  <text x="60" y="1034" fill="#52525b" font-size="13" font-weight="500">${xmlEscape(disclaimer)}</text>
  <text x="1020" y="1034" fill="#a1a1aa" font-size="13" font-weight="600" text-anchor="end">ticknal.com</text>
  `;
}

/**
 * 1. HOT MONEY STATUS (1:1 Square Card)
 */
export function generateHotMoneyChartSvg(data: HotMoneyChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const categoryPill = isAr ? 'الأموال الساخنة والاستثمار الأجنبي' : 'HOT MONEY &amp; INSTITUTIONAL FLOWS';
  const title = isAr ? 'حركة تدفقات الأجانب والعرب في البورصة' : 'Foreign &amp; Arab Institutional Flow Status';
  const subtitle = isAr ? 'رصد حركة رؤوس الأموال ومؤشر خروج الأموال الساخنة (٣٠ يوم)' : 'Rolling 30-Day Capital Trajectory &amp; Hot Money Flight Risk Alert';
  const disclaimer = isAr ? 'محرك تكنال للتحليل الكمي · بورصة مصر' : 'Ticknal Quantitative Flow Engine · EGX Institutional Tracking';

  const riskFill = data.isFlightRisk ? '#4c0519' : '#022c22';
  const riskStroke = data.isFlightRisk ? '#f43f5e' : '#10b981';
  const riskTitle = data.isFlightRisk
    ? (isAr ? '⚠ تحذير: خروج أموال ساخنة (بيع أجنبي مكثف)' : '⚠ WARNING: FOREIGN CAPITAL FLIGHT ACTIVE')
    : (isAr ? '✓ تدفقات إيجابية: استقرار الشراء المؤسسي' : '✓ POSITIVE FLOW: INSTITUTIONAL ACCUMULATION');
  const riskDesc = data.isFlightRisk
    ? (isAr ? 'المؤسسات الأجنبية والعربية في اتجاه بيعي مستمر. تجنب إشارات الشراء حالياً.' : 'Foreign &amp; Arab institutions are aggressive net sellers. Avoid early buy signals.')
    : (isAr ? 'دخول صافي سيولة يدعم الاتجاه الصاعد للأسهم القيادية.' : 'Net capital inflows confirm institutional demand for heavyweights.');

  const foreignColor = data.todayForeignNetMillion >= 0 ? '#10b981' : '#f43f5e';
  const arabColor = data.todayArabNetMillion >= 0 ? '#10b981' : '#f43f5e';
  const egyptColor = data.todayEgyptianNetMillion >= 0 ? '#10b981' : '#f43f5e';

  // Mini 30D Flow Bars
  const bars = data.dailyBars30d || [];
  const barWidth = 24;
  const barGap = 6;
  const chartStartX = 80;
  const chartCenterY = 820;

  const barElements = bars.slice(-26).map((b, idx) => {
    const x = chartStartX + idx * (barWidth + barGap);
    const val = b.foreignNetMillion;
    const isPos = val >= 0;
    const barHeight = Math.min(100, Math.max(6, Math.abs(val) * 0.8));
    const y = isPos ? chartCenterY - barHeight : chartCenterY;
    const color = isPos ? '#10b981' : '#f43f5e';
    return `<rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="3" fill="${color}" opacity="0.85"/>`;
  }).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" style="background:#000000;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <rect width="1080" height="1080" fill="#000000" />
  <rect x="24" y="24" width="1032" height="1032" rx="20" fill="#000000" stroke="#222222" stroke-width="1.5" />

  ${renderBrandHeader(title, subtitle, data.date, categoryPill)}

  <!-- 1. Regime Alert Banner -->
  <g transform="translate(60, 220)">
    <rect width="960" height="110" rx="14" fill="${riskFill}" stroke="${riskStroke}" stroke-width="1.5" />
    <text x="32" y="44" fill="#ffffff" font-size="20" font-weight="700">${riskTitle}</text>
    <text x="32" y="78" fill="#d4d4d8" font-size="15" font-weight="400">${riskDesc}</text>
  </g>

  <!-- 2. Today's Institutional Breakdown (3 Cards) -->
  <g transform="translate(60, 360)">
    <!-- Foreigners -->
    <rect x="0" y="0" width="306" height="240" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="24" y="40" fill="#a1a1aa" font-size="14" font-weight="600">${isAr ? 'صافي تعاملات الأجانب' : 'Foreign Net Flow'}</text>
    <text x="24" y="98" fill="${foreignColor}" font-size="34" font-weight="700" font-variant-numeric="tabular-nums">${data.todayForeignNetMillion >= 0 ? '+' : ''}${data.todayForeignNetMillion}M</text>
    <text x="24" y="128" fill="#71717a" font-size="13">EGP ${isAr ? 'مليون جنيه' : 'million'}</text>
    <rect x="24" y="160" width="120" height="28" rx="6" fill="${foreignColor}20" stroke="${foreignColor}40" stroke-width="1" />
    <text x="84" y="179" fill="${foreignColor}" font-size="12" font-weight="700" text-anchor="middle">${data.todayForeignNetMillion >= 0 ? (isAr ? 'صافي شراء' : 'NET BUYER') : (isAr ? 'صافي بيع' : 'NET SELLER')}</text>

    <!-- Arabs -->
    <rect x="326" y="0" width="306" height="240" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="350" y="40" fill="#a1a1aa" font-size="14" font-weight="600">${isAr ? 'صافي تعاملات العرب' : 'Arab Net Flow'}</text>
    <text x="350" y="98" fill="${arabColor}" font-size="34" font-weight="700" font-variant-numeric="tabular-nums">${data.todayArabNetMillion >= 0 ? '+' : ''}${data.todayArabNetMillion}M</text>
    <text x="350" y="128" fill="#71717a" font-size="13">EGP ${isAr ? 'مليون جنيه' : 'million'}</text>
    <rect x="350" y="160" width="120" height="28" rx="6" fill="${arabColor}20" stroke="${arabColor}40" stroke-width="1" />
    <text x="410" y="179" fill="${arabColor}" font-size="12" font-weight="700" text-anchor="middle">${data.todayArabNetMillion >= 0 ? (isAr ? 'صافي شراء' : 'NET BUYER') : (isAr ? 'صافي بيع' : 'NET SELLER')}</text>

    <!-- Egyptians -->
    <rect x="654" y="0" width="306" height="240" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="678" y="40" fill="#a1a1aa" font-size="14" font-weight="600">${isAr ? 'صافي تعاملات المصريين' : 'Egyptian Net Flow'}</text>
    <text x="678" y="98" fill="${egyptColor}" font-size="34" font-weight="700" font-variant-numeric="tabular-nums">${data.todayEgyptianNetMillion >= 0 ? '+' : ''}${data.todayEgyptianNetMillion}M</text>
    <text x="678" y="128" fill="#71717a" font-size="13">EGP ${isAr ? 'مليون جنيه' : 'million'}</text>
    <rect x="678" y="160" width="120" height="28" rx="6" fill="${egyptColor}20" stroke="${egyptColor}40" stroke-width="1" />
    <text x="738" y="179" fill="${egyptColor}" font-size="12" font-weight="700" text-anchor="middle">${data.todayEgyptianNetMillion >= 0 ? (isAr ? 'صافي شراء' : 'NET BUYER') : (isAr ? 'صافي بيع' : 'NET SELLER')}</text>
  </g>

  <!-- 3. 30-Day Cumulative Trend and Histogram Card -->
  <g transform="translate(60, 630)">
    <rect width="960" height="340" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="32" y="44" fill="#ffffff" font-size="18" font-weight="700">${isAr ? 'حركة السيولة الأجنبية التراكمية (آخر ٣٠ جلسة)' : '30-Day Foreign Flow Trajectory &amp; Outflow Barometer'}</text>
    
    <!-- Left Stat Column -->
    <text x="32" y="90" fill="#a1a1aa" font-size="13">${isAr ? 'صافي التدفق التراكمي (٣٠ يوم)' : 'Cumulative 30D Foreign Net'}</text>
    <text x="32" y="130" fill="${data.rolling30dForeignNetMillion >= 0 ? '#10b981' : '#f43f5e'}" font-size="36" font-weight="700" font-variant-numeric="tabular-nums">${data.rolling30dForeignNetMillion >= 0 ? '+' : ''}${data.rolling30dForeignNetMillion}M EGP</text>

    <!-- Right Stat Badges -->
    <text x="560" y="90" fill="#a1a1aa" font-size="13">${isAr ? 'أيام الشراء مقابل أيام البيع' : 'Inflow Days vs Outflow Days'}</text>
    <text x="560" y="128" fill="#ffffff" font-size="24" font-weight="700" font-variant-numeric="tabular-nums">${data.inflowDaysCount} <tspan fill="#10b981" font-size="18">Inflow</tspan> · ${data.outflowDaysCount} <tspan fill="#f43f5e" font-size="18">Outflow</tspan></text>

    <!-- Zero line -->
    <line x1="60" y1="190" x2="900" y2="190" stroke="#333333" stroke-dasharray="4 4" stroke-width="1" />

    <!-- Histogram of Daily Flows -->
    <g transform="translate(0, -630)">
      ${barElements}
    </g>
  </g>

  ${renderFooter(disclaimer)}
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 2. DAILY TRADE SUMMARY (1:1 Square Card)
 */
export function generateTradeSummaryChartSvg(data: TradeSummaryChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const categoryPill = isAr ? 'ملخص التداول اليومي' : 'DAILY TRADE SUMMARY';
  const title = isAr ? 'أداء مؤشرات البورصة والسيولة' : 'EGX Indices &amp; Market Turnover';
  const subtitle = isAr ? 'إغلاقات EGX 30 و 70 و 100 وإجمالي قيم التداول اليومية' : 'Benchmark Index Returns, Session Breadth &amp; Cash Flow';
  const disclaimer = isAr ? 'تغطية يومية من محرك تكنال الذكي · بيانات رسمية' : 'Verified EOD Market Intelligence by Ticknal Terminal';

  const egx30Color = data.egx30ChangePct >= 0 ? '#10b981' : '#f43f5e';
  const egx70Color = data.egx70ChangePct >= 0 ? '#10b981' : '#f43f5e';
  const egx100Color = data.egx100ChangePct >= 0 ? '#10b981' : '#f43f5e';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" style="background:#000000;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <rect width="1080" height="1080" fill="#000000" />
  <rect x="24" y="24" width="1032" height="1032" rx="20" fill="#000000" stroke="#222222" stroke-width="1.5" />

  ${renderBrandHeader(title, subtitle, data.date, categoryPill)}

  <!-- 3 Index Cards Stacked Vertically -->
  <!-- 1. EGX 30 -->
  <g transform="translate(60, 220)">
    <rect width="960" height="210" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <rect x="24" y="24" width="70" height="30" rx="8" fill="#18181b" stroke="#333333" stroke-width="1" />
    <text x="59" y="44" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">EGX 30</text>
    <text x="108" y="44" fill="#71717a" font-size="14" font-weight="500">${isAr ? 'المؤشر الرئيسي للأسهم القيادية' : 'Blue Chips Benchmark Index'}</text>

    <!-- Close Price -->
    <text x="24" y="120" fill="#ffffff" font-size="48" font-weight="700" font-variant-numeric="tabular-nums">${data.egx30Close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</text>
    <text x="24" y="160" fill="#71717a" font-size="14">pts · ${isAr ? 'نقطة' : 'points'}</text>

    <!-- 1D Change Pill -->
    <rect x="760" y="60" width="170" height="60" rx="12" fill="${egx30Color}15" stroke="${egx30Color}" stroke-width="1.5" />
    <text x="845" y="100" fill="${egx30Color}" font-size="28" font-weight="700" text-anchor="middle" font-variant-numeric="tabular-nums">${data.egx30ChangePct >= 0 ? '+' : ''}${data.egx30ChangePct}%</text>
  </g>

  <!-- 2. EGX 70 EWI -->
  <g transform="translate(60, 460)">
    <rect width="960" height="210" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <rect x="24" y="24" width="80" height="30" rx="8" fill="#18181b" stroke="#333333" stroke-width="1" />
    <text x="64" y="44" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">EGX 70</text>
    <text x="118" y="44" fill="#71717a" font-size="14" font-weight="500">${isAr ? 'مؤشر الشركات الصغيرة والمتوسطة متساوي الأوزان' : 'Small &amp; Mid-Caps Equal-Weight'}</text>

    <!-- Close Price -->
    <text x="24" y="120" fill="#ffffff" font-size="48" font-weight="700" font-variant-numeric="tabular-nums">${data.egx70Close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</text>
    <text x="24" y="160" fill="#71717a" font-size="14">pts · ${isAr ? 'نقطة' : 'points'}</text>

    <!-- 1D Change Pill -->
    <rect x="760" y="60" width="170" height="60" rx="12" fill="${egx70Color}15" stroke="${egx70Color}" stroke-width="1.5" />
    <text x="845" y="100" fill="${egx70Color}" font-size="28" font-weight="700" text-anchor="middle" font-variant-numeric="tabular-nums">${data.egx70ChangePct >= 0 ? '+' : ''}${data.egx70ChangePct}%</text>
  </g>

  <!-- 3. EGX 100 EWI and Turnover Summary -->
  <g transform="translate(60, 700)">
    <rect width="960" height="260" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <rect x="24" y="24" width="90" height="30" rx="8" fill="#18181b" stroke="#333333" stroke-width="1" />
    <text x="69" y="44" fill="#ffffff" font-size="14" font-weight="700" text-anchor="middle">EGX 100</text>
    <text x="128" y="44" fill="#71717a" font-size="14" font-weight="500">${isAr ? 'المؤشر الأوسع نطاقاً للبورصة المصرية' : 'Broad Market Multi-Cap Index'}</text>

    <!-- Close Price -->
    <text x="24" y="120" fill="#ffffff" font-size="44" font-weight="700" font-variant-numeric="tabular-nums">${data.egx100Close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</text>
    <text x="24" y="156" fill="#71717a" font-size="14">pts · ${isAr ? 'نقطة' : 'points'}</text>

    <rect x="760" y="60" width="170" height="60" rx="12" fill="${egx100Color}15" stroke="${egx100Color}" stroke-width="1.5" />
    <text x="845" y="100" fill="${egx100Color}" font-size="28" font-weight="700" text-anchor="middle" font-variant-numeric="tabular-nums">${data.egx100ChangePct >= 0 ? '+' : ''}${data.egx100ChangePct}%</text>

    <!-- Turnover Strip inside card -->
    <line x1="24" y1="184" x2="936" y2="184" stroke="#222222" stroke-width="1" />
    <text x="24" y="222" fill="#a1a1aa" font-size="14">${isAr ? 'إجمالي قيم التداول في الجلسة:' : 'Total Market Session Turnover:'} <tspan fill="#ffffff" font-weight="700">${data.turnoverBillion.toFixed(2)} Billion EGP</tspan></text>
    <text x="936" y="222" fill="#a1a1aa" font-size="14" text-anchor="end">${isAr ? 'معنويات السوق:' : 'Sentiment:'} <tspan fill="#10b981" font-weight="700">${xmlEscape(data.sentiment.toUpperCase())}</tspan></text>
  </g>

  ${renderFooter(disclaimer)}
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 3. MARKET BREADTH (1:1 Square Card)
 */
export function generateMarketBreadthChartSvg(data: MarketBreadthChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const categoryPill = isAr ? 'اتساع السوق والمشاركة' : 'MARKET BREADTH &amp; PARTICIPATION';
  const title = isAr ? 'اتساع السوق: الأسهم الصاعدة والهابطة' : 'EGX Market Breadth &amp; Participation';
  const subtitle = isAr ? 'مؤشر عمق السوق وتوزيع السيولة بين الأسهم الرابحة والخاسرة' : 'Advancers vs Decliners vs Unchanged Stock Participation Ratio';
  const disclaimer = isAr ? 'تحليل كمي فوري · بورصة مصر' : 'Real-Time Quantitative Breadth Analytics · Ticknal Engine';

  const advWidth = Math.max(20, (data.advancersPct / 100) * 960);
  const decWidth = Math.max(20, (data.declinersPct / 100) * 960);
  const flatWidth = Math.max(10, 960 - advWidth - decWidth);
  const adRatio = (data.advancers / Math.max(1, data.decliners)).toFixed(2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" style="background:#000000;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <rect width="1080" height="1080" fill="#000000" />
  <rect x="24" y="24" width="1032" height="1032" rx="20" fill="#000000" stroke="#222222" stroke-width="1.5" />

  ${renderBrandHeader(title, subtitle, data.date, categoryPill)}

  <!-- 1. Visual Stacked Participation Bar -->
  <g transform="translate(60, 220)">
    <rect width="960" height="42" rx="10" fill="#18181b" />
    <rect x="0" y="0" width="${advWidth}" height="42" rx="10" fill="#10b981" />
    <rect x="${advWidth}" y="0" width="${decWidth}" height="42" fill="#f43f5e" />
    <rect x="${advWidth + decWidth}" y="0" width="${flatWidth}" height="42" rx="10" fill="#52525b" />
    <text x="12" y="26" fill="#ffffff" font-size="13" font-weight="700">${data.advancersPct}%</text>
    <text x="${advWidth + 12}" y="26" fill="#ffffff" font-size="13" font-weight="700">${data.declinersPct}%</text>
  </g>

  <!-- 2. 3 Big Metric Columns -->
  <g transform="translate(60, 300)">
    <!-- Advancers -->
    <rect x="0" y="0" width="306" height="320" rx="16" fill="#000000" stroke="#10b981" stroke-width="1.5" />
    <text x="24" y="44" fill="#10b981" font-size="16" font-weight="700">▲ ${isAr ? 'الأسهم الصاعدة' : 'ADVANCERS'}</text>
    <text x="24" y="130" fill="#10b981" font-size="64" font-weight="700" font-variant-numeric="tabular-nums">${data.advancers}</text>
    <text x="24" y="170" fill="#ffffff" font-size="20" font-weight="600">${isAr ? 'سهم رابح' : 'Stocks Gained'}</text>
    <line x1="24" y1="210" x2="282" y2="210" stroke="#222222" stroke-width="1" />
    <text x="24" y="250" fill="#a1a1aa" font-size="14">${isAr ? 'نسبة المشاركة:' : 'Breadth Share:'}</text>
    <text x="24" y="284" fill="#10b981" font-size="24" font-weight="700">${data.advancersPct}%</text>

    <!-- Decliners -->
    <rect x="326" y="0" width="306" height="320" rx="16" fill="#000000" stroke="#f43f5e" stroke-width="1.5" />
    <text x="350" y="44" fill="#f43f5e" font-size="16" font-weight="700">▼ ${isAr ? 'الأسهم الهابطة' : 'DECLINERS'}</text>
    <text x="350" y="130" fill="#f43f5e" font-size="64" font-weight="700" font-variant-numeric="tabular-nums">${data.decliners}</text>
    <text x="350" y="170" fill="#ffffff" font-size="20" font-weight="600">${isAr ? 'سهم خاسر' : 'Stocks Declined'}</text>
    <line x1="350" y1="210" x2="608" y2="210" stroke="#222222" stroke-width="1" />
    <text x="350" y="250" fill="#a1a1aa" font-size="14">${isAr ? 'نسبة المشاركة:' : 'Breadth Share:'}</text>
    <text x="350" y="284" fill="#f43f5e" font-size="24" font-weight="700">${data.declinersPct}%</text>

    <!-- Flat -->
    <rect x="654" y="0" width="306" height="320" rx="16" fill="#000000" stroke="#333333" stroke-width="1.5" />
    <text x="678" y="44" fill="#a1a1aa" font-size="16" font-weight="700">● ${isAr ? 'دون تغيير' : 'UNCHANGED'}</text>
    <text x="678" y="130" fill="#d4d4d8" font-size="64" font-weight="700" font-variant-numeric="tabular-nums">${data.flat}</text>
    <text x="678" y="170" fill="#ffffff" font-size="20" font-weight="600">${isAr ? 'سهم مستقر' : 'Flat Stocks'}</text>
    <line x1="678" y1="210" x2="936" y2="210" stroke="#222222" stroke-width="1" />
    <text x="678" y="250" fill="#a1a1aa" font-size="14">${isAr ? 'نسبة الاستقرار:' : 'Stable Share:'}</text>
    <text x="678" y="284" fill="#a1a1aa" font-size="24" font-weight="700">${(100 - data.advancersPct - data.declinersPct).toFixed(1)}%</text>
  </g>

  <!-- 3. Key Breadth Ratios and Session Participation -->
  <g transform="translate(60, 660)">
    <rect width="960" height="300" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="32" y="44" fill="#ffffff" font-size="20" font-weight="700">${isAr ? 'مؤشرات اتساع السوق ونسبة الصعود للهبوط' : 'Advance / Decline Dynamics &amp; Participation Ratio'}</text>
    
    <!-- Left Column: A/D Ratio -->
    <text x="32" y="100" fill="#a1a1aa" font-size="14">${isAr ? 'نسبة الصعود إلى الهبوط (A/D Ratio)' : 'Advance / Decline Ratio (A/D)'}</text>
    <text x="32" y="150" fill="${data.advancers >= data.decliners ? '#10b981' : '#f43f5e'}" font-size="44" font-weight="700" font-variant-numeric="tabular-nums">${adRatio}x</text>
    <text x="32" y="186" fill="#71717a" font-size="14">${data.advancers >= data.decliners ? (isAr ? 'مشاركة إيجابية تدعم اتساع الحركة' : 'Positive breadth confirms buyers control') : (isAr ? 'ضغط بيعي واسع يفوق عدد الرابحين' : 'Bearish distribution breadth dominates')}</text>

    <!-- Right Column: Equities Traded and Turnover -->
    <rect x="520" y="80" width="400" height="180" rx="12" fill="#18181b" stroke="#333333" stroke-width="1" />
    <text x="548" y="120" fill="#a1a1aa" font-size="14">${isAr ? 'إجمالي الأسهم المتداولة:' : 'Total Active Traded Equities:'}</text>
    <text x="548" y="156" fill="#ffffff" font-size="28" font-weight="700" font-variant-numeric="tabular-nums">${data.totalStocks} ${isAr ? 'شركة مقيدة' : 'Listed Stocks'}</text>
    
    <text x="548" y="200" fill="#a1a1aa" font-size="14">${isAr ? 'إجمالي قيمة التداول المنفذة:' : 'Session Market Turnover:'}</text>
    <text x="548" y="234" fill="#00BCE6" font-size="22" font-weight="700" font-variant-numeric="tabular-nums">${data.turnoverBillion.toFixed(2)} Billion EGP</text>
  </g>

  ${renderFooter(disclaimer)}
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 4. GAINERS & LOSERS (1:1 Square Card)
 * Two clear columns: Top 5 Gainers (left) & Top 5 Losers (right)
 * Features ticker profile badge, full company name, and change %
 */
export function generateGainersLosersChartSvg(data: GainersLosersChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const categoryPill = isAr ? 'الأسهم الأكثر حركة بالبورصة' : 'TOP GAINERS &amp; LOSERS · SESSION MOVERS';
  const title = isAr ? 'الأسهم الأكثر ارتفاعاً وانخفاضاً' : 'Session Gainers &amp; Losers';
  const subtitle = isAr ? 'أكبر ٥ أسهم رابحة وخاسرة بالبورصة المصرية (سيولة أكثر من مليون جنيه)' : 'Top 5 Advancers &amp; Decliners by Daily Return (Turnover &gt; 1M EGP)';
  const disclaimer = isAr ? 'تصفية السيولة: تنفيذات تزيد عن ١,٠٠٠,٠٠٠ جم لمنع الأسهم الخاملة' : 'Liquidity Filter: Min 1,000,000 EGP turnover to exclude illiquid micro-caps';

  const renderStockRow = (
    s: { ticker: string; companyName?: string; close: number; changePct: number; volume: number },
    idx: number,
    isGainer: boolean,
    colX: number,
    baseY: number
  ) => {
    const rowY = baseY + idx * 135;
    const accentColor = isGainer ? '#10b981' : '#f43f5e';
    const bgBadge = isGainer ? '#052e16' : '#4c0519';
    const rawName = s.companyName || s.ticker;
    const cleanName = rawName.length > 24 ? `${rawName.slice(0, 22)}…` : rawName;

    return `
    <!-- Row ${idx + 1} -->
    <g transform="translate(${colX}, ${rowY})">
      <rect width="460" height="120" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
      
      <!-- Circular Ticker Badge -->
      <circle cx="50" cy="60" r="28" fill="${bgBadge}" stroke="${accentColor}" stroke-width="1.5" />
      <text x="50" y="65" fill="#ffffff" font-size="13" font-weight="700" text-anchor="middle" font-variant-numeric="tabular-nums">${xmlEscape(s.ticker.slice(0, 4))}</text>
      
      <!-- Company Name and Ticker Code -->
      <text x="92" y="46" fill="#ffffff" font-size="16" font-weight="700">${xmlEscape(cleanName)}</text>
      <text x="92" y="72" fill="#71717a" font-size="13" font-weight="600">${xmlEscape(s.ticker)} · <tspan fill="#a1a1aa" font-weight="500">${s.close.toFixed(2)} EGP</tspan></text>
      <text x="92" y="96" fill="#52525b" font-size="12">${isAr ? 'حجم:' : 'Vol:'} ${s.volume >= 1_000_000 ? `${(s.volume / 1_000_000).toFixed(1)}M` : `${(s.volume / 1000).toFixed(0)}K`}</text>

      <!-- Return Pill Badge -->
      <rect x="320" y="38" width="120" height="44" rx="10" fill="${bgBadge}" stroke="${accentColor}" stroke-width="1.5" />
      <text x="380" y="66" fill="${accentColor}" font-size="18" font-weight="700" text-anchor="middle" font-variant-numeric="tabular-nums">${s.changePct >= 0 ? '+' : ''}${s.changePct.toFixed(2)}%</text>
    </g>
    `;
  };

  const gainersRows = (data.topGainers || []).slice(0, 5).map((s, idx) => renderStockRow(s, idx, true, 60, 270)).join('');
  const losersRows = (data.topLosers || []).slice(0, 5).map((s, idx) => renderStockRow(s, idx, false, 560, 270)).join('');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" style="background:#000000;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <rect width="1080" height="1080" fill="#000000" />
  <rect x="24" y="24" width="1032" height="1032" rx="20" fill="#000000" stroke="#222222" stroke-width="1.5" />

  ${renderBrandHeader(title, subtitle, data.date, categoryPill)}

  <!-- Column Headers -->
  <!-- Left Header: Gainers -->
  <g transform="translate(60, 210)">
    <rect width="460" height="46" rx="10" fill="#052e16" stroke="#10b981" stroke-width="1" />
    <text x="24" y="30" fill="#10b981" font-size="16" font-weight="700">▲ ${isAr ? 'الأسهم الأكثر صعوداً (GAINERS)' : 'TOP 5 GAINERS'}</text>
  </g>

  <!-- Right Header: Losers -->
  <g transform="translate(560, 210)">
    <rect width="460" height="46" rx="10" fill="#4c0519" stroke="#f43f5e" stroke-width="1" />
    <text x="24" y="30" fill="#f43f5e" font-size="16" font-weight="700">▼ ${isAr ? 'الأسهم الأكثر هبوطاً (LOSERS)' : 'TOP 5 LOSERS'}</text>
  </g>

  <!-- Stock Rows -->
  ${gainersRows}
  ${losersRows}

  ${renderFooter(disclaimer)}
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 5. USD/EGP UPDATE & SHADOW PROXIES (1:1 Square Card)
 */
export function generateUsdEgpUpdateChartSvg(data: UsdEgpUpdateChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const categoryPill = isAr ? 'متابعة سعر الصرف والتعويم' : 'USD/EGP UPDATE · SHADOW PROXIES';
  const title = isAr ? 'متابعة الدولار وتوقعات التعويم' : 'USD/EGP Fair Value &amp; Shadow Proxies';
  const subtitle = isAr ? 'مقارنة السعر الرسمي بسعر الذهب وشهادات CIB لندن ومؤشر الضغط' : 'Official Spot vs Sagha Gold, London GDR &amp; Devaluation Pressure Index';
  const disclaimer = isAr ? 'نموذج تكنال الرياضي لمتابعة ضغوط العملة الأجنبية' : 'Ticknal Currency Triangulation &amp; Devaluation Risk Algorithm';

  const spreadPct = Number((((data.compositeFair - data.officialUsd) / data.officialUsd) * 100).toFixed(1));
  const goldGapPct = Number((((data.saghaGoldUsd - data.officialUsd) / data.officialUsd) * 100).toFixed(1));
  const gdrGapPct = Number((((data.londonGdrUsd - data.officialUsd) / data.officialUsd) * 100).toFixed(1));

  const riskScore = Math.min(100, Math.max(0, data.devaluationRiskScore || 25));
  const riskColor = riskScore > 60 ? '#f43f5e' : riskScore > 35 ? '#f59e0b' : '#10b981';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1080" width="1080" height="1080" style="background:#000000;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <rect width="1080" height="1080" fill="#000000" />
  <rect x="24" y="24" width="1032" height="1032" rx="20" fill="#000000" stroke="#222222" stroke-width="1.5" />

  ${renderBrandHeader(title, subtitle, data.date, categoryPill)}

  <!-- 1. Central Rate Comparison Banner -->
  <g transform="translate(60, 220)">
    <!-- Official Rate -->
    <rect x="0" y="0" width="460" height="190" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="28" y="44" fill="#a1a1aa" font-size="15" font-weight="600">${isAr ? 'السعر الرسمي (البنك المركزي)' : 'Official Bank Spot Rate (CBE)'}</text>
    <text x="28" y="112" fill="#ffffff" font-size="52" font-weight="700" font-variant-numeric="tabular-nums">${data.officialUsd.toFixed(2)}</text>
    <text x="28" y="152" fill="#71717a" font-size="15">EGP per 1 USD</text>

    <!-- Composite Fair Value -->
    <rect x="500" y="0" width="460" height="190" rx="16" fill="#000000" stroke="#00BCE6" stroke-width="1.5" />
    <text x="528" y="44" fill="#00BCE6" font-size="15" font-weight="600">${isAr ? 'السعر العادل التوازني الحقيقي' : 'Real Composite Fair Value Implied'}</text>
    <text x="528" y="112" fill="#00BCE6" font-size="52" font-weight="700" font-variant-numeric="tabular-nums">${data.compositeFair.toFixed(2)}</text>
    <text x="528" y="152" fill="#71717a" font-size="15">EGP · <tspan fill="#00BCE6" font-weight="600">${spreadPct >= 0 ? '+' : ''}${spreadPct}% ${isAr ? 'فجوة تسعير' : 'Gap'}</tspan></text>
  </g>

  <!-- 2. Parallel Shadow Proxies (3 Cards) -->
  <g transform="translate(60, 440)">
    <!-- Sagha Gold -->
    <rect x="0" y="0" width="306" height="210" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="24" y="40" fill="#f59e0b" font-size="14" font-weight="700">● ${isAr ? 'دولار الصاغة (الذهب)' : 'Sagha Gold Implied'}</text>
    <text x="24" y="96" fill="#ffffff" font-size="36" font-weight="700" font-variant-numeric="tabular-nums">${data.saghaGoldUsd.toFixed(2)}</text>
    <text x="24" y="126" fill="#71717a" font-size="13">EGP per USD</text>
    <rect x="24" y="154" width="130" height="26" rx="6" fill="#f59e0b20" />
    <text x="89" y="172" fill="#f59e0b" font-size="12" font-weight="700" text-anchor="middle">${goldGapPct >= 0 ? '+' : ''}${goldGapPct}% ${isAr ? 'علاوة' : 'Spread'}</text>

    <!-- London GDR -->
    <rect x="326" y="0" width="306" height="210" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="350" y="40" fill="#1d9bf0" font-size="14" font-weight="700">● ${isAr ? 'دولار شهادات لندن (GDR)' : 'London CIB GDR Rate'}</text>
    <text x="350" y="96" fill="#ffffff" font-size="36" font-weight="700" font-variant-numeric="tabular-nums">${data.londonGdrUsd.toFixed(2)}</text>
    <text x="350" y="126" fill="#71717a" font-size="13">EGP per USD</text>
    <rect x="350" y="154" width="130" height="26" rx="6" fill="#1d9bf020" />
    <text x="415" y="172" fill="#1d9bf0" font-size="12" font-weight="700" text-anchor="middle">${gdrGapPct >= 0 ? '+' : ''}${gdrGapPct}% ${isAr ? 'علاوة' : 'Spread'}</text>

    <!-- Peg Target -->
    <rect x="654" y="0" width="306" height="210" rx="14" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="678" y="40" fill="#a1a1aa" font-size="14" font-weight="700">● ${isAr ? 'ثبات النطاق السعري' : 'FX Peg Stability'}</text>
    <text x="678" y="96" fill="#ffffff" font-size="36" font-weight="700" font-variant-numeric="tabular-nums">${data.atrCompressionRatio.toFixed(2)}x</text>
    <text x="678" y="126" fill="#71717a" font-size="13">ATR Compression</text>
    <rect x="678" y="154" width="130" height="26" rx="6" fill="#10b98120" />
    <text x="743" y="172" fill="#10b981" font-size="12" font-weight="700" text-anchor="middle">${isAr ? 'نطاق هادئ' : 'PEG STABLE'}</text>
  </g>

  <!-- 3. Devaluation Pressure Gauge Card -->
  <g transform="translate(60, 680)">
    <rect width="960" height="280" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />
    <text x="32" y="44" fill="#ffffff" font-size="20" font-weight="700">${isAr ? 'مؤشر احتمالية وضغط التعويم (Devaluation Risk Index)' : 'Devaluation Pressure &amp; Currency Peg Health'}</text>
    
    <!-- Big Score Number -->
    <text x="32" y="120" fill="${riskColor}" font-size="56" font-weight="700" font-variant-numeric="tabular-nums">${riskScore}<tspan font-size="28" fill="#71717a">/100</tspan></text>
    <text x="32" y="160" fill="#ffffff" font-size="18" font-weight="600">${xmlEscape(data.devaluationRiskLabel)}</text>
    <text x="32" y="196" fill="#71717a" font-size="14">${isAr ? 'الضغط الحالي على الجنيه منخفض، وفجوة السعر الموازي ضمن الحدود الآمنة (&lt; ٥٪).' : 'Current parallel proxy divergence is constrained below 5%, signaling mild pressure.'}</text>

    <!-- Progress Meter -->
    <rect x="32" y="226" width="896" height="16" rx="8" fill="#18181b" />
    <rect x="32" y="226" width="${Math.max(16, (riskScore / 100) * 896)}" height="16" rx="8" fill="${riskColor}" />
  </g>

  ${renderFooter(disclaimer)}
</svg>`;

  return toBase64Svg(svg);
}

/**
 * Backward compatibility aliases
 */
export const generateInvestorFlowsChartSvg = generateHotMoneyChartSvg;
export const generateEgx30ChartSvg = generateTradeSummaryChartSvg;
export const generateFxArbitrageChartSvg = generateUsdEgpUpdateChartSvg;

/**
 * Helper to generate dual-locale bundle { en: dataUrl, ar: dataUrl }
 */
export function generateLocalizedTakeBundle<T>(generator: (data: T, locale: 'en' | 'ar') => string, data: T): string {
  const en = generator(data, 'en');
  const ar = generator(data, 'ar');
  return JSON.stringify({ en, ar });
}

export function resolveLocalizedChartSvg(
  rawImageUrl?: string | null,
  targetLocale: string = 'en'
): string | null {
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
