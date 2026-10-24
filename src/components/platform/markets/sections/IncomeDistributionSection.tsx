'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp,
  Coins,
  Layers,
  BarChart3,
  SlidersHorizontal,
  User,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ChevronDown,
  Check,
} from '@/components/ui/icon-library';
import { Play, Pause } from 'lucide-react';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import { useTranslation } from '@/lib/i18n';
import {
  type CurrencyMode,
  type CompensationPeriod,
  type ViewMode,
  ORDERED_BRACKETS,
  AVAILABLE_YEARS,
  AVAILABLE_COHORTS,
  getIncomeDistributionForYearAndCohort,
  getMacroKPIs,
  getGrossIncomeLifecycleSeries,
  INCOME_DATA,
} from '@/lib/macro/income-distribution-types';

interface IncomeDistributionSectionProps {
  id?: string;
  isLoading?: boolean;
}

const COHORT_LABELS_AR: Record<string, string> = {
  Total: 'كافة الأعمار',
  '15-19': '15 - 19',
  '20-24': '20 - 24',
  '25-29': '25 - 29',
  '30-34': '30 - 34',
  '35-39': '35 - 39',
  '40-44': '40 - 44 (الذروة)',
  '45-49': '45 - 49',
  '50-54': '50 - 54',
  '55-59': '55 - 59',
  '60-64': '60 - 64',
  '65+': '+65',
};

const COHORT_COLORS: Record<string, string> = {
  '40-44': '#2962ff', // Peak cohort highlighted in Ticknal Brand Blue
  '35-39': '#089981', // Pre-peak career
  '30-34': '#26c6da', // Mid career
  '25-29': '#36acf8', // Junior professional
  '20-24': '#ab47bc', // Young adult workforce
  '50-54': '#f59e0b', // Senior workforce
  '65+': '#737373',   // Retirees
};

