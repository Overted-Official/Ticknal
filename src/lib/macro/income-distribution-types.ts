import rawData from '@/lib/data/macro/egypt-income-distribution.json';

export type CurrencyMode = 'USD' | 'EGP';
export type CompensationPeriod = 'annual' | 'monthly';
export type ViewMode = 'pyramid' | 'heatmap';

export interface IncomeBracketItem {
  index: number;
  bracket: string;
  labelEn: string;
  labelAr: string;
  rawLabel: string;
  population: number;
  sharePercent: number;
  monthlyRangeEn: string;
  monthlyRangeAr: string;
  annualRangeEn: string;
  annualRangeAr: string;
  tier: 'mass_lower' | 'aspiring' | 'core_middle' | 'upper_middle' | 'affluent' | 'poverty' | 'low_class' | 'middle_class';
  tierLabelEn: string;
  tierLabelAr: string;
  color: string;
  gradientClass: string;
  isPeak?: boolean;
}

export interface MacroIncomeKPIs {
  totalPopulation: number;
  totalPopulationFmt: string;
  cohort: string;
  exchangeRate: number;

  // 1. Below Poverty Line (<10k EGP/mo or <$208/mo)
  povertyCount: number;
  povertyPercent: number;
  povertySalaryRangeEn: string;
  povertySalaryRangeAr: string;
  povertySparkline: number[];

  // 2. Low-Income Class (10.4k-20.8k EGP/mo or $208-$417/mo)
  lowClassCount: number;
  lowClassPercent: number;
  lowClassSalaryRangeEn: string;
  lowClassSalaryRangeAr: string;
  lowClassSparkline: number[];

  // 3. Middle Class (20.8k-125k EGP/mo or $417-$2.5k/mo)
  middleClassCount: number;
  middleClassPercent: number;
  middleClassSalaryRangeEn: string;
  middleClassSalaryRangeAr: string;
  middleClassSparkline: number[];

  // 4. Upper & Affluent Tier (>125k EGP/mo or >$2.5k/mo)
  affluentCount: number;
  affluentPercent: number;
  affluentSalaryRangeEn: string;
  affluentSalaryRangeAr: string;
  affluentSparkline: number[];

  // 5. Most Common Salary (Modal Income Bracket)
  modalBracket: string;
  modalCount: number;
  modalPercent: number;
  modalSalaryValueEn: string;
  modalSalaryValueAr: string;
  modalSalaryUnitEn: string;
  modalSalaryUnitAr: string;
  modalSparkline: number[];

  // Lifecycle & Sparklines
  peakGrossIncomeValue: number;
  peakGrossIncomeFmt: string;
  peakCohort: string;
  workingPopSparkline: number[];
  peakIncomeSparkline: number[];
}

export interface GrossIncomeYearPoint {
  year: string;
  exchangeRate: number;
  [cohortKey: string]: number | string;
}

export const INCOME_DATA = rawData;

export const ORDERED_BRACKETS = rawData.metadata.orderedBrackets;
export const AVAILABLE_YEARS = rawData.metadata.years;
export const AVAILABLE_COHORTS = rawData.metadata.cohorts;

// Standardized 4-Tier MECE Socio-Economic Partition
export const POVERTY_BRACKETS = ['0-500', '501-1,000', '1,001-1,500', '1,501-2,500'];
export const LOW_CLASS_BRACKETS = ['2,501-3,500', '3,501-5,000'];
export const MIDDLE_CLASS_BRACKETS = [
  '5,001-7,500',
  '7,501-10,000',
  '10,001-15,000',
  '15,001-20,000',
  '20,001-30,000',
];
export const AFFLUENT_BRACKETS = ORDERED_BRACKETS.filter(
  (b) =>
    !POVERTY_BRACKETS.includes(b) &&
    !LOW_CLASS_BRACKETS.includes(b) &&
    !MIDDLE_CLASS_BRACKETS.includes(b)
);

