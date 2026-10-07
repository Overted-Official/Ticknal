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
export function generateEgx30ChartSvg(data: Egx30ChartData): string {
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

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="0.08em">EGX30 BENCHMARK PULSE · MARKET BREADTH</text>
  <text x="40" y="84" fill="#ffffff" font-size="24" font-weight="700">EGX30 Daily Closing Snapshot</text>

  <!-- Right Header: Turnover -->
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">TOTAL TURNOVER</text>
  <text x="760" y="78" fill="#ffffff" font-size="20" text-anchor="end" font-weight="700" font-feature-settings="'tnum' on">${data.turnoverBillion.toFixed(2)}B EGP</text>
  <text x="760" y="96" fill="#a1a1aa" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Main Index Price -->
  <text x="40" y="148" fill="#ffffff" font-size="44" font-weight="800" font-feature-settings="'tnum' on">${data.close.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</text>
  <text x="40" y="176" fill="${statusColor}" font-size="16" font-weight="700" font-feature-settings="'tnum' on">${data.changePct >= 0 ? '+' : ''}${data.changePct.toFixed(2)}% (${data.changePts >= 0 ? '+' : ''}${data.changePts.toFixed(2)} pts)</text>

  <!-- Sparkline Trend -->
  ${sparklinePolyline ? `
  <g>
    <polyline fill="none" stroke="${statusColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${sparklinePolyline}" />
    <text x="760" y="125" fill="#71717a" font-size="10" text-anchor="end">10-DAY RECENT TRAJECTORY</text>
  </g>` : ''}

  <!-- Breadth Ratio Bar -->
  <text x="40" y="214" fill="#a1a1aa" font-size="11" font-weight="600" letter-spacing="0.04em">MARKET BREADTH DISTRIBUTION</text>
  <g transform="translate(40, 224)">
    <rect x="0" y="0" width="${advW.toFixed(1)}" height="12" rx="3" fill="#10b981" />
    <rect x="${advW.toFixed(1)}" y="0" width="${decW.toFixed(1)}" height="12" rx="3" fill="#f43f5e" />
    <rect x="${(advW + decW).toFixed(1)}" y="0" width="${flatW.toFixed(1)}" height="12" rx="3" fill="#52525b" />
  </g>

  <!-- Breadth Labels -->
  <g transform="translate(40, 256)">
    <circle cx="5" cy="5" r="4" fill="#10b981" />
    <text x="16" y="9" fill="#10b981" font-size="11" font-weight="700" font-feature-settings="'tnum' on">${data.advancers} Advancers</text>

    <circle cx="150" cy="5" r="4" fill="#f43f5e" />
    <text x="161" y="9" fill="#f43f5e" font-size="11" font-weight="700" font-feature-settings="'tnum' on">${data.decliners} Decliners</text>

    <circle cx="290" cy="5" r="4" fill="#71717a" />
    <text x="301" y="9" fill="#a1a1aa" font-size="11" font-weight="500" font-feature-settings="'tnum' on">${data.flat} Unchanged</text>
  </g>

  <!-- Footer Insight & Watermark -->
  <text x="40" y="324" fill="#71717a" font-size="11">Session Low: ${data.low.toLocaleString()} · High: ${data.high.toLocaleString()} · Open: ${data.open.toLocaleString()}</text>
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">ticknal pulse</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 2. Hot Money Barometer: 30-Day Rolling Foreign Net Flow Histogram & Cumulative Trend
 */
export function generateInvestorFlowsChartSvg(data: InvestorFlowsChartData): string {
  const isAccumulating = data.rolling30dForeignNetMillion >= 0;
  const statusColor = isAccumulating ? '#10b981' : '#f43f5e';
  const statusLabel = isAccumulating ? 'HOT MONEY INFLOW' : 'CAPITAL OUTFLOW';

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
    // Map cumulative value across vertical range (140 to 240)
    const norm = (b.cumulativeMillion - minCum) / cumRange;
    const y = 245 - norm * 95;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="0.08em">HOT MONEY BAROMETER · 30-DAY ROLLING FLOWS</text>
  <text x="40" y="84" fill="#ffffff" font-size="24" font-weight="700">Foreign Institutional Liquidity Trend</text>

  <!-- Right Header Stats: 30D Cumulative -->
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">30D ROLLING NET</text>
  <text x="760" y="78" fill="${statusColor}" font-size="20" text-anchor="end" font-weight="700" font-feature-settings="'tnum' on">${data.rolling30dForeignNetMillion >= 0 ? '+' : ''}${data.rolling30dForeignNetMillion.toFixed(1)}M EGP</text>
  <text x="760" y="96" fill="#a1a1aa" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Status Pill -->
  <g transform="translate(40, 100)">
    <rect x="0" y="0" width="160" height="22" rx="4" fill="${isAccumulating ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)'}" stroke="${isAccumulating ? 'rgba(16,185,129,0.3)' : 'rgba(244,63,94,0.3)'}" stroke-width="1"/>
    <text x="80" y="15" fill="${statusColor}" font-size="10.5" font-weight="700" text-anchor="middle" letter-spacing="0.04em">${statusLabel}</text>
  </g>

  <!-- Inflow vs Outflow Ratio -->
  <text x="215" y="115" fill="#a1a1aa" font-size="11" font-feature-settings="'tnum' on">${data.inflowDaysCount} Inflow Sessions · ${data.outflowDaysCount} Outflow Sessions (${Math.round((data.inflowDaysCount / barCount) * 100)}% Inflow Ratio)</text>

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
    <text x="14" y="12" fill="#a1a1aa" font-size="10">Daily Net Buy</text>

    <rect x="100" y="4" width="8" height="8" rx="2" fill="#f43f5e" />
    <text x="114" y="12" fill="#a1a1aa" font-size="10">Daily Net Sell</text>

    <line x1="195" y1="8" x2="215" y2="8" stroke="#00BCE6" stroke-width="2.5" />
    <text x="222" y="12" fill="#00BCE6" font-size="10" font-weight="600">30D Cumulative Curve</text>
  </g>

  <!-- Footer Insight & Watermark -->
  <text x="40" y="324" fill="#71717a" font-size="11">Session Today: ${data.todayForeignNetMillion >= 0 ? '+' : ''}${data.todayForeignNetMillion.toFixed(1)}M EGP · Turnover ${data.totalTurnoverBillion.toFixed(2)}B EGP</text>
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">ticknal pulse</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 3. USD/EGP Arbitrage & CIB London ADR Implied Valuation Card
 */
export function generateFxArbitrageChartSvg(data: FxArbitrageChartData): string {
  const isHealthy = data.gdrSpreadPct <= 4;
  const spreadColor = isHealthy ? '#00BCE6' : '#f59e0b';
  const riskBadgeColor = data.riskScore < 30 ? '#10b981' : '#f59e0b';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="0.08em">CURRENCY DIVERGENCE · OFFSHORE ARBITRAGE</text>
  <text x="40" y="84" fill="#ffffff" font-size="24" font-weight="700">CIB London GDR Implied USD/EGP</text>
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">DEVALUATION RISK</text>
  <text x="760" y="76" fill="${riskBadgeColor}" font-size="15" text-anchor="end" font-weight="700">${data.riskScore}% · ${data.riskLabel}</text>
  <text x="760" y="94" fill="#71717a" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Left Comparison Box: Official Interbank -->
  <rect x="40" y="116" width="340" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="64" y="146" fill="#a1a1aa" font-size="12" font-weight="500">OFFICIAL INTERBANK RATE</text>
  <text x="64" y="190" fill="#ffffff" font-size="34" font-weight="700" font-feature-settings="'tnum' on">${data.officialUsd.toFixed(2)} <tspan font-size="16" font-weight="500" fill="#71717a">EGP</tspan></text>
  <text x="64" y="222" fill="#71717a" font-size="11">CBE Central Clearing Corridor</text>

  <!-- Right Comparison Box: CIB ADR Implied Rate -->
  <rect x="420" y="116" width="340" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="444" y="146" fill="#a1a1aa" font-size="12" font-weight="500">CIB LONDON ADR IMPLIED RATE</text>
  <text x="444" y="190" fill="#ffffff" font-size="34" font-weight="700" font-feature-settings="'tnum' on">${data.gdrImpliedRate.toFixed(2)} <tspan font-size="16" font-weight="500" fill="#71717a">EGP</tspan></text>
  <text x="444" y="222" fill="#71717a" font-size="11">COMI ${data.cairoComiEgp.toFixed(2)} EGP / LSE $${data.londonGdrUsd.toFixed(3)}</text>

  <!-- Arbitrage Spread Pill -->
  <g transform="translate(40, 272)">
    <rect x="0" y="0" width="220" height="32" rx="6" fill="rgba(0,188,230,0.12)" stroke="${spreadColor}" stroke-width="1"/>
    <text x="110" y="21" fill="${spreadColor}" font-size="13" font-weight="700" text-anchor="middle" font-feature-settings="'tnum' on">SPREAD: ${data.gdrSpreadPct >= 0 ? '+' : ''}${data.gdrSpreadPct.toFixed(2)}%</text>
  </g>

  <!-- Explanation note -->
  <text x="280" y="292" fill="#a1a1aa" font-size="12">Offshore pricing remains closely anchored to interbank clearing.</text>

  <!-- Ticknal Watermark -->
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">ticknal pulse</text>
</svg>`;

  return toBase64Svg(svg);
}

/**
 * 4. Cairo Gold Spread vs LBMA Spot Card (Optional/Standby)
 */
export function generateGoldSpreadChartSvg(data: GoldSpreadChartData): string {
  const isHealthySpread = data.goldPremiumPct <= 5;
  const badgeColor = isHealthySpread ? '#10b981' : '#f59e0b';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 360" width="800" height="360" style="background:#000000;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <!-- Container Box -->
  <rect x="0" y="0" width="800" height="360" fill="#000000" />
  <rect x="16" y="16" width="768" height="328" rx="12" fill="#000000" stroke="#222222" stroke-width="1" />

  <!-- Header -->
  <text x="40" y="52" fill="#71717a" font-size="11" font-weight="600" letter-spacing="0.08em">BULLION PARITY · PHYSICAL GOLD BAROMETER</text>
  <text x="40" y="84" fill="#ffffff" font-size="24" font-weight="700">Cairo Sagha 21K vs LBMA Global Spot</text>
  <text x="760" y="52" fill="#71717a" font-size="11" text-anchor="end" font-weight="500">SAGHA PREMIUM</text>
  <text x="760" y="78" fill="${badgeColor}" font-size="18" text-anchor="end" font-weight="700" font-feature-settings="'tnum' on">${data.goldPremiumPct >= 0 ? '+' : ''}${data.goldPremiumPct.toFixed(2)}%</text>
  <text x="760" y="96" fill="#71717a" font-size="11" text-anchor="end">${data.date}</text>

  <!-- Metric 1: Cairo 21K Gram -->
  <rect x="40" y="116" width="220" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="60" y="146" fill="#eab308" font-size="11" font-weight="600">CAIRO SAGHA 21K</text>
  <text x="60" y="188" fill="#ffffff" font-size="28" font-weight="700" font-feature-settings="'tnum' on">${Math.round(data.cairo21kGram).toLocaleString('en-US')} <tspan font-size="14" font-weight="500" fill="#71717a">EGP</tspan></text>
  <text x="60" y="222" fill="#71717a" font-size="11">Benchmark jewelry & coin standard</text>

  <!-- Metric 2: Cairo 24K Gram -->
  <rect x="290" y="116" width="220" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="310" y="146" fill="#eab308" font-size="11" font-weight="600">CAIRO SAGHA 24K</text>
  <text x="310" y="188" fill="#ffffff" font-size="28" font-weight="700" font-feature-settings="'tnum' on">${Math.round(data.cairo24kGram).toLocaleString('en-US')} <tspan font-size="14" font-weight="500" fill="#71717a">EGP</tspan></text>
  <text x="310" y="222" fill="#71717a" font-size="11">Pure bullion bar price</text>

  <!-- Metric 3: Global LBMA Spot Converted -->
  <rect x="540" y="116" width="220" height="136" rx="8" fill="#09090b" stroke="#27272a" stroke-width="1"/>
  <text x="560" y="146" fill="#a1a1aa" font-size="11" font-weight="600">LBMA CONVERTED (24K)</text>
  <text x="560" y="188" fill="#ffffff" font-size="28" font-weight="700" font-feature-settings="'tnum' on">${Math.round(data.globalConvertedGram24k).toLocaleString('en-US')} <tspan font-size="14" font-weight="500" fill="#71717a">EGP</tspan></text>
  <text x="560" y="222" fill="#71717a" font-size="11">XAUUSD $${Math.round(data.comexGoldUsd)} @ ${data.officialUsd.toFixed(2)} FX</text>

  <!-- Footer Insight & Watermark -->
  <text x="40" y="295" fill="#a1a1aa" font-size="12">Retail spread reflects balanced physical demand without aggressive devaluation hoarding.</text>
  <text x="760" y="324" fill="#3f3f46" font-size="11" font-weight="600" text-anchor="end" letter-spacing="-0.02em">ticknal pulse</text>
</svg>`;

  return toBase64Svg(svg);
}