export default function IncomeDistributionSection({
  id = 'household-income',
  isLoading = false,
}: IncomeDistributionSectionProps) {
  const { locale, isRTL } = useTranslation();
  const isAr = locale === 'ar';

  // Interactive UI States
  const [currency, setCurrency] = useState<CurrencyMode>('USD');
  const [period, setPeriod] = useState<CompensationPeriod>('annual');
  const [viewMode, setViewMode] = useState<ViewMode>('pyramid');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [selectedCohort, setSelectedCohort] = useState<string>('Total');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [hoveredBracket, setHoveredBracket] = useState<string | null>(null);

  // Mobile Cohort Dropdown State & Click-outside Ref
  const [isCohortDropdownOpen, setIsCohortDropdownOpen] = useState(false);
  const cohortDropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile cohort dropdown on outside click or touch
  useEffect(() => {
    if (!isCohortDropdownOpen) return;
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (cohortDropdownRef.current && !cohortDropdownRef.current.contains(event.target as Node)) {
        setIsCohortDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isCohortDropdownOpen]);

  // Auto-play timeline animation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedYear((prev) => {
        const idx = AVAILABLE_YEARS.indexOf(prev);
        if (idx === -1 || idx >= AVAILABLE_YEARS.length - 1) {
          return AVAILABLE_YEARS[0];
        }
        return AVAILABLE_YEARS[idx + 1];
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Macro KPIs (Dynamic and responsive to selectedCohort, selectedYear, currency, and period)
  const kpis = useMemo(
    () => getMacroKPIs(selectedYear, selectedCohort, currency, period),
    [selectedYear, selectedCohort, currency, period]
  );

  // Distribution Items: Sorted strictly ASCENDING ($0–$500 at index 0 up to $250k+ at index 20)
  const distributionItems = useMemo(() => {
    return getIncomeDistributionForYearAndCohort(selectedYear, selectedCohort, currency, period);
  }, [selectedYear, selectedCohort, currency, period]);

  // Max share percent for scaling the bar widths
  const maxSharePercent = useMemo(() => {
    let max = 0;
    for (const it of distributionItems) {
      if (it.sharePercent > max) max = it.sharePercent;
    }
    return max > 0 ? max : 20;
  }, [distributionItems]);

  // Gross Income Time Series for Secondary Lifecycle Chart
  const grossIncomeSeries = useMemo(
    () => getGrossIncomeLifecycleSeries(currency, period),
    [currency, period]
  );

  // Heatmap Data (21 brackets × 21 years for selected cohort)
  const heatmapData = useMemo(() => {
    const rawDist = INCOME_DATA.distribution as Record<string, Record<string, Record<string, number>>>;
    const cohortMap = rawDist[selectedCohort] || rawDist['Total'] || {};

    return ORDERED_BRACKETS.map((bracket) => {
      const yearValues: Record<string, { pop: number; share: number }> = {};
      AVAILABLE_YEARS.forEach((yr) => {
        let yrTotal = 0;
        ORDERED_BRACKETS.forEach((b) => {
          yrTotal += cohortMap[b]?.[yr] ?? 0;
        });
        const pop = cohortMap[bracket]?.[yr] ?? 0;
        const share = yrTotal > 0 ? (pop / yrTotal) * 100 : 0;
        yearValues[yr] = { pop: Math.round(pop), share: Number(share.toFixed(2)) };
      });
      return {
        bracket,
        yearValues,
      };
    });
  }, [selectedCohort]);

  // Format currency headcount
  const formatHeadcount = (num: number) => {
    if (num >= 1e6) {
      return `${(num / 1e6).toFixed(2)}${isAr ? ' مليون' : 'M'}`;
    }
    return num.toLocaleString();
  };

  // Step backward or forward through years
  const handleStepYear = (delta: number) => {
    setIsPlaying(false);
    const currIdx = AVAILABLE_YEARS.indexOf(selectedYear);
    const nextIdx = Math.max(0, Math.min(AVAILABLE_YEARS.length - 1, currIdx + delta));
    setSelectedYear(AVAILABLE_YEARS[nextIdx]);
  };

  // 6 KPI Cards: Cohort-Aware, Detailed Socioeconomic Stratification
  const kpiCards: KPICardProps[] = [
    // Card 1: Working-Age / Age Group Population
    {
      id: 'kpi-population',
      title: selectedCohort === 'Total'
        ? (isAr ? 'القوة السكانية العاملة' : 'Working-Age Population')
        : (isAr ? `الفئة العمرية (${COHORT_LABELS_AR[selectedCohort] || selectedCohort})` : `Age Group (${selectedCohort})`),
      shortTitle: selectedCohort === 'Total'
        ? (isAr ? 'السكان العاملين' : 'Working Pop')
        : (isAr ? 'الفئة العمرية' : 'Age Group'),
      icon: User,
      iconBgClass: 'bg-brand-blue text-white',
      value: kpis.totalPopulationFmt,
      unit: isAr ? 'نسمة' : 'Adults',
      metaText: selectedCohort === 'Total'
        ? (isAr ? `سعر الصرف: ${kpis.exchangeRate.toFixed(2)} ج.م` : `USD/EGP: ${kpis.exchangeRate.toFixed(2)}`)
        : (isAr ? `${((kpis.totalPopulation / 74320528) * 100).toFixed(1)}% من قوة العمل` : `${((kpis.totalPopulation / 74320528) * 100).toFixed(1)}% of total`),
      metaClass: 'text-text-muted text-xs',
      sparklinePoints: kpis.workingPopSparkline,
      sparklineTrend: 'up',
      showSparkline: true,
      className: 'shrink-0 w-[138px] xs:w-[150px] sm:w-[175px] md:w-full snap-start',
    },
    // Card 2: Below Poverty Line (<10k EGP/mo or <$208/mo)
    {
      id: 'kpi-poverty-line',
      title: isAr ? 'تحت خط الفقر (<10k ج.م/ش)' : 'Below Poverty Line (<10k EGP/mo)',
      shortTitle: isAr ? 'تحت خط الفقر' : 'Poverty Line',
      icon: AlertTriangle,
      iconBgClass: 'bg-rose-500/20 text-rose-400',
      value: formatHeadcount(kpis.povertyCount),
      unit: `(${kpis.povertyPercent}%)`,
      metaText: isAr ? kpis.povertySalaryRangeAr : kpis.povertySalaryRangeEn,
      metaClass: 'text-text-muted text-xs',
      sparklinePoints: kpis.povertySparkline,
      sparklineTrend: 'down',
      showSparkline: true,
      className: 'shrink-0 w-[138px] xs:w-[150px] sm:w-[175px] md:w-full snap-start',
    },
    // Card 3: Low-Income Class
    {
      id: 'kpi-low-class',
      title: isAr ? 'الطبقة محدودة الدخل' : 'Low-Income Class',
      shortTitle: isAr ? 'محدودة الدخل' : 'Low-Income',
      icon: Layers,
      iconBgClass: 'bg-sky-500/20 text-sky-400',
      value: formatHeadcount(kpis.lowClassCount),
      unit: `(${kpis.lowClassPercent}%)`,
      metaText: isAr ? kpis.lowClassSalaryRangeAr : kpis.lowClassSalaryRangeEn,
      metaClass: 'text-text-muted text-xs',
      sparklinePoints: kpis.lowClassSparkline,
      sparklineTrend: 'neutral',
      showSparkline: true,
      className: 'shrink-0 w-[138px] xs:w-[150px] sm:w-[175px] md:w-full snap-start',
    },
    // Card 4: Middle Class (Percentage & Monetary)
    {
      id: 'kpi-middle-class',
      title: isAr ? 'الطبقة المتوسطة' : 'Middle Class',
      shortTitle: isAr ? 'الطبقة المتوسطة' : 'Middle Class',
      icon: TrendingUp,
      iconBgClass: 'bg-blue-600/20 text-blue-400',
      value: formatHeadcount(kpis.middleClassCount),
      unit: `(${kpis.middleClassPercent}%)`,
      metaText: isAr ? kpis.middleClassSalaryRangeAr : kpis.middleClassSalaryRangeEn,
      metaClass: 'text-text-muted text-xs',
      sparklinePoints: kpis.middleClassSparkline,
      sparklineTrend: 'up',
      showSparkline: true,
      className: 'shrink-0 w-[138px] xs:w-[150px] sm:w-[175px] md:w-full snap-start',
    },
    // Card 5: High Class / Affluent Tier
    {
      id: 'kpi-affluent-tier',
      title: isAr ? 'الملاءة العالية والثرية' : 'Upper & Affluent Tier',
      shortTitle: isAr ? 'الملاءة العالية' : 'Affluent Tier',
      icon: Coins,
      iconBgClass: 'bg-amber-500/20 text-amber-400',
      value: formatHeadcount(kpis.affluentCount),
      unit: `(${kpis.affluentPercent}%)`,
      metaText: isAr ? kpis.affluentSalaryRangeAr : kpis.affluentSalaryRangeEn,
      metaClass: 'text-text-muted text-xs',
      sparklinePoints: kpis.affluentSparkline,
      sparklineTrend: 'up',
      showSparkline: true,
      className: 'shrink-0 w-[138px] xs:w-[150px] sm:w-[175px] md:w-full snap-start',
    },
    // Card 6: Most Common Salary (Modal Bracket in Cohort)
    {
      id: 'kpi-modal-salary',
      title: isAr ? 'الدخل الأكثر انتشاراً' : 'Most Common Salary',
      shortTitle: isAr ? 'الدخل الشائع' : 'Common Salary',
      icon: BarChart3,
      iconBgClass: 'bg-emerald-500/20 text-emerald-400',
      value: isAr ? kpis.modalSalaryValueAr : kpis.modalSalaryValueEn,
      unit: isAr ? kpis.modalSalaryUnitAr : kpis.modalSalaryUnitEn,
      metaText: isAr
        ? `${(kpis.modalCount / 1e6).toFixed(1)} م نسمة (${kpis.modalPercent}%)`
        : `${(kpis.modalCount / 1e6).toFixed(1)}M (${kpis.modalPercent}% of age group)`,
      metaClass: 'text-text-muted text-xs',
      sparklinePoints: kpis.modalSparkline,
      sparklineTrend: 'up',
      showSparkline: true,
      className: 'shrink-0 w-[138px] xs:w-[150px] sm:w-[175px] md:w-full snap-start',
    },
  ];

  return (
    <section id={id} className="w-full bg-plt-base text-text-primary rounded-none space-y-4 font-sans select-none">
      {/* 1. Header & Primary Switches Bar */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 border-b border-border-subtle pb-3">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">
              {isAr ? 'توزيع الدخل والثروة للأسر المصرية' : 'Household Income & Wealth Distribution'}
            </h2>
            <span className="text-xs uppercase tracking-wider font-semibold px-2 py-0.5 bg-brand-blue/15 text-brand-blue border border-brand-blue/30 rounded-full">
              2009 – 2029
            </span>
          </div>
          <p className="section-subtitle">
            {isAr
              ? 'نموذج القوة الشرائية الديموغرافية عبر 21 شريحة دخل ومسار الدخل الإجمالي لدعم قرارات الاستثمار والطلب الاستهلاكي'
              : 'Structural 21-tier demographic purchasing power model & gross income lifecycle across 20 years'}
          </p>
        </div>

        {/* Canonical Aligned Switches Bar */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {/* Switch 1: Annual / Monthly Compensation */}
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setPeriod('annual')}
              className={`seg-control-btn ${period === 'annual' ? 'seg-control-btn-active' : ''}`}
            >
              {isAr ? 'سنوي' : 'Annual'}
            </button>
            <button
              type="button"
              onClick={() => setPeriod('monthly')}
              className={`seg-control-btn ${period === 'monthly' ? 'seg-control-btn-active' : ''}`}
            >
              {isAr ? 'شهري' : 'Monthly'}
            </button>
          </div>

          {/* Switch 2: USD / EGP Currency */}
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setCurrency('USD')}
              className={`seg-control-btn ${currency === 'USD' ? 'seg-control-btn-active' : ''}`}
            >
              USD ($)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('EGP')}
              className={`seg-control-btn ${currency === 'EGP' ? 'seg-control-btn-active' : ''}`}
            >
              EGP ({isAr ? 'ج.م' : 'EGP'})
            </button>
          </div>

          {/* Switch 3: Pyramid / Heatmap View */}
          <div className="seg-control">
            <button
              type="button"
              onClick={() => setViewMode('pyramid')}
              className={`seg-control-btn flex items-center gap-1.5 ${
                viewMode === 'pyramid' ? 'seg-control-btn-active' : ''
              }`}
            >
              <BarChart3 size={12} />
              <span>{isAr ? 'التوزيع الصاعد' : 'Distribution'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('heatmap')}
              className={`seg-control-btn flex items-center gap-1.5 ${
                viewMode === 'heatmap' ? 'seg-control-btn-active' : ''
              }`}
            >
              <SlidersHorizontal size={12} />
              <span>{isAr ? 'الخريطة الحرارية' : 'Heatmap'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Age Group Selector (Placed Directly Above the KPI Cards) */}
      {/* 2A. Mobile View (<sm): Modern Dropdown Menu matching Ticknal Filter Architecture */}
      <div className="flex sm:hidden items-center justify-between gap-2 w-full py-0.5 relative" ref={cohortDropdownRef}>
        <span className="text-xs font-semibold text-text-muted shrink-0">
          {isAr ? 'الفئة العمرية:' : 'Age Group:'}
        </span>

        {/* Dropdown Trigger Button */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsCohortDropdownOpen(!isCohortDropdownOpen)}
            className={`filter-control-btn justify-between gap-2.5 transition-all cursor-pointer min-w-[150px] max-w-[210px] ${
              isCohortDropdownOpen ? 'border-brand-blue ring-1 ring-brand-blue/30 text-text-primary' : ''
            }`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: COHORT_COLORS[selectedCohort] || '#737373' }}
              />
              <span className="truncate font-semibold text-text-primary text-xs">
                {isAr
                  ? COHORT_LABELS_AR[selectedCohort] || selectedCohort
                  : selectedCohort === 'Total' ? 'All Ages (Total)' : `Age ${selectedCohort}`}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-text-muted transition-transform duration-200 shrink-0 ${
                isCohortDropdownOpen ? 'rotate-180 text-text-primary' : ''
              }`}
            />
          </button>

          {/* Modern Dropdown Overlay Menu */}
          {isCohortDropdownOpen && (
            <div
              className="absolute end-0 top-full mt-1.5 z-[80] w-[210px] max-h-72 overflow-y-auto no-scrollbar bg-surface-raised border border-border-subtle rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-1 space-y-0.5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
              dir={isAr ? 'rtl' : 'ltr'}
            >
              {AVAILABLE_COHORTS.map((cohort) => {
                const isSelected = selectedCohort === cohort;
                const label = isAr
                  ? COHORT_LABELS_AR[cohort] || cohort
                  : cohort === 'Total' ? 'All Ages (Total)' : `Age ${cohort}`;
                const isPeak = cohort === '40-44';

                return (
                  <button
                    key={cohort}
                    type="button"
                    onClick={() => {
                      setSelectedCohort(cohort);
                      setIsCohortDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-surface-active text-text-primary font-semibold'
                        : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: COHORT_COLORS[cohort] || '#737373' }}
                      />
                      <span className="truncate">{label}</span>
                      {isPeak && (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.2 bg-brand-blue/20 text-brand-blue rounded-sm shrink-0">
                          {isAr ? 'ذروة' : 'Peak'}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check size={13} className="text-brand-blue shrink-0 ms-2" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 2B. Desktop / Tablet View (>=sm): Segmented Control Switcher */}
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
        <span className="text-xs font-semibold text-text-muted shrink-0">
          {isAr ? 'الفئة العمرية:' : 'Age Group:'}
        </span>
        <div className="seg-control shrink-0">
          {AVAILABLE_COHORTS.map((cohort) => {
            const isSelected = selectedCohort === cohort;
            const label = isAr ? COHORT_LABELS_AR[cohort] || cohort : cohort;
            return (
              <button
                key={cohort}
                type="button"
                onClick={() => setSelectedCohort(cohort)}
                className={`seg-control-btn ${isSelected ? 'seg-control-btn-active' : ''}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. 6-Grid KPI Rails with Edge-to-Edge Sparklines (Cohort-Aware) */}
      <div className="flex overflow-x-auto no-scrollbar snap-x snap-mandatory gap-2 sm:gap-2.5 pb-1 md:grid md:grid-cols-3 xl:grid-cols-6 md:gap-2.5 md:overflow-visible md:pb-0">
        {kpiCards.map((card) => (
          <KPICard
            key={card.id}
            {...card}
            isLoading={isLoading}
          />
        ))}
      </div>

      {/* 4. Interactive Timeline Stepper (Borderless) */}
      <div className="bg-transparent py-1">
        <div className="flex items-center gap-2">
          {/* Controls: Step Back, Play/Pause, Step Next, Year Display */}
          <button
            type="button"
            onClick={() => handleStepYear(-1)}
            className="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-active border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={isAr ? 'السنة السابقة' : 'Previous Year'}
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-8 h-8 rounded-full bg-white text-black hover:bg-neutral-200 flex items-center justify-center shadow-md transition-all cursor-pointer"
            title={isPlaying ? (isAr ? 'إيقاف مؤقت' : 'Pause timeline') : (isAr ? 'تشغيل المسار الزمني' : 'Play timeline')}
          >
            {isPlaying ? (
              <Pause size={14} className="fill-black text-black" />
            ) : (
              <Play size={14} className="ml-0.5 fill-black text-black" />
            )}
          </button>

          <button
            type="button"
            onClick={() => handleStepYear(1)}
            className="w-8 h-8 rounded-full bg-surface-raised hover:bg-surface-active border border-border-subtle flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title={isAr ? 'السنة التالية' : 'Next Year'}
          >
            <ChevronRight size={16} />
          </button>

          {/* Active Year Badge */}
          <div className="flex items-baseline gap-2 ml-2">
            <span className="text-2xl font-bold text-text-primary tabular-nums tracking-tight">
              {selectedYear}
            </span>
            <span className="text-xs text-text-muted font-normal">
              {selectedYear > '2024'
                ? isAr ? '(توقعات مستقبلية)' : '(Model Forecast)'
                : isAr ? '(بيانات تاريخية)' : '(Historical)'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Main Chart View (Ascending Distribution vs. Heatmap) (Borderless) */}
      {viewMode === 'pyramid' ? (
        /* View A: 21 Tiers Sorted Strictly ASCENDING ($0–$500 at Top -> $250k+ at Bottom) */
        <div className="bg-transparent space-y-2 py-1">
          {/* Column Headers */}
          <div className="grid grid-cols-12 items-center pb-2 border-b border-border-subtle text-xs font-semibold text-text-muted">
            <div className="col-span-6 sm:col-span-5 flex items-center gap-2">
              <span className="w-5 text-text-muted text-xs">#</span>
              <span>
                {isAr
                  ? period === 'monthly' ? 'شريحة الدخل الشهري' : 'شريحة الدخل السنوي'
                  : period === 'monthly' ? 'Monthly Income Bracket' : 'Annual Income Bracket'}
              </span>
            </div>
            <div className="col-span-3 sm:col-span-4 text-center sm:text-left">
              {isAr ? 'التوزيع السكاني' : 'Population Distribution'}
            </div>
            <div className="col-span-3 flex items-center justify-end gap-2 sm:gap-6">
              <span className="hidden sm:inline w-14 sm:w-16 text-right">{isAr ? 'الحصة' : 'Share'}</span>
              <span className="w-20 sm:w-28 text-right">{isAr ? 'عدد الأفراد' : 'Volume'}</span>
            </div>
          </div>

          {/* 21 Ascending Rows */}
          <div className="divide-y divide-border-subtle">
            {distributionItems.map((item) => {
              const barWidthPercent = (item.sharePercent / maxSharePercent) * 100;
              const isHovered = hoveredBracket === item.bracket;

              return (
                <div
                  key={item.bracket}
                  onMouseEnter={() => setHoveredBracket(item.bracket)}
                  onMouseLeave={() => setHoveredBracket(null)}
                  className={`grid grid-cols-12 items-center py-2 px-1 transition-all cursor-pointer relative ${
                    isHovered ? 'bg-surface-hover' : 'hover:bg-surface-hover'
                  } ${item.isPeak ? 'border-l-2 border-brand-blue pl-2' : ''}`}
                >
                  {/* Left Column: Index, Dot, Bracket Label & Tier Badge */}
                  <div className="col-span-6 sm:col-span-5 flex items-center gap-2 min-w-0 pr-2">
                    <span className="w-5 text-xs text-text-muted tabular-nums shrink-0">
                      {String(item.index).padStart(2, '0')}
                    </span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-xs font-semibold text-text-primary truncate tabular-nums">
                      {isAr ? item.labelAr : item.labelEn}
                    </span>

                    {item.isPeak && (
                      <span className="hidden md:inline-flex px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-brand-blue/20 text-brand-blue rounded-full shrink-0 ml-1">
                        {isAr ? 'الذروة' : 'Peak'}
                      </span>
                    )}
                  </div>

                  {/* Middle Column: Sleek Loading Bar (1 Solid Color, Rounded-Full Edges, No Gradient) */}
                  <div className="col-span-3 sm:col-span-4 px-2">
                    <div className="w-full h-2 sm:h-2.5 bg-surface-sunken rounded-full overflow-hidden flex items-center">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${Math.max(barWidthPercent, 1.2)}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>

                  {/* Right Column: Headcount & Share % */}
                  <div className="col-span-3 flex items-center justify-end gap-2 sm:gap-6 tabular-nums text-xs">
                    <span className="text-xs font-normal text-text-muted w-14 sm:w-16 text-right">
                      {item.sharePercent.toFixed(2)}%
                    </span>
                    <span className="text-xs font-semibold text-text-primary w-20 sm:w-28 text-right">
                      {formatHeadcount(item.population)}
                    </span>
                  </div>

                  {/* Interactive Popover Hovercard */}
                  {isHovered && (
                    <div
                      className="absolute z-30 top-full mt-1 left-4 sm:left-24 bg-surface-raised border border-border-subtle rounded-lg p-3 shadow-2xl text-xs space-y-1.5 min-w-[270px]"
                      dir={isAr ? 'rtl' : 'ltr'}
                    >
                      <div className="flex items-center justify-between pb-1 border-b border-border-subtle">
                        <span className="font-semibold text-text-primary">
                          {isAr ? item.labelAr : item.labelEn}
                        </span>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold"
                          style={{
                            color: item.color,
                            backgroundColor: `${item.color}20`,
                          }}
                        >
                          {isAr ? item.tierLabelAr : item.tierLabelEn}
                        </span>
                      </div>
                      <div className="flex justify-between pt-0.5">
                        <span className="text-text-muted">{isAr ? 'عدد الأفراد:' : 'Headcount:'}</span>
                        <span className="font-semibold text-text-primary tabular-nums">
                          {item.population.toLocaleString()} {isAr ? 'نسمة' : 'people'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">{isAr ? 'النسبة من القوة العاملة:' : 'Workforce Share:'}</span>
                        <span className="font-semibold text-brand-blue tabular-nums">
                          {item.sharePercent.toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between border-t border-border-subtle pt-1">
                        <span className="text-text-muted">{isAr ? 'المدى السنوي:' : 'Annual Range:'}</span>
                        <span className="font-medium text-text-secondary tabular-nums">
                          {isAr ? item.annualRangeAr : item.annualRangeEn}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-muted">{isAr ? 'المدى الشهري:' : 'Monthly Range:'}</span>
                        <span className="font-medium text-text-secondary tabular-nums">
                          {isAr ? item.monthlyRangeAr : item.monthlyRangeEn}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* View B: 20-Year Heatmap Matrix (21 Brackets × 21 Years) (Borderless) */
        <div className="bg-transparent overflow-x-auto no-scrollbar py-1">
          <div className="min-w-[720px]">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-border-subtle">
              <span className="text-xs font-semibold text-text-muted">
                {isAr ? 'مصفوفة التغير الزمني لشرائح الدخل (2009–2029)' : '20-Year Demographic Wealth Migration Matrix'}
              </span>
              <span className="text-xs text-text-muted">
                {isAr ? 'اضغط على أي سنة للانتقال إليها' : 'Click any year to select'}
              </span>
            </div>

            {/* Matrix Table */}
            <div className="space-y-1">
              {/* Year Header Row */}
              <div className="flex items-center text-xs text-text-muted font-semibold border-b border-border-subtle pb-1">
                <div className="w-44 shrink-0">{isAr ? 'الشريحة (تصاعدي)' : 'Bracket (Ascending)'}</div>
                <div className="flex-1 flex justify-between gap-1">
                  {AVAILABLE_YEARS.map((yr) => (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setSelectedYear(yr)}
                      className={`flex-1 text-center py-1 tabular-nums transition-colors cursor-pointer ${
                        selectedYear === yr
                          ? 'bg-brand-blue text-white font-semibold rounded-sm'
                          : 'hover:text-text-primary'
                      }`}
                    >
                      {yr.slice(2)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rows sorted ascending */}
              {heatmapData.map((row) => (
                <div key={row.bracket} className="flex items-center text-xs py-0.5 hover:bg-surface-hover">
                  <div className="w-44 shrink-0 text-xs text-text-secondary truncate tabular-nums pr-2">
                    {row.bracket}
                  </div>
                  <div className="flex-1 flex gap-1 h-5">
                    {AVAILABLE_YEARS.map((yr) => {
                      const cell = row.yearValues[yr] || { pop: 0, share: 0 };
                      const isSelected = selectedYear === yr;
                      const intensity = Math.min(cell.share / 20, 1);

                      return (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => setSelectedYear(yr)}
                          title={`${row.bracket} (${yr}): ${cell.share}% (${formatHeadcount(cell.pop)})`}
                          className={`flex-1 h-full rounded-sm transition-all cursor-pointer relative ${
                            isSelected ? 'ring-1 ring-text-primary' : ''
                          }`}
                          style={{
                            backgroundColor:
                              cell.share > 0
                                ? `rgba(41, 98, 255, ${Math.max(intensity, 0.08)})`
                                : 'rgba(255, 255, 255, 0.02)',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. Enhanced Secondary Chart: Gross Income by Age Lifecycle (Borderless) */}
      <div className="bg-transparent space-y-3 pt-6 border-t border-border-subtle">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-minty-green-400" />
              <span>
                {isAr
                  ? period === 'monthly' ? 'مسار الدخل الشهري عبر الفئات العمرية' : 'مسار الدخل السنوي عبر الفئات العمرية'
                  : period === 'monthly' ? 'Monthly Gross Income by Age Lifecycle (2009–2029)' : 'Annual Gross Income by Age Lifecycle (2009–2029)'}
              </span>
            </h3>
            <p className="section-subtitle mt-0.5">
              {isAr
                ? 'يوضح المسار التاريخي لصدمات تعويم الجنيه (2016 و2024) وذروة سن 40–44 في القدرة الكسبية'
                : 'Highlights historical EGP floatation shocks (2016 & 2024) and the peak earning power of the 40–44 age group'}
            </p>
          </div>

          {/* Clean Legend */}
          <div className="flex items-center gap-2.5 text-xs text-text-muted flex-wrap">
            <span className="flex items-center gap-1 font-semibold text-text-primary">
              <span className="w-2 h-2 rounded-full bg-[#2962ff]"></span>
              <span>{isAr ? 'سن 40-44 (الذروة)' : 'Age 40-44 (Peak)'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#089981]"></span>
              <span>{isAr ? 'سن 35-39' : 'Age 35-39'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#26c6da]"></span>
              <span>{isAr ? 'سن 30-34' : 'Age 30-34'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#ab47bc]"></span>
              <span>{isAr ? 'سن 20-24' : 'Age 20-24'}</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#737373]"></span>
              <span>{isAr ? 'سن 65+' : 'Age 65+'}</span>
            </span>
          </div>
        </div>

        {/* Chart Canvas with strict Cartesian dir="ltr" isolation */}
        <div className="relative mt-2 w-full min-w-0 h-[340px] sm:h-[380px] bg-plt-base overflow-hidden pt-2" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={grossIncomeSeries}
              margin={{ top: 16, right: 0, left: 0, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#222222" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="#262626"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#737373', fontSize: 11, fontFamily: 'sans-serif' }}
                dy={10}
              />
              <YAxis
                orientation="right"
                stroke="#262626"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#888888', fontSize: 11, fontFamily: 'sans-serif' }}
                tickFormatter={(val: number) => {
                  if (currency === 'USD') {
                    return period === 'monthly'
                      ? `$${Math.round(val)}`
                      : `$${(val / 1000).toFixed(1)}k`;
                  }
                  return period === 'monthly'
                    ? `${(val / 1000).toFixed(0)}k`
                    : `${Math.round(val / 1000)}k`;
                }}
                width={56}
                dx={2}
              />

              {/* Event Reference Lines */}
              <ReferenceLine
                x="2016"
                stroke="#f59e0b"
                strokeDasharray="3 3"
                label={{
                  value: isAr ? 'تعويم 2016' : '2016 Float',
                  fill: '#f59e0b',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <ReferenceLine
                x="2024"
                stroke="#f7525f"
                strokeDasharray="3 3"
                label={{
                  value: isAr ? 'تعويم 2024' : '2024 Float',
                  fill: '#f7525f',
                  fontSize: 10,
                  position: 'top',
                }}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const data = payload[0].payload as { year: string; exchangeRate: number; [key: string]: number | string };

                  return (
                    <div
                      className="bg-surface-raised border border-border-subtle rounded-lg p-3 shadow-2xl text-xs space-y-1.5 z-50 min-w-[230px]"
                      dir={isAr ? 'rtl' : 'ltr'}
                    >
                      <div className="text-text-muted font-medium pb-1 border-b border-border-subtle flex items-center justify-between gap-4">
                        <span className="font-semibold text-text-primary tabular-nums">{data.year}</span>
                        <span className="text-xs text-text-muted tabular-nums">
                          {isAr ? `1$ = ${data.exchangeRate} ج.م` : `1$ = ${data.exchangeRate} EGP`}
                        </span>
                      </div>
                      <div className="space-y-1 pt-0.5">
                        {Object.keys(COHORT_COLORS).map((cKey) => {
                          const val = Number(data[cKey] || 0);
                          const color = COHORT_COLORS[cKey];
                          const suffix = period === 'monthly'
                            ? (currency === 'USD' ? '/ mo' : (isAr ? 'ج.م / شهر' : 'EGP / mo'))
                            : (currency === 'USD' ? '/ yr' : (isAr ? 'ج.م / سنة' : 'EGP / yr'));

                          return (
                            <div key={cKey} className="flex items-center justify-between gap-4">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }}></span>
                                <span className="text-text-secondary text-xs">{cKey}:</span>
                              </div>
                              <span className="font-semibold text-text-primary tabular-nums text-xs">
                                {currency === 'USD' ? `$${val.toLocaleString()}` : val.toLocaleString()} {suffix}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }}
              />

              {/* Line series with peak 40-44 emphasized */}
              {Object.keys(COHORT_COLORS).map((cKey) => (
                <Line
                  key={cKey}
                  type="monotone"
                  dataKey={cKey}
                  stroke={COHORT_COLORS[cKey]}
                  strokeWidth={cKey === '40-44' ? 2.5 : 1.3}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