export function getTierCategory(bracket: string): {
  tier: 'mass_lower' | 'aspiring' | 'core_middle' | 'upper_middle' | 'affluent';
  tierLabelEn: string;
  tierLabelAr: string;
  color: string;
  gradientClass: string;
} {
  if (POVERTY_BRACKETS.includes(bracket)) {
    return {
      tier: 'mass_lower',
      tierLabelEn: 'Below Poverty Line',
      tierLabelAr: 'تحت خط الفقر',
      color: '#f43f5e',
      gradientClass: 'from-rose-600/70 to-rose-400/90',
    };
  }
  if (LOW_CLASS_BRACKETS.includes(bracket)) {
    return {
      tier: 'aspiring',
      tierLabelEn: 'Low-Income Class',
      tierLabelAr: 'الطبقة محدودة الدخل',
      color: '#0284c7',
      gradientClass: 'from-sky-600/70 to-sky-400/90',
    };
  }
  if (MIDDLE_CLASS_BRACKETS.includes(bracket)) {
    return {
      tier: 'core_middle',
      tierLabelEn: 'Middle Class',
      tierLabelAr: 'الطبقة المتوسطة',
      color: '#2563eb',
      gradientClass: 'from-blue-600/80 to-blue-400',
    };
  }
  return {
    tier: 'affluent',
    tierLabelEn: 'Upper & Affluent',
    tierLabelAr: 'الملاءة العالية والثرية',
    color: '#d97706',
    gradientClass: 'from-amber-600/80 to-amber-400',
  };
}

export function formatSalaryTierRange(
  minUsd: number,
  maxUsd: number | null,
  currency: CurrencyMode,
  period: CompensationPeriod,
  rate: number,
  isAr: boolean
): string {
  if (currency === 'USD') {
    if (period === 'monthly') {
      const minMo = Math.round(minUsd / 12);
      if (maxUsd === null) {
        return isAr ? `+${minMo.toLocaleString()} دولار/ش` : `>$${minMo.toLocaleString()} / mo`;
      }
      const maxMo = Math.round(maxUsd / 12);
      if (minUsd === 0) {
        return isAr ? `<${maxMo.toLocaleString()} دولار/ش` : `<$${maxMo.toLocaleString()} / mo`;
      }
      return isAr ? `${minMo} – ${maxMo} دولار/ش` : `$${minMo} – $${maxMo} / mo`;
    } else {
      if (maxUsd === null) {
        return isAr ? `+${(minUsd / 1000).toFixed(0)}k دولار/س` : `>$${(minUsd / 1000).toFixed(0)}k / yr`;
      }
      if (minUsd === 0) {
        return isAr ? `<${(maxUsd / 1000).toFixed(1)}k دولار/س` : `<$${(maxUsd / 1000).toFixed(1)}k / yr`;
      }
      return isAr ? `${(minUsd / 1000).toFixed(1)}k – ${(maxUsd / 1000).toFixed(1)}k $` : `$${(minUsd / 1000).toFixed(1)}k – $${(maxUsd / 1000).toFixed(1)}k / yr`;
    }
  } else {
    // EGP
    if (period === 'monthly') {
      const minMoEgp = Math.round((minUsd * rate) / 12);
      if (maxUsd === null) {
        const kFmt = (minMoEgp / 1000).toFixed(0);
        return isAr ? `+${kFmt}k ج.م/ش` : `>${kFmt}k EGP / mo`;
      }
      const maxMoEgp = Math.round((maxUsd * rate) / 12);
      if (minUsd === 0) {
        const kFmt = (maxMoEgp / 1000).toFixed(1);
        return isAr ? `<${kFmt}k ج.م/ش` : `<${kFmt}k EGP / mo`;
      }
      const minK = (minMoEgp / 1000).toFixed(1);
      const maxK = (maxMoEgp / 1000).toFixed(1);
      return isAr ? `${minK}k – ${maxK}k ج.م/ش` : `${minK}k – ${maxK}k EGP / mo`;
    } else {
      const minYrEgp = Math.round(minUsd * rate);
      if (maxUsd === null) {
        const mFmt = (minYrEgp / 1e6).toFixed(1);
        return isAr ? `+${mFmt}M ج.م/س` : `>${mFmt}M EGP / yr`;
      }
      const maxYrEgp = Math.round(maxUsd * rate);
      if (minUsd === 0) {
        const kFmt = (maxYrEgp / 1000).toFixed(0);
        return isAr ? `<${kFmt}k ج.م/س` : `<${kFmt}k EGP / yr`;
      }
      const minFmt = minYrEgp >= 1e6 ? `${(minYrEgp / 1e6).toFixed(1)}M` : `${Math.round(minYrEgp / 1000)}k`;
      const maxFmt = maxYrEgp >= 1e6 ? `${(maxYrEgp / 1e6).toFixed(1)}M` : `${Math.round(maxYrEgp / 1000)}k`;
      return isAr ? `${minFmt} – ${maxFmt} ج.م/س` : `${minFmt} – ${maxFmt} EGP / yr`;
    }
  }
}

