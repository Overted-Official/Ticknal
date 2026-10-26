/**
 * EGP Pressure & Depreciation Index Calculation Engine
 * 
 * Quantifies Egyptian Pound depreciation pressure using:
 * 1. Velocity: 14D and 30D log returns normalized against baseline rolling standard deviation.
 * 2. Acceleration / Curvature: Compares trailing 5-day slope to 22-day slope (detects exponential steepening).
 * 3. Directional Efficiency: Net change over sum of daily True Ranges (measures persistent one-way slides).
 * 4. Clearing Proxies: USDT P2P, Sagha Gold Implied, and London CIB GDR premiums over official CBE rate.
 * 5. Capital Flow Drain: Hot money (foreign + Arab) cross-border net flows.
 */

export interface FxPricePoint {
  date: string;
  close: number;
  high?: number;
  low?: number;
}

export interface FxProxyQuotes {
  usdtRate: number;
  goldImpliedRate: number;
  gdrImpliedRate: number;
}

export interface FxPressureIndexResult {
  score: number; // 0 to 100
  level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH';
  label: string;
  labelAr: string;
  description: string;
  descriptionAr: string;
  badgeColor: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED';
  
  // Trajectory & Acceleration metrics
  currentPrice: number;
  price7d: number;
  price14d: number;
  price30d: number;
  delta7dEgp: number;
  pct7d: number;
  delta14dEgp: number;
  pct14d: number;
  delta30dEgp: number;
  pct30d: number;
  dailyPaceEgp: number; // EGP / session over last 5 sessions
  monthlyPaceEgp: number; // EGP / session over last 22 sessions
  accelerationRatio: number; // dailyPace / monthlyPace
  directionalEfficiency: number; // 0 to 1.0 (one-way persistence)
  
  // Statistical & component scores (0 to 100)
  compositeZScore: number;
  velocityScore: number;
  accelerationScore: number;
  efficiencyScore: number;
  proxyScore: number;
  flowScore: number;
  
  // Proxy spread
  avgProxySpreadPct: number;
  allProxiesAboveOfficial: boolean;
}

