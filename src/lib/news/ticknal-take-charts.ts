/**
 * Ticknal Take High-Fidelity SVG Chart Snapshot Generators
 * Generates pure-pitch-black (#000000) vector financial cards with zero external dependencies.
 * Output is base64-encoded SVG data URL suitable for instant rendering inside FeedPost images.
 */

function toBase64Svg(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export interface Egx30ChartData {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  changePct: number;
  changePts: number;
  turnoverBillion: number;
  advancers: number;
  decliners: number;
  flat: number;
  recentBars: number[]; // Last 7-10 closing prices
}

export interface InvestorFlowsChartData {
  date: string;
  totalTurnoverBillion: number;
  todayForeignNetMillion: number;
  todayArabNetMillion: number;
  todayEgyptianNetMillion: number;
  rolling30dForeignNetMillion: number;
  inflowDaysCount: number;
  outflowDaysCount: number;
  dailyBars30d: Array<{
    date: string;
    foreignNetMillion: number;
    cumulativeMillion: number;
  }>;
}

export interface FxArbitrageChartData {
  date: string;
  officialUsd: number;
  gdrImpliedRate: number;
  gdrSpreadPct: number;
  londonGdrUsd: number;
  cairoComiEgp: number;
  riskScore: number;
  riskLabel: string;
}

export interface GoldSpreadChartData {
  date: string;
  cairo24kGram: number;
  cairo21kGram: number;
  comexGoldUsd: number;
  globalConvertedGram24k: number;
  goldPremiumPct: number;
  officialUsd: number;
}

/**
 * 1. EGX30 Benchmark Wrap & Market Breadth Card
 */
export function generateEgx30ChartSvg(data: Egx30ChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const isUp = data.changePct >= 0;
  const statusColor = isUp ? '#10b981' : '#f43f5e';
  const totalStocks = Math.max(1, data.advancers + data.decliners + data.flat);

  const barTotalW = 720;
  const advW = (data.advancers / totalStocks) * barTotalW;
  const decW = (data.decliners / totalStocks) * barTotalW;
  const flatW = barTotalW - advW - decW;

  // Mini sparkline for recent bars
  let sparklinePolyline = '';
  if (data.recentBars && data.recentBars.length > 1) {
    const minVal = Math.min(...data.recentBars);
    const maxVal = Math.max(...data.recentBars);
    const range = maxVal - minVal || 1;
    const sparkW = 280;
    const sparkH = 60;
    const sparkX = 480;
    const sparkY = 130;

    sparklinePolyline = data.recentBars
      .map((val, idx) => {
        const x = sparkX + (idx / (data.recentBars.length - 1)) * sparkW;
        const y = sparkY + sparkH - ((val - minVal) / range) * sparkH;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  const headerCategory = isAr ? 'مؤشر EGX30 · اتساع السوق والسيولة' : 'EGX30 BENCHMARK PULSE · MARKET BREADTH';
  const headerTitle = isAr ? 'ملخص الإغلاق اليومي لمؤشر EGX30' : 'EGX30 Daily Closing Snapshot';
  const turnoverLabel = isAr ? 'إجمالي التداول' : 'TOTAL TURNOVER';
  const turnoverVal = isAr ? `${data.turnoverBillion.toFixed(2)} مليار ج.م` : `${data.turnoverBillion.toFixed(2)}B EGP`;
  const sparklineLabel = isAr ? 'المسار الفني لآخر 10 جلسات' : '10-DAY RECENT TRAJECTORY';
  const breadthLabel = isAr ? 'توزيع اتساع السوق (الرابحة والخاسرة)' : 'MARKET BREADTH DISTRIBUTION';
  const advancersLabel = isAr ? `${data.advancers} شركة رابحة` : `${data.advancers} Advancers`;
  const declinersLabel = isAr ? `${data.decliners} شركة خاسرة` : `${data.decliners} Decliners`;
  const flatLabel = isAr ? `${data.flat} بدون تغيير` : `${data.flat} Unchanged`;
  const footerStats = isAr
    ? `أدنى سعر: ${data.low.toLocaleString()} · أعلى سعر: ${data.high.toLocaleString()} · الافتتاح: ${data.open.toLocaleString()}`
    : `Session Low: ${data.low.toLocaleString()} · High: ${data.high.toLocaleString()} · Open: ${data.open.toLocaleString()}`;
  const watermark = isAr ? 'نبض تكنال' : 'ticknal pulse';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="${isAr ? '0.02em' : '0.08em'}">${headerCategory}</text>
  <text x="40" y="84" fill="#ffffff" font-size="${isAr ? '22' : '24'}" font-weight="700">${headerTitle}</text>

  <!-- Right Header: Turnover -->
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">${turnoverLabel}</text>
  <text x="760" y="78" fill="#ffffff" font-size="20" text-anchor="end" font-weight="700" font-feature-settings="'tnum' on">${turnoverVal}</text>
  <text x="760" y="96" fill="#a1a1aa" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Main Index Price -->
  <text x="40" y="148" fill="#ffffff" font-size="44" font-weight="800" font-feature-settings="'tnum' on">${data.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>
  <text x="40" y="176" fill="${statusColor}" font-size="16" font-weight="700" font-feature-settings="'tnum' on">${data.changePct >= 0 ? '+' : ''}${data.changePct.toFixed(2)}% (${data.changePts >= 0 ? '+' : ''}${data.changePts.toFixed(2)} pts)</text>

  <!-- Sparkline Trend -->
  ${sparklinePolyline ? `
  <g>
    <polyline fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${sparklinePolyline}" />
    <text x="760" y="125" fill="#71717a" font-size="10" text-anchor="end">${sparklineLabel}</text>
  </g>` : ''}

  <!-- Breadth Ratio Bar -->
  <text x="40" y="214" fill="#a1a1aa" font-size="11" font-weight="600" letter-spacing="${isAr ? '0.02em' : '0.04em'}">${breadthLabel}</text>
  <g transform="translate(40, 224)">
    <rect x="0" y="0" width="${advW.toFixed(1)}" height="12" rx="3" fill="#10b981" />
    <rect x="${advW.toFixed(1)}" y="0" width="${decW.toFixed(1)}" height="12" rx="3" fill="#f43f5e" />
    <rect x="${(advW + decW).toFixed(1)}" y="0" width="${flatW.toFixed(1)}" height="12" rx="3" fill="#52525b" />
  </g>

  <!-- Breadth Labels -->
  <g transform="translate(40, 256)">
    <circle cx="5" cy="5" r="4" fill="#10b981" />
    <text x="16" y="9" fill="#10b981" font-size="11" font-weight="700" font-feature-settings="'tnum' on">${advancersLabel}</text>

    <circle cx="150" cy="5" r="4" fill="#f43f5e" />
    <text x="161" y="9" fill="#f43f5e" font-size="11" font-weight="700" font-feature-settings="'tnum' on">${declinersLabel}</text>

    <circle cx="290" cy="5" r="4" fill="#71717a" />
    <text x="301" y="9" fill="#a1a1aa" font-size="11" font-weight="500" font-feature-settings="'tnum' on">${flatLabel}</text>
  </g>

  <!-- Footer Insight & Watermark -->
  <text x="40" y="324" fill="#71717a" font-size="11">${footerStats}</text>
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 2. Hot Money Barometer: 30-Day Rolling Foreign Net Flow Histogram & Cumulative Trend
 */
export function generateInvestorFlowsChartSvg(data: InvestorFlowsChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const isAccumulating = data.rolling30dForeignNetMillion >= 0;
  const statusColor = isAccumulating ? '#10b981' : '#f43f5e';
  const statusLabel = isAr
    ? isAccumulating
      ? 'تدفقات شرائية صافية'
      : 'تخارج صافي للأموال'
    : isAccumulating
    ? 'HOT MONEY INFLOW'
    : 'CAPITAL OUTFLOW';

  const bars = data.dailyBars30d || [];
  const barCount = Math.max(1, bars.length);
  const chartX = 40;
  const chartW = 720;
  const zeroY = 190;

  // Find max absolute daily flow for bar scaling
  const maxAbsDaily = Math.max(
    ...bars.map((b) => Math.abs(b.foreignNetMillion)),
    30
  );
  const maxBarH = 65; // max px height above or below zero

  // Find range of cumulative flow for polyline scaling
  const cumValues = bars.map((b) => b.cumulativeMillion);
  const minCum = Math.min(...cumValues, 0);
  const maxCum = Math.max(...cumValues, 0);
  const cumRange = maxCum - minCum || 1;

  // Generate 30 daily vertical bars
  const barSvgElements = bars.map((b, i) => {
    const slotW = chartW / barCount;
    const barW = Math.max(4, slotW - 5);
    const x = chartX + i * slotW + (slotW - barW) / 2;
    const val = b.foreignNetMillion;
    const barH = Math.min(maxBarH, (Math.abs(val) / maxAbsDaily) * maxBarH);
    const y = val >= 0 ? zeroY - barH : zeroY;
    const color = val >= 0 ? '#10b981' : '#f43f5e';
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(2, barH).toFixed(1)}" rx="2" fill="${color}" opacity="0.85" />`;
  }).join('\n    ');

  // Generate cumulative trend line points
  const cumPoints = bars.map((b, i) => {
    const slotW = chartW / barCount;
    const x = chartX + i * slotW + slotW / 2;
    const norm = (b.cumulativeMillion - minCum) / cumRange;
    const y = 245 - norm * 95;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const headerCategory = isAr ? 'مقياس الأموال الساخنة · التدفقات التراكمية (30 يوماً)' : 'HOT MONEY BAROMETER · 30-DAY ROLLING FLOWS';
  const headerTitle = isAr ? 'اتجاه سيولة المؤسسات الأجنبية بالبورصة' : 'Foreign Institutional Liquidity Trend';
  const rightLabel = isAr ? 'صافي 30 يوماً التراكمي' : '30D ROLLING NET';
  const rightVal = isAr
    ? `${data.rolling30dForeignNetMillion >= 0 ? '+' : ''}${data.rolling30dForeignNetMillion.toFixed(1)} مليون ج.م`
    : `${data.rolling30dForeignNetMillion >= 0 ? '+' : ''}${data.rolling30dForeignNetMillion.toFixed(1)}M EGP`;
  const ratioText = isAr
    ? `${data.inflowDaysCount} جلسة شراء · ${data.outflowDaysCount} جلسة بيع (نسبة الشراء ${Math.round((data.inflowDaysCount / barCount) * 100)}%)`
    : `${data.inflowDaysCount} Inflow Sessions · ${data.outflowDaysCount} Outflow Sessions (${Math.round((data.inflowDaysCount / barCount) * 100)}% Inflow Ratio)`;
  const legendBuy = isAr ? 'صافي شراء يومي' : 'Daily Net Buy';
  const legendSell = isAr ? 'صافي بيع يومي' : 'Daily Net Sell';
  const legendCurve = isAr ? 'المنحنى التراكمي 30 يوماً' : '30D Cumulative Curve';
  const footerStats = isAr
    ? `جلسة اليوم: ${data.todayForeignNetMillion >= 0 ? '+' : ''}${data.todayForeignNetMillion.toFixed(1)} مليون ج.م · التداولات ${data.totalTurnoverBillion.toFixed(2)} مليار ج.م`
    : `Session Today: ${data.todayForeignNetMillion >= 0 ? '+' : ''}${data.todayForeignNetMillion.toFixed(1)}M EGP · Turnover ${data.totalTurnoverBillion.toFixed(2)}B EGP`;
  const watermark = isAr ? 'نبض تكنال' : 'ticknal pulse';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="${isAr ? '0.02em' : '0.08em'}">${headerCategory}</text>
  <text x="40" y="84" fill="#ffffff" font-size="${isAr ? '22' : '24'}" font-weight="700">${headerTitle}</text>

  <!-- Right Header Stats: 30D Cumulative -->
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">${rightLabel}</text>
  <text x="760" y="78" fill="${statusColor}" font-size="20" text-anchor="end" font-weight="700" font-feature-settings="'tnum' on">${rightVal}</text>
  <text x="760" y="96" fill="#a1a1aa" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Status Pill -->
  <g transform="translate(40, 100)">
    <rect x="0" y="0" width="${isAr ? 170 : 160}" height="22" rx="4" fill="${isAccumulating ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'}" stroke="${isAccumulating ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}" stroke-width="1"/>
    <text x="${isAr ? 85 : 80}" y="15" fill="${statusColor}" font-size="10.5" font-weight="700" text-anchor="middle" letter-spacing="${isAr ? '0.02em' : '0.04em'}">${statusLabel}</text>
  </g>

  <!-- Inflow vs Outflow Ratio -->
  <text x="${isAr ? 225 : 215}" y="115" fill="#a1a1aa" font-size="11" font-feature-settings="'tnum' on">${ratioText}</text>

  <!-- Chart Baseline (Zero Line) -->
  <line x1="40" y1="${zeroY}" x2="760" y2="${zeroY}" stroke="#27272a" stroke-width="1.5" stroke-dasharray="4 4"/>
  <text x="36" y="${zeroY + 3}" fill="#71717a" font-size="9" text-anchor="end">0</text>

  <!-- 30-Day Daily Net Bars -->
  ${barSvgElements}

  <!-- Overlaid Cumulative Net Polyline -->
  <polyline fill="none" stroke="#00BCE6" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${cumPoints}" opacity="0.95" />

  <!-- Legend -->
  <g transform="translate(40, 280)">
    <rect x="0" y="4" width="8" height="8" rx="2" fill="#10b981" />
    <text x="14" y="12" fill="#a1a1aa" font-size="10">${legendBuy}</text>

    <rect x="${isAr ? 115 : 100}" y="4" width="8" height="8" rx="2" fill="#f43f5e" />
    <text x="${isAr ? 129 : 114}" y="12" fill="#a1a1aa" font-size="10">${legendSell}</text>

    <line x1="${isAr ? 220 : 195}" y1="8" x2="${isAr ? 240 : 215}" y2="8" stroke="#00BCE6" stroke-width="2.5" />
    <text x="${isAr ? 247 : 222}" y="12" fill="#00BCE6" font-size="10" font-weight="600">${legendCurve}</text>
  </g>

  <!-- Footer Insight & Watermark -->
  <text x="40" y="324" fill="#71717a" font-size="11">${footerStats}</text>
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 3. USD/EGP Arbitrage & CIB London ADR Implied Valuation Card
 */
export function generateFxArbitrageChartSvg(data: FxArbitrageChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const isHealthy = data.gdrSpreadPct <= 4;
  const spreadColor = isHealthy ? '#00BCE6' : '#f59e0b';
  const riskBadgeColor = data.riskScore < 30 ? '#10b981' : '#f59e0b';

  const riskLabelAr = data.riskScore < 30 ? 'مخاطر منخفضة' : data.riskScore < 50 ? 'فارق معتدل' : 'ضغوط مرتفعة';
  const headerCategory = isAr ? 'فوارق العملة والمراجحة الخارجية · CIB لندن' : 'CURRENCY DIVERGENCE · OFFSHORE ARBITRAGE';
  const headerTitle = isAr ? 'السعر الضمني للدولار عبر شهادات CIB لندن' : 'CIB London GDR Implied USD/EGP';
  const riskHeader = isAr ? 'مخاطر خفض العملة' : 'DEVALUATION RISK';
  const riskValue = isAr ? `${data.riskScore}% · ${riskLabelAr}` : `${data.riskScore}% · ${data.riskLabel}`;
  const leftBoxTitle = isAr ? 'السعر الرسمي بالبنوك المصرية' : 'OFFICIAL INTERBANK RATE';
  const leftBoxSub = isAr ? 'سعر الصرف الرسمي بالبنك المركزي' : 'CBE Central Clearing Corridor';
  const rightBoxTitle = isAr ? 'السعر الضمني لشهادات لندن (GDR)' : 'CIB LONDON ADR IMPLIED RATE';
  const rightBoxSub = isAr
    ? `سهم CIB بمصر ${data.cairoComiEgp.toFixed(2)} ج.م / لندن $${data.londonGdrUsd.toFixed(3)}`
    : `COMI ${data.cairoComiEgp.toFixed(2)} EGP / LSE $${data.londonGdrUsd.toFixed(3)}`;
  const spreadLabel = isAr
    ? `فارق المراجحة: ${data.gdrSpreadPct >= 0 ? '+' : ''}${data.gdrSpreadPct.toFixed(2)}%`
    : `SPREAD: ${data.gdrSpreadPct >= 0 ? '+' : ''}${data.gdrSpreadPct.toFixed(2)}%`;
  const explanation = isAr
    ? 'تسعير الشهادات بالخارج متطابق ومستقر مع السوق المصرفي الرسمي.'
    : 'Offshore pricing remains closely anchored to interbank clearing.';
  const watermark = isAr ? 'نبض تكنال' : 'ticknal pulse';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="${isAr ? '0.02em' : '0.08em'}">${headerCategory}</text>
  <text x="40" y="84" fill="#ffffff" font-size="${isAr ? '22' : '24'}" font-weight="700">${headerTitle}</text>
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">${riskHeader}</text>
  <text x="760" y="76" fill="${riskBadgeColor}" font-size="15" text-anchor="end" font-weight="700">${riskValue}</text>
  <text x="760" y="94" fill="#71717a" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Left Comparison Box: Official Interbank -->
  <rect x="40" y="116" width="340" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="64" y="146" fill="#a1a1aa" font-size="12" font-weight="500">${leftBoxTitle}</text>
  <text x="64" y="190" fill="#ffffff" font-size="34" font-weight="700" font-feature-settings="'tnum' on">${data.officialUsd.toFixed(2)} <tspan font-size="16" font-weight="500" fill="#71717a">${isAr ? 'ج.م' : 'EGP'}</tspan></text>
  <text x="64" y="222" fill="#71717a" font-size="11">${leftBoxSub}</text>

  <!-- Right Comparison Box: CIB ADR Implied Rate -->
  <rect x="420" y="116" width="340" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="444" y="146" fill="#a1a1aa" font-size="12" font-weight="500">${rightBoxTitle}</text>
  <text x="444" y="190" fill="#ffffff" font-size="34" font-weight="700" font-feature-settings="'tnum' on">${data.gdrImpliedRate.toFixed(2)} <tspan font-size="16" font-weight="500" fill="#71717a">${isAr ? 'ج.م' : 'EGP'}</tspan></text>
  <text x="444" y="222" fill="#71717a" font-size="11">${rightBoxSub}</text>

  <!-- Arbitrage Spread Pill -->
  <g transform="translate(40, 272)">
    <rect x="0" y="0" width="${isAr ? 230 : 220}" height="32" rx="6" fill="rgba(0,188,230,0.12)" stroke="${spreadColor}" stroke-width="1"/>
    <text x="${isAr ? 115 : 110}" y="21" fill="${spreadColor}" font-size="13" font-weight="700" text-anchor="middle" font-feature-settings="'tnum' on">${spreadLabel}</text>
  </g>

  <!-- Explanation note -->
  <text x="${isAr ? 290 : 280}" y="292" fill="#a1a1aa" font-size="12">${explanation}</text>

  <!-- Ticknal Watermark -->
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 4. Cairo Gold Spread vs LBMA Spot Card (Optional/Standby)
 */
export function generateGoldSpreadChartSvg(data: GoldSpreadChartData, locale: 'en' | 'ar' = 'en'): string {
  const isAr = locale === 'ar';
  const isHealthySpread = data.goldPremiumPct <= 5;
  const badgeColor = isHealthySpread ? '#10b981' : '#f59e0b';

  const headerCategory = isAr ? 'مقياس الذهب وتسعير الصاغة مقابل البورصة العالمية' : 'BULLION PARITY · PHYSICAL GOLD BAROMETER';
  const headerTitle = isAr ? 'سعر الذهب عيار 21 بمصر مقابل السعر العالمي (LBMA)' : 'Cairo Sagha 21K vs LBMA Global Spot';
  const rightLabel = isAr ? 'علاوة الصاغة' : 'SAGHA PREMIUM';
  const metric1Title = isAr ? 'ذهب عيار 21 (الصاغة)' : 'CAIRO SAGHA 21K';
  const metric1Sub = isAr ? 'المعيار القياسي للسبائك والمشغولات' : 'Benchmark jewelry & coin standard';
  const metric2Title = isAr ? 'ذهب عيار 24 (الصاغة)' : 'CAIRO SAGHA 24K';
  const metric2Sub = isAr ? 'سعر الذهب الخالص' : 'Pure bullion bar price';
  const metric3Title = isAr ? 'السعر العالمي المحوّل (عيار 24)' : 'LBMA CONVERTED (24K)';
  const metric3Sub = isAr ? `أوقية $${Math.round(data.comexGoldUsd)} @ ${data.officialUsd.toFixed(2)} جنيه` : `XAUUSD $${Math.round(data.comexGoldUsd)} @ ${data.officialUsd.toFixed(2)} FX`;
  const footerNote = isAr
    ? 'الفارق المحلي يعكس طلباً طبيعياً متوازناً دون مضاربات أو تسعير تحوطي مبالغ فيه.'
    : 'Retail spread reflects balanced physical demand without aggressive devaluation hoarding.';
  const watermark = isAr ? 'نبض تكنال' : 'ticknal pulse';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="${isAr ? '0.02em' : '0.08em'}">${headerCategory}</text>
  <text x="40" y="84" fill="#ffffff" font-size="${isAr ? '22' : '24'}" font-weight="700">${headerTitle}</text>
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">${rightLabel}</text>
  <text x="760" y="78" fill="${badgeColor}" font-size="18" text-anchor="end" font-weight="700" font-feature-settings="'tnum' on">${data.goldPremiumPct >= 0 ? '+' : ''}${data.goldPremiumPct.toFixed(2)}%</text>
  <text x="760" y="96" fill="#a1a1aa" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Metric 1: Cairo 21K Gram -->
  <rect x="40" y="116" width="220" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="60" y="146" fill="#eab308" font-size="11" font-weight="600">${metric1Title}</text>
  <text x="60" y="188" fill="#ffffff" font-size="28" font-weight="700" font-feature-settings="'tnum' on">${Math.round(data.cairo21kGram).toLocaleString('en-US')} <tspan font-size="14" font-weight="500" fill="#71717a">${isAr ? 'ج.م' : 'EGP'}</tspan></text>
  <text x="60" y="222" fill="#71717a" font-size="11">${metric1Sub}</text>

  <!-- Metric 2: Cairo 24K Gram -->
  <rect x="290" y="116" width="220" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="310" y="146" fill="#eab308" font-size="11" font-weight="600">${metric2Title}</text>
  <text x="310" y="188" fill="#ffffff" font-size="28" font-weight="700" font-feature-settings="'tnum' on">${Math.round(data.cairo24kGram).toLocaleString('en-US')} <tspan font-size="14" font-weight="500" fill="#71717a">${isAr ? 'ج.م' : 'EGP'}</tspan></text>
  <text x="310" y="222" fill="#71717a" font-size="11">${metric2Sub}</text>

  <!-- Metric 3: Global LBMA Spot Converted -->
  <rect x="540" y="116" width="220" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="560" y="146" fill="#a1a1aa" font-size="11" font-weight="600">${metric3Title}</text>
  <text x="560" y="188" fill="#ffffff" font-size="28" font-weight="700" font-feature-settings="'tnum' on">${Math.round(data.globalConvertedGram24k).toLocaleString('en-US')} <tspan font-size="14" font-weight="500" fill="#71717a">${isAr ? 'ج.م' : 'EGP'}</tspan></text>
  <text x="560" y="222" fill="#71717a" font-size="11">${metric3Sub}</text>

  <!-- Footer Insight & Watermark -->
  <text x="40" y="295" fill="#a1a1aa" font-size="12">${footerNote}</text>
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">${watermark}</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 5. Dynamic Runtime Translation of SVG strings to Arabic
 */
export function translateSvgToArabic(svgXml: string): string {
  let s = svgXml;

  // EGX30 card
  s = s.replace(/EGX30 BENCHMARK PULSE · MARKET BREADTH/g, 'مؤشر EGX30 · اتساع السوق والسيولة');
  s = s.replace(/EGX30 Daily Closing Snapshot/g, 'ملخص الإغلاق اليومي لمؤشر EGX30');
  s = s.replace(/TOTAL TURNOVER/g, 'إجمالي التداول');
  s = s.replace(/(\d+(?:\.\d+)?)B EGP/g, '$1 مليار ج.م');
  s = s.replace(/10-DAY RECENT TRAJECTORY/g, 'المسار الفني لآخر 10 جلسات');
  s = s.replace(/MARKET BREADTH DISTRIBUTION/g, 'توزيع اتساع السوق (الرابحة والخاسرة)');
  s = s.replace(/(\d+)\s+Advancers/g, '$1 شركة رابحة');
  s = s.replace(/(\d+)\s+Decliners/g, '$1 شركة خاسرة');
  s = s.replace(/(\d+)\s+Unchanged/g, '$1 بدون تغيير');
  s = s.replace(/Session Low:/g, 'أدنى سعر:');
  s = s.replace(/· High:/g, '· أعلى سعر:');
  s = s.replace(/· Open:/g, '· الافتتاح:');

  // Flows card
  s = s.replace(/HOT MONEY BAROMETER · 30-DAY ROLLING FLOWS/g, 'مقياس الأموال الساخنة · التدفقات التراكمية (30 يوماً)');
  s = s.replace(/Foreign Institutional Liquidity Trend/g, 'اتجاه سيولة المؤسسات الأجنبية بالبورصة');
  s = s.replace(/30D ROLLING NET/g, 'صافي 30 يوماً التراكمي');
  s = s.replace(/([+-]?\d+(?:\.\d+)?)M EGP/g, '$1 مليون ج.م');
  s = s.replace(/HOT MONEY INFLOW/g, 'تدفقات شرائية صافية');
  s = s.replace(/CAPITAL OUTFLOW/g, 'تخارج صافي للأموال');
  s = s.replace(/(\d+)\s+Inflow Sessions/g, '$1 جلسة شراء');
  s = s.replace(/(\d+)\s+Outflow Sessions/g, '$1 جلسة بيع');
  s = s.replace(/Inflow Ratio/g, 'نسبة الشراء');
  s = s.replace(/Daily Net Buy/g, 'صافي شراء يومي');
  s = s.replace(/Daily Net Sell/g, 'صافي بيع يومي');
  s = s.replace(/30D Cumulative Curve/g, 'المنحنى التراكمي 30 يوماً');
  s = s.replace(/Session Today:/g, 'جلسة اليوم:');
  s = s.replace(/· Turnover/g, '· التداولات');

  // FX card
  s = s.replace(/CURRENCY DIVERGENCE · OFFSHORE ARBITRAGE/g, 'فوارق العملة والمراجحة الخارجية · CIB لندن');
  s = s.replace(/CIB London GDR Implied USD\/EGP/g, 'السعر الضمني للدولار عبر شهادات CIB لندن');
  s = s.replace(/DEVALUATION RISK/g, 'مخاطر خفض العملة');
  s = s.replace(/Low Risk \(Managed Crawl\)/g, 'مخاطر منخفضة');
  s = s.replace(/Moderate Spread/g, 'فارق معتدل');
  s = s.replace(/High Pressure/g, 'ضغوط مرتفعة');
  s = s.replace(/OFFICIAL INTERBANK RATE/g, 'السعر الرسمي بالبنوك المصرية');
  s = s.replace(/CBE Central Clearing Corridor/g, 'سعر الصرف الرسمي بالبنك المركزي');
  s = s.replace(/CIB LONDON ADR IMPLIED RATE/g, 'السعر الضمني لشهادات لندن (GDR)');
  s = s.replace(/COMI ([\d.]+) EGP \/ LSE \$([\d.]+)/g, 'سهم CIB بمصر $1 ج.م / لندن $$2');
  s = s.replace(/SPREAD:/g, 'فارق المراجحة:');
  s = s.replace(/Offshore pricing remains closely anchored to interbank clearing\./g, 'تسعير الشهادات بالخارج متطابق ومستقر مع السوق المصرفي الرسمي.');

  // Gold card
  s = s.replace(/BULLION PARITY · PHYSICAL GOLD BAROMETER/g, 'مقياس الذهب وتسعير الصاغة مقابل البورصة العالمية');
  s = s.replace(/Cairo Sagha 21K vs LBMA Global Spot/g, 'سعر الذهب عيار 21 بمصر مقابل السعر العالمي (LBMA)');
  s = s.replace(/SAGHA PREMIUM/g, 'علاوة الصاغة');
  s = s.replace(/CAIRO SAGHA 21K/g, 'ذهب عيار 21 (الصاغة)');
  s = s.replace(/Benchmark jewelry & coin standard/g, 'المعيار القياسي للسبائك والمشغولات');
  s = s.replace(/CAIRO SAGHA 24K/g, 'ذهب عيار 24 (الصاغة)');
  s = s.replace(/Pure bullion bar price/g, 'سعر الذهب الخالص');
  s = s.replace(/LBMA CONVERTED \(24K\)/g, 'السعر العالمي المحوّل (عيار 24)');
  s = s.replace(/Retail spread reflects balanced physical demand without aggressive devaluation hoarding\./g, 'الفارق المحلي يعكس طلباً طبيعياً متوازناً دون مضاربات أو تسعير تحوطي مبالغ فيه.');

  // Watermark
  s = s.replace(/ticknal pulse/g, 'نبض تكنال');

  return s;
}

/**
 * 6. Resolves a localized Chart SVG URL based on site locale
 * Supports both JSON bundles: { "en": "...", "ar": "..." }
 * and legacy base64 SVG data URLs with on-the-fly translation.
 */
export function resolveLocalizedChartSvg(
  rawImageUrl?: string | null,
  targetLocale: string = 'en'
): string | null {
  if (!rawImageUrl) return null;

  // Case 1: Stored as JSON with { en, ar }
  if (rawImageUrl.startsWith('{') && rawImageUrl.includes('"')) {
    try {
      const parsed = JSON.parse(rawImageUrl);
      if (targetLocale === 'ar' && parsed.ar) return parsed.ar;
      if (parsed.en) return parsed.en;
      return Object.values(parsed)[0] as string;
    } catch {}
  }

  // Case 2: Legacy single-language SVG data URL, requested in Arabic
  if (targetLocale === 'ar' && rawImageUrl.startsWith('data:image/svg+xml;base64,')) {
    try {
      const b64 = rawImageUrl.replace('data:image/svg+xml;base64,', '');
      const decodedSvg = typeof Buffer !== 'undefined'
        ? Buffer.from(b64, 'base64').toString('utf-8')
        : decodeURIComponent(escape(atob(b64)));
      const translated = translateSvgToArabic(decodedSvg);
      const encoded = typeof Buffer !== 'undefined'
        ? Buffer.from(translated, 'utf-8').toString('base64')
        : btoa(unescape(encodeURIComponent(translated)));
      return `data:image/svg+xml;base64,${encoded}`;
    } catch {
      return rawImageUrl;
    }
  }

  return rawImageUrl;
}