export function formatBracketLabel(
  bracket: string,
  currency: CurrencyMode,
  period: CompensationPeriod,
  rate: number,
  isAr: boolean
): { label: string; annualRange: string; monthlyRange: string } {
  const bounds = rawData.metadata.bracketBounds[bracket as keyof typeof rawData.metadata.bracketBounds];
  if (!bounds) {
    return { label: bracket, annualRange: bracket, monthlyRange: '' };
  }

  const [rawMinUsd, maxUsd] = bounds;
  const minUsd = rawMinUsd ?? 0;

  // Annual formatting
  let annualEn = '';
  let annualAr = '';
  if (currency === 'USD') {
    if (maxUsd === null) {
      annualEn = `$${minUsd.toLocaleString()}+ / yr`;
      annualAr = `+${minUsd.toLocaleString()} دولار / سنوياً`;
    } else {
      annualEn = `$${minUsd.toLocaleString()} – $${maxUsd.toLocaleString()} / yr`;
      annualAr = `${minUsd.toLocaleString()} – ${maxUsd.toLocaleString()} دولار / سنوياً`;
    }
  } else {
    const minEgp = Math.round((minUsd * rate) / 1000) * 1000;
    if (maxUsd === null) {
      annualEn = `${(minEgp / 1000).toLocaleString()}k+ EGP / yr`;
      annualAr = `+${(minEgp / 1000).toLocaleString()} ألف ج.م / سنوياً`;
    } else {
      const maxEgp = Math.round((maxUsd * rate) / 1000) * 1000;
      annualEn = `${(minEgp / 1000).toLocaleString()}k – ${(maxEgp / 1000).toLocaleString()}k EGP / yr`;
      annualAr = `${(minEgp / 1000).toLocaleString()} – ${(maxEgp / 1000).toLocaleString()} ألف ج.م / سنوياً`;
    }
  }

  // Monthly formatting
  let monthlyEn = '';
  let monthlyAr = '';
  const minMoUsd = Number((minUsd / 12).toFixed(minUsd < 1500 ? 1 : 0));
  if (currency === 'USD') {
    if (maxUsd === null) {
      const minFmt = minMoUsd >= 1000 ? `$${(minMoUsd / 1000).toFixed(1)}k+` : `$${minMoUsd}`;
      monthlyEn = `${minFmt} / mo`;
      monthlyAr = `+${minMoUsd.toLocaleString()} دولار / شهرياً`;
    } else {
      const maxMoUsd = Number((maxUsd / 12).toFixed(maxUsd <= 1500 ? 1 : 0));
      monthlyEn = `$${minMoUsd.toLocaleString()} – $${maxMoUsd.toLocaleString()} / mo`;
      monthlyAr = `${minMoUsd.toLocaleString()} – ${maxMoUsd.toLocaleString()} دولار / شهرياً`;
    }
  } else {
    const minMoEgp = Math.round((minUsd * rate) / 12);
    if (maxUsd === null) {
      const kFmt = (minMoEgp / 1000).toFixed(1);
      monthlyEn = `${kFmt}k+ EGP / mo`;
      monthlyAr = `+${minMoEgp.toLocaleString()} ج.م / شهرياً`;
    } else {
      const maxMoEgp = Math.round((maxUsd * rate) / 12);
      if (maxMoEgp >= 10000) {
        monthlyEn = `${(minMoEgp / 1000).toFixed(1)}k – ${(maxMoEgp / 1000).toFixed(1)}k EGP / mo`;
        monthlyAr = `${(minMoEgp / 1000).toFixed(1)} – ${(maxMoEgp / 1000).toFixed(1)} ألف ج.م / شهرياً`;
      } else {
        monthlyEn = `${minMoEgp.toLocaleString()} – ${maxMoEgp.toLocaleString()} EGP / mo`;
        monthlyAr = `${minMoEgp.toLocaleString()} – ${maxMoEgp.toLocaleString()} ج.م / شهرياً`;
      }
    }
  }

  const primaryLabel = period === 'monthly' ? (isAr ? monthlyAr : monthlyEn) : (isAr ? annualAr : annualEn);

  return {
    label: primaryLabel,
    annualRange: isAr ? annualAr : annualEn,
    monthlyRange: isAr ? monthlyAr : monthlyEn,
  };
}