export function calculateFxPressureIndex(
  chronologicalUsd: FxPricePoint[],
  proxies: FxProxyQuotes,
  rolling10dHotMoneyNetMillion: number = 0
): FxPressureIndexResult {
  const N = chronologicalUsd.length;
  if (N < 5) {
    // Fallback baseline if insufficient data
    return {
      score: 20,
      level: 'LOW',
      label: 'Low Pressure (Anchored Float)',
      labelAr: 'استقرار نسبي وتحرك محدود',
      description: 'Exchange rate trading within standard operational bands.',
      descriptionAr: 'استقرار نسبي لسعر الصرف ضمن النطاقات التشغيلية المعتادة.',
      badgeColor: 'GREEN',
      currentPrice: chronologicalUsd[N - 1]?.close ?? 55.25,
      price7d: 55.25,
      price14d: 55.25,
      price30d: 55.25,
      delta7dEgp: 0,
      pct7d: 0,
      delta14dEgp: 0,
      pct14d: 0,
      delta30dEgp: 0,
      pct30d: 0,
      dailyPaceEgp: 0,
      monthlyPaceEgp: 0,
      accelerationRatio: 1.0,
      directionalEfficiency: 0,
      compositeZScore: 0,
      velocityScore: 20,
      accelerationScore: 20,
      efficiencyScore: 20,
      proxyScore: 20,
      flowScore: 20,
      avgProxySpreadPct: 0,
      allProxiesAboveOfficial: false,
    };
  }

  const curClose = chronologicalUsd[N - 1].close;
  const p7 = chronologicalUsd[Math.max(0, N - 1 - 5)].close;   // ~5 trading sessions (~1 week)
  const p14 = chronologicalUsd[Math.max(0, N - 1 - 10)].close; // ~10 trading sessions (~2 weeks)
  const p30 = chronologicalUsd[Math.max(0, N - 1 - 22)].close; // ~22 trading sessions (~1 month)

  const delta7dEgp = Number((curClose - p7).toFixed(2));
  const pct7d = Number(((delta7dEgp / p7) * 100).toFixed(2));

  const delta14dEgp = Number((curClose - p14).toFixed(2));
  const pct14d = Number(((delta14dEgp / p14) * 100).toFixed(2));

  const delta30dEgp = Number((curClose - p30).toFixed(2));
  const pct30d = Number(((delta30dEgp / p30) * 100).toFixed(2));

  // 1. Velocity Slopes (EGP per session)
  const slope5 = Math.max(0, (curClose - p7) / 5);
  const slope22 = Math.max(0.01, (curClose - p30) / 22);
  const dailyPaceEgp = Number(slope5.toFixed(2));
  const monthlyPaceEgp = Number(slope22.toFixed(2));

  // 2. Acceleration / Curvature (Steepening Slope)
  const accelerationRatio = Number((slope22 > 0 ? slope5 / slope22 : 1.0).toFixed(2));

  // 3. Statistical Baseline & Z-Scores
  const logReturns: number[] = [];
  const trueRanges: number[] = [];
  for (let i = 1; i < N; i++) {
    const prev = chronologicalUsd[i - 1];
    const cur = chronologicalUsd[i];
    logReturns.push(Math.log(cur.close / prev.close));
    const high = cur.high ?? cur.close;
    const low = cur.low ?? cur.close;
    const tr = Math.max(high - low, Math.abs(high - prev.close), Math.abs(low - prev.close));
    trueRanges.push(tr);
  }

  const baselineReturns = logReturns.slice(-90);
  const meanDaily = baselineReturns.length > 0 ? baselineReturns.reduce((s, x) => s + x, 0) / baselineReturns.length : 0;
  const varDaily =
    baselineReturns.length > 1
      ? baselineReturns.reduce((s, x) => s + Math.pow(x - meanDaily, 2), 0) / (baselineReturns.length - 1)
      : 0.0001;
  const stdDaily = Math.max(0.001, Math.sqrt(varDaily));

  const recent10Returns = logReturns.slice(-10);
  const cum10Return = recent10Returns.reduce((s, x) => s + x, 0);
  const std10 = stdDaily * Math.sqrt(Math.max(1, recent10Returns.length));
  const zScore10 = (cum10Return - meanDaily * recent10Returns.length) / std10;

  const recent22Returns = logReturns.slice(-22);
  const cum22Return = recent22Returns.reduce((s, x) => s + x, 0);
  const std22 = stdDaily * Math.sqrt(Math.max(1, recent22Returns.length));
  const zScore22 = (cum22Return - meanDaily * recent22Returns.length) / std22;

  const compositeZScore = Number((zScore10 * 0.6 + zScore22 * 0.4).toFixed(2));

  // Component A: Velocity Score (40% Weight) - Option B Calibrated
  let velocityScore = 15;
  if (compositeZScore <= 0) {
    velocityScore = Math.max(5, 15 + compositeZScore * 10);
  } else if (compositeZScore <= 1.0) {
    velocityScore = 15 + compositeZScore * 30; // 15 to 45
  } else if (compositeZScore <= 2.0) {
    velocityScore = 45 + (compositeZScore - 1.0) * 35; // 45 to 80
  } else {
    velocityScore = Math.min(100, 80 + (compositeZScore - 2.0) * 15); // 80 to 100
  }

  // Component B: Acceleration & Curvature Score (15% Weight)
  let accelerationScore = 20;
  if (dailyPaceEgp < 0.02) {
    accelerationScore = 10;
  } else if (accelerationRatio >= 2.0) {
    accelerationScore = Math.min(100, 75 + (accelerationRatio - 2.0) * 15);
  } else if (accelerationRatio >= 1.2) {
    accelerationScore = 50 + (accelerationRatio - 1.2) * 30;
  } else if (accelerationRatio >= 0.8) {
    accelerationScore = 30 + (accelerationRatio - 0.8) * 50;
  } else {
    accelerationScore = 20;
  }

  // Component C: Directional Trend Efficiency Ratio (15% Weight)
  const recentTRs = trueRanges.slice(-10);
  const sumTR10 = recentTRs.reduce((s, x) => s + x, 0);
  const directionalEfficiency = sumTR10 > 0 ? Math.min(1.0, Math.abs(curClose - p14) / sumTR10) : 0;
  const efficiencyScore = Math.min(100, directionalEfficiency * 85);

  // Component D: Shadow Proxies Spread & Synchronized Upward Lift (20% Weight)
  const avgProxy = (proxies.usdtRate + proxies.goldImpliedRate + proxies.gdrImpliedRate) / 3;
  const avgProxySpreadPct = Number((((avgProxy - curClose) / curClose) * 100).toFixed(2));
  const allProxiesAboveOfficial =
    proxies.usdtRate > curClose && proxies.goldImpliedRate > curClose && proxies.gdrImpliedRate > curClose;

  let proxyScore = 20;
  if (avgProxySpreadPct <= 0.5) {
    proxyScore = 15;
  } else if (avgProxySpreadPct <= 2.0) {
    proxyScore = 20 + (avgProxySpreadPct - 0.5) * 20; // 20 to 50
  } else if (avgProxySpreadPct <= 5.0) {
    proxyScore = 50 + (avgProxySpreadPct - 2.0) * 10; // 50 to 80
  } else {
    proxyScore = Math.min(100, 80 + (avgProxySpreadPct - 5.0) * 4);
  }
  if (allProxiesAboveOfficial) {
    proxyScore = Math.min(100, proxyScore + 12);
  }

  // Component E: Hot Money Capital Drain (10% Weight)
  let flowScore = 20;
  if (rolling10dHotMoneyNetMillion <= -1000) {
    flowScore = 75; // heavy foreign outflows
  } else if (rolling10dHotMoneyNetMillion <= -400) {
    flowScore = 50;
  } else if (rolling10dHotMoneyNetMillion >= 800) {
    flowScore = 10; // strong inflows cushioning FX
  }

  // Multi-factor weighted composite index
  const rawScore =
    velocityScore * 0.40 +
    accelerationScore * 0.15 +
    efficiencyScore * 0.15 +
    proxyScore * 0.20 +
    flowScore * 0.10;

  const score = Math.round(Math.min(95, Math.max(8, rawScore)));

  let level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' = 'LOW';
  let label = 'Low Pressure (Anchored Float)';
  let labelAr = 'استقرار نسبي وتحرك محدود';
  let badgeColor: 'GREEN' | 'YELLOW' | 'ORANGE' | 'RED' = 'GREEN';
  let description = 'Official exchange rate moves in tandem with proxy clearing rates with low depreciation velocity.';
  let descriptionAr = 'سعر الصرف الرسمي يتحرك بتناغم مع الأسواق الموازية وضغوط تراجع منخفضة.';

  if (score >= 70) {
    level = 'HIGH';
    label = 'High Devaluation Pressure';
    labelAr = 'ضغوط تراجع حادة ومتسارعة للجنيه';
    badgeColor = 'RED';
    description = 'Rapid depreciation velocity and widening proxy premiums indicate acute commercial dollar rationing pressure.';
    descriptionAr = 'وتيرة تراجع سريعة واتساع الفجوة السعرية للأسواق الموازية يعكسان ضغوطاً حادة على السيولة الدولارية بالبنوك.';
  } else if (score >= 48) {
    level = 'ELEVATED';
    label = 'Accelerated Depreciation Pressure';
    labelAr = 'ضغوط تراجع متسارعة للجنيه';
    badgeColor = 'ORANGE';
    description = 'The pound is weakening at an accelerated pace with persistent one-way upward momentum pulling official and proxy rates higher.';
    descriptionAr = 'الجنيه يتراجع بوتيرة متسارعة مع استمرار الزخم الصعودي الأحادي وسحب الأسعار الموازية للسعر الرسمي.';
  } else if (score >= 25) {
    level = 'MODERATE';
    label = 'Controlled Crawling Depreciation';
    labelAr = 'هبوط تدريجي مدار';
    badgeColor = 'YELLOW';
    description = 'Orderly managed crawl by the central bank absorbing inflation differentials without acute acceleration.';
    descriptionAr = 'تحرك تدريجي مدار من البنك المركزي لاستيعاب فروق التضخم دون تسارع حاد.';
  }

  return {
    score,
    level,
    label,
    labelAr,
    description,
    descriptionAr,
    badgeColor,
    currentPrice: curClose,
    price7d: p7,
    price14d: p14,
    price30d: p30,
    delta7dEgp,
    pct7d,
    delta14dEgp,
    pct14d,
    delta30dEgp,
    pct30d,
    dailyPaceEgp,
    monthlyPaceEgp,
    accelerationRatio,
    directionalEfficiency: Number(directionalEfficiency.toFixed(2)),
    compositeZScore,
    velocityScore: Number(velocityScore.toFixed(1)),
    accelerationScore: Number(accelerationScore.toFixed(1)),
    efficiencyScore: Number(efficiencyScore.toFixed(1)),
    proxyScore: Number(proxyScore.toFixed(1)),
    flowScore: Number(flowScore.toFixed(1)),
    avgProxySpreadPct,
    allProxiesAboveOfficial,
  };
}
