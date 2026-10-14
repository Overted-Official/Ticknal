/**
 * Ticknal Take High-Fidelity 16:9 Vector SVG Chart Snapshot Generators
 * Generates pure-pitch-black (#000000) vector financial cards formatted for Twitter/X, LinkedIn, and web feeds.
 * Dimensions: 1200x675 (16:9 standard social card ratio) with tabular-nums and sans-serif typography.
 */

function toBase64Svg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
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
  topGainers: Array<{ ticker: string; close: number; changePct: number; volume: number }>;
  topLosers: Array<{ ticker: string; close: number; changePct: number; volume: number }>;
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

/**
 * 1. Hot Money Status SVG Card (1200x675)
 */
export function generateHotMoneyChartSvg(data: HotMoneyChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const isAccumulating = data.rolling30dForeignNetMillion >= 0;
  const statusColor = isAccumulating ? '#10b981' : '#f43f5e';
  const statusText = isAr
    ? isAccumulating
      ? 'تدفقات أجنبية واردة'
      : 'تخارج سيولة أجنبية (تحذير)'
    : isAccumulating
    ? 'CAPITAL INFLOW'
    : 'CAPITAL FLIGHT ALERT';

  const bars = data.dailyBars30d || [];
  const barCount = Math.max(1, bars.length);
  const chartX = 60;
  const chartW = 1080;
  const zeroY = 380;

  const maxAbsDaily = Math.max(...bars.map((b) => Math.abs(b.foreignNetMillion)), 40);
  const maxBarH = 110;

  const cumValues = bars.map((b) => b.cumulativeMillion);
  const minCum = Math.min(...cumValues, 0);
  const maxCum = Math.max(...cumValues, 0);
  const cumRange = maxCum - minCum || 1;

  const barElements = bars
    .map((b, i) => {
      const slotW = chartW / barCount;
      const barW = Math.max(6, slotW - 8);
      const x = chartX + i * slotW + (slotW - barW) / 2;
      const val = b.foreignNetMillion;
      const barH = Math.min(maxBarH, (Math.abs(val) / maxAbsDaily) * maxBarH);
      const y = val >= 0 ? zeroY - barH : zeroY;
      const color = val >= 0 ? '#10b981' : '#f43f5e';
      return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(3, barH).toFixed(1)}" rx="3" fill="${color}" opacity="0.85" />`;
    })
    .join('\n    ');

  const cumPoints = bars
    .map((b, i) => {
      const slotW = chartW / barCount;
      const x = chartX + i * slotW + slotW / 2;
      const norm = (b.cumulativeMillion - minCum) / cumRange;
      const y = 470 - norm * 180;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const titleCategory = isAr ? 'مقياس الأموال الساخنة · تتبع حركة السيولة المؤسسية' : 'HOT MONEY STATUS · INSTITUTIONAL FLOW TRACKER';
  const mainTitle = isAr ? 'اتجاه صافي مشتريات ومبيعات الأجانب والعرب (30 يوماً)' : 'Foreign & Arab Institutional Net Flows (30-Day Rolling)';
  const rightLabel = isAr ? 'صافي 30 يوماً التراكمي' : '30D ROLLING NET FLOW';
  const rightVal = `${data.rolling30dForeignNetMillion >= 0 ? '+' : ''}${data.rolling30dForeignNetMillion.toFixed(1)}M EGP`;

  const watermark = isAr ? 'نبض تكنال' : 'ticknal take';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <rect width="1200" height="675" fill="#000000" />
  <rect x="24" y="24" width="1152" height="627" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />

  <!-- Header -->
  <text x="60" y="76" fill="#71717a" font-size="14" font-weight="600" letter-spacing="0.08em">${titleCategory}</text>
  <text x="60" y="118" fill="#ffffff" font-size="28" font-weight="700">${mainTitle}</text>
  <text x="1140" y="76" fill="#71717a" font-size="14" font-weight="500" text-anchor="end">${rightLabel}</text>
  <text x="1140" y="118" fill="${statusColor}" font-size="30" font-weight="800" text-anchor="end" font-feature-settings="'tnum' on">${rightVal}</text>

  <!-- Status Pill & Ratios -->
  <g transform="translate(60, 142)">
    <rect width="${isAr ? 240 : 210}" height="32" rx="6" fill="${isAccumulating ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}" stroke="${statusColor}" stroke-width="1.2" />
    <text x="${isAr ? 120 : 105}" y="21" fill="${statusColor}" font-size="13" font-weight="700" text-anchor="middle">${statusText}</text>
  </g>
  <text x="${isAr ? 320 : 290}" y="163" fill="#a1a1aa" font-size="14" font-feature-settings="'tnum' on">
    ${isAr ? `جلسات الشراء: ${data.inflowDaysCount} · جلسات البيع: ${data.outflowDaysCount} · تداولات اليوم: ${data.totalTurnoverBillion.toFixed(2)} مليار ج.م` : `Inflow: ${data.inflowDaysCount} days · Outflow: ${data.outflowDaysCount} days · Today Turnover: ${data.totalTurnoverBillion.toFixed(2)}B EGP`}
  </text>

  <!-- Baseline -->
  <line x1="60" y1="${zeroY}" x2="1140" y2="${zeroY}" stroke="#27272a" stroke-width="1.5" stroke-dasharray="4 4" />
  <text x="52" y="${zeroY + 4}" fill="#71717a" font-size="11" text-anchor="end">0</text>

  <!-- Bars & Overlaid Trend -->
  ${barElements}
  <polyline fill="none" stroke="#00BCE6" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" points="${cumPoints}" opacity="0.95" />

  <!-- Legend -->
  <g transform="translate(60, 560)">
    <rect width="12" height="12" rx="3" fill="#10b981" />
    <text x="20" y="11" fill="#a1a1aa" font-size="13">${isAr ? 'صافي شراء أجنبي' : 'Daily Net Buy'}</text>
    <rect x="${isAr ? 180 : 160}" width="12" height="12" rx="3" fill="#f43f5e" />
    <text x="${isAr ? 200 : 180}" y="11" fill="#a1a1aa" font-size="13">${isAr ? 'صافي بيع أجنبي' : 'Daily Net Sell'}</text>
    <line x1="${isAr ? 350 : 320}" y1="6" x2="${isAr ? 380 : 350}" y2="6" stroke="#00BCE6" stroke-width="3" />
    <text x="${isAr ? 390 : 360}" y="11" fill="#00BCE6" font-size="13" font-weight="600">${isAr ? 'المنحنى التراكمي (30 يوماً)' : '30D Cumulative Curve'}</text>
  </g>

  <!-- Footer Watermark -->
  <text x="60" y="618" fill="#71717a" font-size="13" font-feature-settings="'tnum' on">${isAr ? `تاريخ الجلسة: ${data.date}` : `Session Date: ${data.date}`}</text>
  <text x="1140" y="618" fill="#52525b" font-size="14" font-weight="700" text-anchor="end" letter-spacing="-0.04em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 2. Daily Trade Summary SVG Card (EGX 30, 70, 100) (1200x675)
 */
export function generateTradeSummaryChartSvg(data: TradeSummaryChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const watermark = isAr ? 'نبض تكنال' : 'ticknal take';

  const indices = [
    { name: 'EGX 30', close: data.egx30Close, pct: data.egx30ChangePct, sub: isAr ? 'الأسهم القيادية' : 'Blue-Chips' },
    { name: 'EGX 70 EWI', close: data.egx70Close, pct: data.egx70ChangePct, sub: isAr ? 'المتوسطة والصغيرة' : 'Mid & Small Caps' },
    { name: 'EGX 100 EWI', close: data.egx100Close, pct: data.egx100ChangePct, sub: isAr ? 'المؤشر الشامل' : 'Broad Market' },
  ];

  const boxes = indices
    .map((idx, i) => {
      const boxW = 340;
      const x = 60 + i * 370;
      const isUp = idx.pct >= 0;
      const color = isUp ? '#10b981' : '#f43f5e';
      return `
    <rect x="${x}" y="180" width="${boxW}" height="260" rx="12" fill="#050505" stroke="#222222" stroke-width="1.5" />
    <text x="${x + 24}" y="224" fill="#a1a1aa" font-size="16" font-weight="600">${idx.name}</text>
    <text x="${x + 24}" y="250" fill="#71717a" font-size="13">${idx.sub}</text>
    <text x="${x + 24}" y="324" fill="#ffffff" font-size="38" font-weight="800" font-feature-settings="'tnum' on">${idx.close.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</text>
    <g transform="translate(${x + 24}, 356)">
      <rect width="110" height="32" rx="6" fill="${isUp ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}" stroke="${color}" stroke-width="1.2" />
      <text x="55" y="21" fill="${color}" font-size="15" font-weight="700" text-anchor="middle" font-feature-settings="'tnum' on">${idx.pct >= 0 ? '+' : ''}${idx.pct.toFixed(2)}%</text>
    </g>
      `;
    })
    .join('\n');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <rect width="1200" height="675" fill="#000000" />
  <rect x="24" y="24" width="1152" height="627" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />

  <text x="60" y="76" fill="#71717a" font-size="14" font-weight="600" letter-spacing="0.08em">${isAr ? 'ملخص جلسة التداول اليومية · مؤشرات البورصة المصرية' : 'DAILY TRADE SUMMARY · EGX BENCHMARK DASHBOARD'}</text>
  <text x="60" y="118" fill="#ffffff" font-size="28" font-weight="700">${isAr ? 'أداء مؤشرات السوق والسيولة العامة' : 'Market Indices & Total Liquidity Overview'}</text>
  <text x="1140" y="76" fill="#71717a" font-size="14" font-weight="500" text-anchor="end">${isAr ? 'إجمالي التداول' : 'TOTAL TURNOVER'}</text>
  <text x="1140" y="118" fill="#ffffff" font-size="30" font-weight="800" text-anchor="end" font-feature-settings="'tnum' on">${data.turnoverBillion.toFixed(2)}B EGP</text>

  ${boxes}

  <!-- Footer Banner -->
  <g transform="translate(60, 480)">
    <rect width="1080" height="70" rx="10" fill="#09090b" stroke="#27272a" stroke-width="1" />
    <text x="24" y="42" fill="#e4e4e7" font-size="16" font-weight="600">${isAr ? `معنويات الجلسة العامة: ${data.sentiment}` : `Session Market Sentiment: ${data.sentiment}`}</text>
    <text x="1056" y="42" fill="#71717a" font-size="14" text-anchor="end" font-feature-settings="'tnum' on">${data.date}</text>
  </g>

  <text x="60" y="618" fill="#71717a" font-size="13">${isAr ? 'بيانات معتمدة من البورصة المصرية' : 'Official EGX Session Data'}</text>
  <text x="1140" y="618" fill="#52525b" font-size="14" font-weight="700" text-anchor="end" letter-spacing="-0.04em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 3. Market Breadth SVG Card (Advancers / Decliners / Unchanged) (1200x675)
 */
export function generateMarketBreadthChartSvg(data: MarketBreadthChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const watermark = isAr ? 'نبض تكنال' : 'ticknal take';
  const total = Math.max(1, data.totalStocks);
  const barTotalW = 1080;
  const advW = (data.advancers / total) * barTotalW;
  const decW = (data.decliners / total) * barTotalW;
  const flatW = Math.max(0, barTotalW - advW - decW);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <rect width="1200" height="675" fill="#000000" />
  <rect x="24" y="24" width="1152" height="627" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />

  <text x="60" y="76" fill="#71717a" font-size="14" font-weight="600" letter-spacing="0.08em">${isAr ? 'اتساع السوق وسيولة الأسهم · فحص عمق التداول' : 'MARKET BREADTH · ADVANCE / DECLINE DISTRIBUTION'}</text>
  <text x="60" y="118" fill="#ffffff" font-size="28" font-weight="700">${isAr ? 'نسبة مشاركة الأسهم الصاعدة والهابطة' : 'Stock Participation & Market Depth Ratio'}</text>
  <text x="1140" y="76" fill="#71717a" font-size="14" font-weight="500" text-anchor="end">${isAr ? 'عدد الشركات المتداولة' : 'TOTAL TRADED'}</text>
  <text x="1140" y="118" fill="#ffffff" font-size="30" font-weight="800" text-anchor="end" font-feature-settings="'tnum' on">${data.totalStocks} Stocks</text>

  <!-- 3 Big Metric Cards -->
  <g transform="translate(60, 160)">
    <rect width="340" height="150" rx="12" fill="#050505" stroke="#10b981" stroke-width="1.5" />
    <text x="24" y="44" fill="#10b981" font-size="16" font-weight="700">${isAr ? 'الأسهم الصاعدة (Advancers)' : 'ADVANCING STOCKS'}</text>
    <text x="24" y="104" fill="#ffffff" font-size="44" font-weight="800" font-feature-settings="'tnum' on">${data.advancers}</text>
    <text x="24" y="132" fill="#10b981" font-size="14" font-weight="600" font-feature-settings="'tnum' on">${data.advancersPct.toFixed(1)}% of market</text>
  </g>
  <g transform="translate(430, 160)">
    <rect width="340" height="150" rx="12" fill="#050505" stroke="#f43f5e" stroke-width="1.5" />
    <text x="24" y="44" fill="#f43f5e" font-size="16" font-weight="700">${isAr ? 'الأسهم الهابطة (Decliners)' : 'DECLINING STOCKS'}</text>
    <text x="24" y="104" fill="#ffffff" font-size="44" font-weight="800" font-feature-settings="'tnum' on">${data.decliners}</text>
    <text x="24" y="132" fill="#f43f5e" font-size="14" font-weight="600" font-feature-settings="'tnum' on">${data.declinersPct.toFixed(1)}% of market</text>
  </g>
  <g transform="translate(800, 160)">
    <rect width="340" height="150" rx="12" fill="#050505" stroke="#3f3f46" stroke-width="1.5" />
    <text x="24" y="44" fill="#a1a1aa" font-size="16" font-weight="700">${isAr ? 'بدون تغيير (Unchanged)' : 'UNCHANGED STOCKS'}</text>
    <text x="24" y="104" fill="#ffffff" font-size="44" font-weight="800" font-feature-settings="'tnum' on">${data.flat}</text>
    <text x="24" y="132" fill="#71717a" font-size="14" font-weight="600" font-feature-settings="'tnum' on">${((data.flat / total) * 100).toFixed(1)}% of market</text>
  </g>

  <!-- Breadth Distribution Bar -->
  <g transform="translate(60, 360)">
    <text x="0" y="-14" fill="#a1a1aa" font-size="14" font-weight="600">${isAr ? 'شريط اتساع السوق النسبي' : 'RELATIVE PARTICIPATION SPECTRUM'}</text>
    <rect x="0" y="0" width="${advW.toFixed(1)}" height="32" rx="4" fill="#10b981" />
    <rect x="${advW.toFixed(1)}" y="0" width="${decW.toFixed(1)}" height="32" rx="4" fill="#f43f5e" />
    <rect x="${(advW + decW).toFixed(1)}" y="0" width="${flatW.toFixed(1)}" height="32" rx="4" fill="#3f3f46" />
  </g>

  <!-- Summary Card -->
  <g transform="translate(60, 440)">
    <rect width="1080" height="110" rx="10" fill="#09090b" stroke="#27272a" stroke-width="1" />
    <text x="30" y="48" fill="#ffffff" font-size="18" font-weight="700">${data.advancers >= data.decliners ? (isAr ? 'صعود متسع: الأغلبية تدعم الاتجاه الإيجابي' : 'Broad Participation: Advancers Dominate Tape') : (isAr ? 'ضعف الاتساع: ضغوط جني أرباح وبيعية عامة' : 'Narrow Breadth: Broad Selling Pressure Across Sectors')}</text>
    <text x="30" y="82" fill="#a1a1aa" font-size="14">${isAr ? `بلغ صافي الفارق بين الصاعد والهابط ${data.advancers - data.decliners} شركة، بإجمالي سيولة ${data.turnoverBillion.toFixed(2)} مليار ج.م.` : `Net advance/decline differential stands at ${data.advancers - data.decliners} equities with ${data.turnoverBillion.toFixed(2)}B EGP total session volume.`}</text>
  </g>

  <text x="60" y="618" fill="#71717a" font-size="13">${isAr ? `تاريخ الجلسة: ${data.date}` : `Session Date: ${data.date}`}</text>
  <text x="1140" y="618" fill="#52525b" font-size="14" font-weight="700" text-anchor="end" letter-spacing="-0.04em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 4. Top 5 Gainers & Losers SVG Card (1200x675)
 */
export function generateGainersLosersChartSvg(data: GainersLosersChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const watermark = isAr ? 'نبض تكنال' : 'ticknal take';

  const renderRows = (items: Array<{ ticker: string; close: number; changePct: number; volume: number }>, isGainers: boolean, startX: number) => {
    return items
      .slice(0, 5)
      .map((item, idx) => {
        const y = 220 + idx * 64;
        const color = isGainers ? '#10b981' : '#f43f5e';
        const sign = item.changePct >= 0 ? '+' : '';
        return `
    <g transform="translate(${startX}, ${y})">
      <rect width="520" height="52" rx="8" fill="#070708" stroke="#1f1f23" stroke-width="1" />
      <text x="20" y="32" fill="#ffffff" font-size="18" font-weight="700">${item.ticker}</text>
      <text x="240" y="32" fill="#a1a1aa" font-size="16" font-feature-settings="'tnum' on">${item.close.toFixed(2)} EGP</text>
      <rect x="390" y="10" width="110" height="32" rx="6" fill="${isGainers ? 'rgba(16,185,129,0.15)' : 'rgba(244,63,94,0.15)'}" stroke="${color}" stroke-width="1" />
      <text x="445" y="31" fill="${color}" font-size="15" font-weight="700" text-anchor="middle" font-feature-settings="'tnum' on">${sign}${item.changePct.toFixed(2)}%</text>
    </g>
        `;
      })
      .join('\n');
  };

  const gainersHtml = renderRows(data.topGainers, true, 60);
  const losersHtml = renderRows(data.topLosers, false, 620);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <rect width="1200" height="675" fill="#000000" />
  <rect x="24" y="24" width="1152" height="627" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />

  <text x="60" y="76" fill="#71717a" font-size="14" font-weight="600" letter-spacing="0.08em">${isAr ? 'الأسهم الأكثر صعوداً وهبوطاً · سيولة السوق اليوم' : 'TOP GAINERS & LOSERS · SESSION MOMENTUM'}</text>
  <text x="60" y="118" fill="#ffffff" font-size="28" font-weight="700">${isAr ? 'أقوى 5 رابحين وأقوى 5 خاسرين (فوق مليون جنيه تداول)' : 'Top 5 Advancers & Decliners (Turnover > 1M EGP)'}</text>
  <text x="1140" y="118" fill="#a1a1aa" font-size="16" text-anchor="end">${data.date}</text>

  <!-- Left Column: Top Gainers -->
  <text x="60" y="180" fill="#10b981" font-size="18" font-weight="700">${isAr ? '▲ الأكثر ارتفاعاً' : '▲ TOP 5 GAINERS'}</text>
  ${gainersHtml}

  <!-- Right Column: Top Losers -->
  <text x="620" y="180" fill="#f43f5e" font-size="18" font-weight="700">${isAr ? '▼ الأكثر انخفاضاً' : '▼ TOP 5 LOSERS'}</text>
  ${losersHtml}

  <text x="60" y="618" fill="#71717a" font-size="13">${isAr ? 'فلتر السيولة يستبعد الأسهم ضعيفة التداول لتفادي التشويه' : 'Filtered for liquidity to exclude illiquid penny stock distortions'}</text>
  <text x="1140" y="618" fill="#52525b" font-size="14" font-weight="700" text-anchor="end" letter-spacing="-0.04em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 5. USD/EGP Update SVG Card (Multi-proxy & Devaluation Risk) (1200x675)
 */
export function generateUsdEgpUpdateChartSvg(data: UsdEgpUpdateChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const watermark = isAr ? 'نبض تكنال' : 'ticknal take';
  const riskColor = data.devaluationRiskScore < 35 ? '#10b981' : data.devaluationRiskScore < 60 ? '#f59e0b' : '#f43f5e';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675" width="1200" height="675" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <rect width="1200" height="675" fill="#000000" />
  <rect x="24" y="24" width="1152" height="627" rx="16" fill="#000000" stroke="#222222" stroke-width="1.5" />

  <text x="60" y="76" fill="#71717a" font-size="14" font-weight="600" letter-spacing="0.08em">${isAr ? 'تحديث سعر الصرف ومخاطر التعويم · التسعير العادل والموازي' : 'USD/EGP UPDATE · SHADOW PROXIES & DEVALUATION RISK'}</text>
  <text x="60" y="118" fill="#ffffff" font-size="28" font-weight="700">${isAr ? 'مقارنة الدولار الرسمي، الصاغة، CIB لندن، ونموذج ضغط ATR' : 'Official Spot vs Sagha Gold, London GDR & ATR Peg Model'}</text>
  <text x="1140" y="76" fill="#71717a" font-size="14" font-weight="500" text-anchor="end">${isAr ? 'مؤشر ضغط التعويم' : 'DEVALUATION PRESSURE'}</text>
  <text x="1140" y="118" fill="${riskColor}" font-size="30" font-weight="800" text-anchor="end" font-feature-settings="'tnum' on">${data.devaluationRiskScore}% (${data.devaluationRiskLabel})</text>

  <!-- 4 Comparison Cards -->
  <g transform="translate(60, 160)">
    <rect width="255" height="200" rx="12" fill="#050505" stroke="#0099ff" stroke-width="1.5" />
    <text x="20" y="40" fill="#0099ff" font-size="14" font-weight="700">${isAr ? 'الرسمي (CBE)' : 'OFFICIAL SPOT'}</text>
    <text x="20" y="110" fill="#ffffff" font-size="38" font-weight="800" font-feature-settings="'tnum' on">${data.officialUsd.toFixed(2)}</text>
    <text x="20" y="140" fill="#71717a" font-size="13">EGP / USD</text>
    <text x="20" y="174" fill="#a1a1aa" font-size="12" font-feature-settings="'tnum' on">14D ATR: ${data.atr14.toFixed(2)} EGP</text>
  </g>

  <g transform="translate(335, 160)">
    <rect width="255" height="200" rx="12" fill="#050505" stroke="#10b981" stroke-width="1.5" />
    <text x="20" y="40" fill="#10b981" font-size="14" font-weight="700">${isAr ? 'القيمة العادلة المرجحة' : 'COMPOSITE FAIR'}</text>
    <text x="20" y="110" fill="#ffffff" font-size="38" font-weight="800" font-feature-settings="'tnum' on">${data.compositeFair.toFixed(2)}</text>
    <text x="20" y="140" fill="#71717a" font-size="13">EGP / USD</text>
    <text x="20" y="174" fill="#10b981" font-size="12" font-feature-settings="'tnum' on">${(((data.compositeFair - data.officialUsd) / data.officialUsd) * 100).toFixed(1)}% Gap</text>
  </g>

  <g transform="translate(610, 160)">
    <rect width="255" height="200" rx="12" fill="#050505" stroke="#eab308" stroke-width="1.5" />
    <text x="20" y="40" fill="#eab308" font-size="14" font-weight="700">${isAr ? 'دولار الصاغة (ذهب 24)' : 'SAGHA GOLD PROXY'}</text>
    <text x="20" y="110" fill="#ffffff" font-size="38" font-weight="800" font-feature-settings="'tnum' on">${data.saghaGoldUsd.toFixed(2)}</text>
    <text x="20" y="140" fill="#71717a" font-size="13">EGP / USD</text>
    <text x="20" y="174" fill="#eab308" font-size="12" font-feature-settings="'tnum' on">${(((data.saghaGoldUsd - data.officialUsd) / data.officialUsd) * 100).toFixed(1)}% Spread</text>
  </g>

  <g transform="translate(885, 160)">
    <rect width="255" height="200" rx="12" fill="#050505" stroke="#f97316" stroke-width="1.5" />
    <text x="20" y="40" fill="#f97316" font-size="14" font-weight="700">${isAr ? 'دولار CIB لندن (GDR)' : 'CIB LONDON PROXY'}</text>
    <text x="20" y="110" fill="#ffffff" font-size="38" font-weight="800" font-feature-settings="'tnum' on">${data.londonGdrUsd.toFixed(2)}</text>
    <text x="20" y="140" fill="#71717a" font-size="13">EGP / USD</text>
    <text x="20" y="174" fill="#f97316" font-size="12" font-feature-settings="'tnum' on">${(((data.londonGdrUsd - data.officialUsd) / data.officialUsd) * 100).toFixed(1)}% Spread</text>
  </g>

  <!-- ATR Volatility Compression Gauge Card -->
  <g transform="translate(60, 390)">
    <rect width="1080" height="150" rx="12" fill="#09090b" stroke="#27272a" stroke-width="1" />
    <text x="30" y="44" fill="#ffffff" font-size="18" font-weight="700">${isAr ? 'فحص ضغط التذبذب لأسعار الصرف (ATR Compression Meter)' : 'ATR Volatility Compression & Artificial Peg Detection'}</text>
    <text x="30" y="78" fill="#a1a1aa" font-size="14">
      ${isAr ? `معدل ضغط التذبذب: ${(data.atrCompressionRatio * 100).toFixed(1)}% (ATR 14D: ${data.atr14.toFixed(2)} مقابل ATR 90D: ${data.atr90.toFixed(2)}).` : `Compression ratio: ${(data.atrCompressionRatio * 100).toFixed(1)}% (14D ATR: ${data.atr14.toFixed(2)} vs 90D ATR: ${data.atr90.toFixed(2)}).`}
    </text>
    <text x="30" y="112" fill="${data.atrCompressionRatio < 0.4 ? '#f59e0b' : '#10b981'}" font-size="14" font-weight="600">
      ${data.atrCompressionRatio < 0.4 ? (isAr ? 'تنبيه: التذبذب مضغوط بشكل مصطنع؛ مخاطر حدوث قفزة تصحيحية مفاجئة مرتفعة.' : 'Alert: Volatility is artificially compressed. Elevated probability of step-devaluation shock.') : (isAr ? 'حالة التذبذب طبيعية: سعر الصرف يتحرك بنظام تعويم مدار دون فجوات اختناق.' : 'Organic Volatility: Two-way float regime intact without abnormal market dislocation.')}
    </text>
  </g>

  <text x="60" y="618" fill="#71717a" font-size="13">${isAr ? `تاريخ التحديث: ${data.date}` : `Update Date: ${data.date}`}</text>
  <text x="1140" y="618" fill="#52525b" font-size="14" font-weight="700" text-anchor="end" letter-spacing="-0.04em">${watermark}</text>
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