export function getIncomeDistributionForYearAndCohort(
  year: string,
  cohort: string = 'Total',
  currency: CurrencyMode = 'USD',
  period: CompensationPeriod = 'annual'
): IncomeBracketItem[] {
  const dist = rawData.distribution as Record<string, Record<string, Record<string, number>>>;
  const cohortData = dist[cohort] || dist['Total'] || {};
  const rate = rawData.metadata.usdEgpRates[year as keyof typeof rawData.metadata.usdEgpRates] ?? 50.0;

  // Calculate total population for this cohort in this year
  let totalPop = 0;
  for (const b of ORDERED_BRACKETS) {
    totalPop += cohortData[b]?.[year] ?? 0;
  }

  let maxPop = 0;
  for (const b of ORDERED_BRACKETS) {
    const p = cohortData[b]?.[year] ?? 0;
    if (p > maxPop) maxPop = p;
  }

  // Strictly ASCENDING order ($0-500 at index 0 up to $250,001+ at index 20)
  return ORDERED_BRACKETS.map((bracket, idx) => {
    const pop = cohortData[bracket]?.[year] ?? 0;
    const share = totalPop > 0 ? (pop / totalPop) * 100 : 0;
    const tierMeta = getTierCategory(bracket);

    const enMeta = formatBracketLabel(bracket, currency, period, rate, false);
    const arMeta = formatBracketLabel(bracket, currency, period, rate, true);

    return {
      index: idx + 1,
      bracket,
      rawLabel: bracket,
      labelEn: enMeta.label,
      labelAr: arMeta.label,
      population: Math.round(pop),
      sharePercent: Number(share.toFixed(2)),
      monthlyRangeEn: enMeta.monthlyRange,
      monthlyRangeAr: arMeta.monthlyRange,
      annualRangeEn: enMeta.annualRange,
      annualRangeAr: arMeta.annualRange,
      tier: tierMeta.tier,
      tierLabelEn: tierMeta.tierLabelEn,
      tierLabelAr: tierMeta.tierLabelAr,
      color: tierMeta.color,
      gradientClass: tierMeta.gradientClass,
      isPeak: pop === maxPop && maxPop > 0,
    };
  });
}

export function getMacroKPIs(
  year: string,
  cohortOrCurrency: string | CurrencyMode = 'Total',
  currencyOrPeriod: CurrencyMode | CompensationPeriod = 'USD',
  periodParam: CompensationPeriod = 'annual'
): MacroIncomeKPIs {
  let cohort = 'Total';
  let currency: CurrencyMode = 'USD';
  let period: CompensationPeriod = 'annual';

  if (cohortOrCurrency === 'USD' || cohortOrCurrency === 'EGP') {
    currency = cohortOrCurrency;
    period = (currencyOrPeriod as CompensationPeriod) || 'annual';
    cohort = 'Total';
  } else {
    cohort = cohortOrCurrency || 'Total';
    currency = (currencyOrPeriod as CurrencyMode) || 'USD';
    period = periodParam || 'annual';
  }

  const dist = rawData.distribution as Record<string, Record<string, Record<string, number>>>;
  const cohortData = dist[cohort] || dist['Total'] || {};
  const rate = rawData.metadata.usdEgpRates[year as keyof typeof rawData.metadata.usdEgpRates] ?? 50.0;

  let totalPop = 0;
  let povertyCount = 0;
  let lowClassCount = 0;
  let middleClassCount = 0;
  let affluentCount = 0;

  let modalCount = 0;
  let modalBracket = '3,501-5,000';

  for (const b of ORDERED_BRACKETS) {
    const p = cohortData[b]?.[year] ?? 0;
    totalPop += p;
    if (POVERTY_BRACKETS.includes(b)) povertyCount += p;
    if (LOW_CLASS_BRACKETS.includes(b)) lowClassCount += p;
    if (MIDDLE_CLASS_BRACKETS.includes(b)) middleClassCount += p;
    if (AFFLUENT_BRACKETS.includes(b)) affluentCount += p;

    if (p > modalCount) {
      modalCount = p;
      modalBracket = b;
    }
  }

  // Format salary ranges for the 4 tiers
  const povertySalaryRangeEn = formatSalaryTierRange(0, 2500, currency, period, rate, false);
  const povertySalaryRangeAr = formatSalaryTierRange(0, 2500, currency, period, rate, true);

  const lowClassSalaryRangeEn = formatSalaryTierRange(2501, 5000, currency, period, rate, false);
  const lowClassSalaryRangeAr = formatSalaryTierRange(2501, 5000, currency, period, rate, true);

  const middleClassSalaryRangeEn = formatSalaryTierRange(5001, 30000, currency, period, rate, false);
  const middleClassSalaryRangeAr = formatSalaryTierRange(5001, 30000, currency, period, rate, true);

  const affluentSalaryRangeEn = formatSalaryTierRange(30001, null, currency, period, rate, false);
  const affluentSalaryRangeAr = formatSalaryTierRange(30001, null, currency, period, rate, true);

  // Format modal bracket
  const bounds = rawData.metadata.bracketBounds[modalBracket as keyof typeof rawData.metadata.bracketBounds] || [3501, 5000];
  const [modalMinUsd, modalMaxUsd] = bounds;

  let modalSalaryValueEn = '';
  let modalSalaryValueAr = '';
  let modalSalaryUnitEn = '';
  let modalSalaryUnitAr = '';

  if (currency === 'USD') {
    modalSalaryUnitEn = period === 'monthly' ? '/ mo' : '/ yr';
    modalSalaryUnitAr = period === 'monthly' ? 'شهرياً' : 'سنوياً';
    if (period === 'monthly') {
      const minMo = Math.round((modalMinUsd || 0) / 12);
      const maxMo = modalMaxUsd ? Math.round(modalMaxUsd / 12) : null;
      modalSalaryValueEn = maxMo ? `$${minMo} – $${maxMo}` : `>$${minMo}`;
      modalSalaryValueAr = maxMo ? `${minMo} – ${maxMo} $` : `+${minMo} $`;
    } else {
      const minK = ((modalMinUsd || 0) / 1000).toFixed(1);
      const maxK = modalMaxUsd ? (modalMaxUsd / 1000).toFixed(1) : null;
      modalSalaryValueEn = maxK ? `$${minK}k – $${maxK}k` : `>$${minK}k`;
      modalSalaryValueAr = maxK ? `${minK} – ${maxK} ألف $` : `+${minK} ألف $`;
    }
  } else {
    // EGP
    modalSalaryUnitEn = period === 'monthly' ? 'EGP / mo' : 'EGP / yr';
    modalSalaryUnitAr = period === 'monthly' ? 'ج.م / شهر' : 'ج.م / سنة';
    if (period === 'monthly') {
      const minMoEgp = Math.round(((modalMinUsd || 0) * rate) / 12);
      const maxMoEgp = modalMaxUsd ? Math.round((modalMaxUsd * rate) / 12) : null;
      const minK = (minMoEgp / 1000).toFixed(1);
      const maxK = maxMoEgp ? (maxMoEgp / 1000).toFixed(1) : null;
      modalSalaryValueEn = maxK ? `${minK}k – ${maxK}k` : `>${minK}k`;
      modalSalaryValueAr = maxK ? `${minK} – ${maxK} ألف` : `+${minK} ألف`;
    } else {
      const minYrEgp = Math.round((modalMinUsd || 0) * rate);
      const maxYrEgp = modalMaxUsd ? Math.round(modalMaxUsd * rate) : null;
      const minK = minYrEgp >= 1e6 ? `${(minYrEgp / 1e6).toFixed(1)}M` : `${Math.round(minYrEgp / 1000)}k`;
      const maxK = maxYrEgp ? (maxYrEgp >= 1e6 ? `${(maxYrEgp / 1e6).toFixed(1)}M` : `${Math.round(maxYrEgp / 1000)}k`) : null;
      modalSalaryValueEn = maxK ? `${minK} – ${maxK}` : `>${minK}`;
      modalSalaryValueAr = maxK ? `${minK} – ${maxK}` : `+${minK}`;
    }
  }

  // Sparklines across 21 years for this cohort
  const workingPopSparkline = AVAILABLE_YEARS.map((yr) => {
    let pSum = 0;
    for (const b of ORDERED_BRACKETS) {
      pSum += cohortData[b]?.[yr] ?? 0;
    }
    return Number((pSum / 1e6).toFixed(2));
  });

  const povertySparkline = AVAILABLE_YEARS.map((yr) => {
    let pSum = 0;
    for (const b of POVERTY_BRACKETS) {
      pSum += cohortData[b]?.[yr] ?? 0;
    }
    return Number((pSum / 1e6).toFixed(2));
  });

  const lowClassSparkline = AVAILABLE_YEARS.map((yr) => {
    let pSum = 0;
    for (const b of LOW_CLASS_BRACKETS) {
      pSum += cohortData[b]?.[yr] ?? 0;
    }
    return Number((pSum / 1e6).toFixed(2));
  });

  const middleClassSparkline = AVAILABLE_YEARS.map((yr) => {
    let pSum = 0;
    for (const b of MIDDLE_CLASS_BRACKETS) {
      pSum += cohortData[b]?.[yr] ?? 0;
    }
    return Number((pSum / 1e6).toFixed(2));
  });

  const affluentSparkline = AVAILABLE_YEARS.map((yr) => {
    let pSum = 0;
    for (const b of AFFLUENT_BRACKETS) {
      pSum += cohortData[b]?.[yr] ?? 0;
    }
    return Math.round(pSum / 1000);
  });

  const modalSparkline = AVAILABLE_YEARS.map((yr) => {
    const p = cohortData[modalBracket]?.[yr] ?? 0;
    return Number((p / 1e6).toFixed(2));
  });

  // Gross income backwards compatibility
  const gross = rawData.averageGrossIncome as Record<string, Record<string, number>>;
  let peakCohort = '40-44';
  let peakValUsd = 0;
  for (const [c, yearMap] of Object.entries(gross)) {
    const val = yearMap[year] ?? 0;
    if (val > peakValUsd) {
      peakValUsd = val;
      peakCohort = c;
    }
  }
  const convertedVal = currency === 'USD' ? peakValUsd : peakValUsd * rate;
  const finalVal = period === 'monthly' ? convertedVal / 12 : convertedVal;
  const peakFmt =
    currency === 'USD'
      ? period === 'monthly'
        ? `$${Math.round(finalVal).toLocaleString()} / mo`
        : `$${Math.round(finalVal).toLocaleString()} / yr`
      : period === 'monthly'
      ? `${Math.round(finalVal).toLocaleString()} ج.م / شهر`
      : `${Math.round(finalVal).toLocaleString()} ج.م / سنة`;

  const peakIncomeSparkline = AVAILABLE_YEARS.map((yr) => {
    const r = rawData.metadata.usdEgpRates[yr as keyof typeof rawData.metadata.usdEgpRates] ?? 50.0;
    const vUsd = gross['40-44']?.[yr] ?? 0;
    const conv = currency === 'USD' ? vUsd : vUsd * r;
    return Math.round(period === 'monthly' ? conv / 12 : conv);
  });

  return {
    totalPopulation: Math.round(totalPop),
    totalPopulationFmt: totalPop >= 1e6 ? `${(totalPop / 1e6).toFixed(1)}M` : `${Math.round(totalPop / 1000)}k`,
    cohort,
    exchangeRate: rate,

    povertyCount: Math.round(povertyCount),
    povertyPercent: totalPop > 0 ? Number(((povertyCount / totalPop) * 100).toFixed(1)) : 0,
    povertySalaryRangeEn,
    povertySalaryRangeAr,
    povertySparkline,

    lowClassCount: Math.round(lowClassCount),
    lowClassPercent: totalPop > 0 ? Number(((lowClassCount / totalPop) * 100).toFixed(1)) : 0,
    lowClassSalaryRangeEn,
    lowClassSalaryRangeAr,
    lowClassSparkline,

    middleClassCount: Math.round(middleClassCount),
    middleClassPercent: totalPop > 0 ? Number(((middleClassCount / totalPop) * 100).toFixed(1)) : 0,
    middleClassSalaryRangeEn,
    middleClassSalaryRangeAr,
    middleClassSparkline,

    affluentCount: Math.round(affluentCount),
    affluentPercent: totalPop > 0 ? Number(((affluentCount / totalPop) * 100).toFixed(1)) : 0,
    affluentSalaryRangeEn,
    affluentSalaryRangeAr,
    affluentSparkline,

    modalBracket,
    modalCount: Math.round(modalCount),
    modalPercent: totalPop > 0 ? Number(((modalCount / totalPop) * 100).toFixed(1)) : 0,
    modalSalaryValueEn,
    modalSalaryValueAr,
    modalSalaryUnitEn,
    modalSalaryUnitAr,
    modalSparkline,

    peakGrossIncomeValue: Math.round(finalVal),
    peakGrossIncomeFmt: peakFmt,
    peakCohort,
    workingPopSparkline,
    peakIncomeSparkline,
  };
}

export function getGrossIncomeLifecycleSeries(
  currency: CurrencyMode = 'USD',
  period: CompensationPeriod = 'annual'
): GrossIncomeYearPoint[] {
  const gross = rawData.averageGrossIncome as Record<string, Record<string, number>>;
  const cohorts = Object.keys(gross);

  return AVAILABLE_YEARS.map((yr) => {
    const rate = rawData.metadata.usdEgpRates[yr as keyof typeof rawData.metadata.usdEgpRates] ?? 50.0;
    const pt: GrossIncomeYearPoint = {
      year: yr,
      exchangeRate: rate,
    };

    for (const c of cohorts) {
      const valUsd = gross[c]?.[yr] ?? 0;
      const converted = currency === 'USD' ? valUsd : valUsd * rate;
      pt[c] = Math.round(period === 'monthly' ? converted / 12 : converted);
    }

    return pt;
  });
}
