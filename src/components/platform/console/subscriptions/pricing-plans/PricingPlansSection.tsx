'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  X,
  Info,
  ShieldCheck,
  CreditCard,
  Settings,
  Users,
} from '@/components/ui/icon-library';
import EditPlanDrawer, { type EditablePlanData } from './EditPlanDrawer';
import type { ConsoleSubscriptionsPageData } from '@/lib/server/console-queries';

type PlanItem = ConsoleSubscriptionsPageData['tierSummary'][number];

interface PricingPlansSectionProps {
  tierSummary: ConsoleSubscriptionsPageData['tierSummary'];
  onRefresh?: () => void;
}

interface FeatureRow {
  key: string;
  label: string;
  hasProgressBar: boolean;
  included: boolean;
  customText: string;
  progress?: number;
  isCustomIndicator?: boolean;
}

function getPlanFeatureRows(plan: PlanItem): FeatureRow[] {
  const limits = plan.limits || {
    chartsPerTab: plan.tier === 'free' ? 2 : plan.tier === 'plus' ? 4 : 8,
    indicatorsPerChart: plan.tier === 'free' ? 5 : plan.tier === 'plus' ? 10 : 25,
    historicalBars: plan.tier === 'free' ? 2000 : plan.tier === 'plus' ? 10000 : 40000,
    parallelConnections: plan.tier === 'free' ? 5 : plan.tier === 'plus' ? 20 : 100,
    priceAlerts: plan.tier === 'free' ? 0 : plan.tier === 'plus' ? 100 : 500,
    technicalAlerts: plan.tier === 'free' ? 0 : plan.tier === 'plus' ? 100 : 500,
    pushAlerts: plan.tier === 'free' ? 0 : plan.tier === 'plus' ? 25 : -1,
  };

  const features = plan.planFeatures || {
    breakoutDetection:
      plan.tier === 'free' ? 'none' : plan.tier === 'plus' ? 'intraday' : 'multi_timeframe',
    hydraIndicator: plan.tier === 'elite' || plan.tier === 'vip',
    typhoonEngine: plan.tier === 'elite' || plan.tier === 'vip',
    cerberusConfluence: plan.tier === 'elite' || plan.tier === 'vip',
    egxCoverage: true,
    screeners: true,
    devicesSync: true,
    noAds: true,
  };

  const isFree = plan.tier === 'free';
  const isPlus = plan.tier === 'plus';

  return [
    {
      key: 'CHARTS_PER_TAB',
      label: 'Charts per layout',
      hasProgressBar: true,
      included: true,
      customText: `${limits.chartsPerTab} charts per tab`,
      progress: Math.min(100, Math.round((limits.chartsPerTab / 8) * 100)),
    },
    {
      key: 'INDICATORS_ON_CHART',
      label: 'Indicators per chart',
      hasProgressBar: true,
      included: true,
      customText: `${limits.indicatorsPerChart} indicators per chart`,
      progress: Math.min(100, Math.round((limits.indicatorsPerChart / 25) * 100)),
    },
    {
      key: 'HISTORICAL_BARS',
      label: 'Historical market tick bars',
      hasProgressBar: true,
      included: true,
      customText: `${(limits.historicalBars / 1000).toFixed(0)}K historical bars`,
      progress: Math.min(100, Math.round((limits.historicalBars / 40000) * 100)),
    },
    {
      key: 'PARALLEL_CONNECTIONS',
      label: 'Parallel chart connections',
      hasProgressBar: true,
      included: true,
      customText: `${limits.parallelConnections} parallel connections`,
      progress: Math.min(100, Math.round((limits.parallelConnections / 100) * 100)),
    },
    {
      key: 'PRICE_ALERTS',
      label: 'Price alerts',
      hasProgressBar: true,
      included: limits.priceAlerts > 0 || limits.priceAlerts === -1,
      customText:
        limits.priceAlerts === -1
          ? 'Unlimited price alerts'
          : limits.priceAlerts > 0
          ? `${limits.priceAlerts} price alerts`
          : '0 price alerts',
      progress:
        limits.priceAlerts === -1
          ? 100
          : limits.priceAlerts > 0
          ? Math.min(100, Math.round((limits.priceAlerts / 500) * 100))
          : 0,
    },
    {
      key: 'TECHNICAL_ALERTS',
      label: 'Technical alerts',
      hasProgressBar: true,
      included:
        (limits.technicalAlerts ?? limits.priceAlerts) > 0 ||
        (limits.technicalAlerts ?? limits.priceAlerts) === -1,
      customText:
        (limits.technicalAlerts ?? limits.priceAlerts) === -1
          ? 'Unlimited technical alerts'
          : (limits.technicalAlerts ?? limits.priceAlerts) > 0
          ? `${limits.technicalAlerts ?? limits.priceAlerts} technical alerts`
          : '0 technical alerts',
      progress:
        (limits.technicalAlerts ?? limits.priceAlerts) === -1
          ? 100
          : (limits.technicalAlerts ?? limits.priceAlerts) > 0
          ? Math.min(100, Math.round(((limits.technicalAlerts ?? limits.priceAlerts) / 500) * 100))
          : 0,
    },
    {
      key: 'PUSH_TELEGRAM_ALERTS',
      label: 'Instant push & Telegram alerts',
      hasProgressBar: true,
      included: limits.pushAlerts > 0 || limits.pushAlerts === -1,
      customText:
        limits.pushAlerts === -1
          ? 'Unlimited push & Telegram'
          : limits.pushAlerts > 0
          ? `${limits.pushAlerts} push & Telegram alerts`
          : '0 push & Telegram alerts',
      progress:
        limits.pushAlerts === -1
          ? 100
          : limits.pushAlerts > 0
          ? Math.min(100, Math.round((limits.pushAlerts / 25) * 100))
          : 0,
    },
    {
      key: 'BREAKOUT_DETECTION',
      label: 'Anomaly breakout detection',
      hasProgressBar: true,
      included: features.breakoutDetection !== 'none',
      customText:
        features.breakoutDetection === 'multi_timeframe'
          ? 'Multi-timeframe breakout engine'
          : features.breakoutDetection === 'intraday'
          ? 'Intraday breakout alerts'
          : 'No breakout detection',
      progress:
        features.breakoutDetection === 'multi_timeframe'
          ? 100
          : features.breakoutDetection === 'intraday'
          ? 50
          : 0,
    },
    {
      key: 'HYDRA_INDICATOR',
      label: 'Hydra Adaptive Momentum Indicator',
      hasProgressBar: false,
      included: Boolean(features.hydraIndicator),
      customText: features.hydraIndicator
        ? 'Hydra Adaptive Momentum Indicator'
        : 'Hydra Indicator',
      isCustomIndicator: true,
    },
    {
      key: 'TYPHOON_INDICATOR',
      label: 'Typhoon Volume Imbalance Engine',
      hasProgressBar: false,
      included: Boolean(features.typhoonEngine),
      customText: features.typhoonEngine
        ? 'Typhoon Volume Imbalance Engine'
        : 'Typhoon Engine',
      isCustomIndicator: true,
    },
    {
      key: 'CERBERUS_INDICATOR',
      label: 'Cerberus Multi-Factor Confluence',
      hasProgressBar: false,
      included: Boolean(features.cerberusConfluence),
      customText: features.cerberusConfluence
        ? 'Cerberus Multi-Factor Confluence'
        : 'Cerberus Confluence',
      isCustomIndicator: true,
    },
    {
      key: 'EGX_MARKET_COVERAGE',
      label: '290+ EGX equities & 160+ mutual funds',
      hasProgressBar: false,
      included: features.egxCoverage ?? true,
      customText: 'Full EGX equities & funds',
    },
    {
      key: 'SCREENERS',
      label: 'Market breadth & sector rotation screeners',
      hasProgressBar: false,
      included: features.screeners ?? true,
      customText: 'Sector breadth & screeners',
    },
    {
      key: 'DEVICES_SYNC',
      label: 'Web, desktop and mobile apps',
      hasProgressBar: false,
      included: features.devicesSync ?? true,
      customText: 'Web, desktop & mobile apps',
    },
    {
      key: 'NO_ADS',
      label: 'No ads',
      hasProgressBar: false,
      included: features.noAds ?? true,
      customText: 'No ads',
    },
  ];
}

export default function PricingPlansSection({
  tierSummary,
  onRefresh,
}: PricingPlansSectionProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [editingPlan, setEditingPlan] = useState<EditablePlanData | null>(null);

  const isAnnual = billingCycle === 'annual';

  const plusPlan = tierSummary.find((p) => p.tier === 'plus');
  const elitePlan = tierSummary.find((p) => p.tier === 'elite');

  const plusDiscount = plusPlan?.annualDiscountPct ?? 17;
  const eliteDiscount = elitePlan?.annualDiscountPct ?? 17;
  const maxDiscountPct = Math.max(plusDiscount, eliteDiscount, 17);

  const handleEdit = (plan: PlanItem) => {
    setEditingPlan({
      tier: plan.tier,
      name: plan.name,
      description: plan.description,
      monthlyPriceEgp: plan.monthlyPriceEgp,
      annualPriceEgp: plan.annualPriceEgp,
      annualDiscountPct: plan.annualDiscountPct,
      badge: plan.badge,
      color: plan.color,
      limits: plan.limits,
      planFeatures: plan.planFeatures,
    });
  };

  const handleSaved = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="relative w-full space-y-8 font-sans select-none">
      {/* 1. BILLING SWITCHER (Centered with Cyan Dot & Discount Fire Badge) */}
      <div className="flex items-center justify-center gap-6 text-sm font-medium pt-1 pb-2">
        <button
          type="button"
          onClick={() => setBillingCycle('monthly')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
        >
          <span
            className={`relative w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
              billingCycle === 'monthly'
                ? 'border-[#00c6ff] bg-black'
                : 'border-zinc-600 group-hover:border-zinc-400'
            }`}
          >
            {billingCycle === 'monthly' && (
              <motion.span
                layoutId="pricing-billing-dot-console"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="w-2 h-2 rounded-full bg-[#00c6ff]"
              />
            )}
          </span>
          <span
            className={
              billingCycle === 'monthly' ? 'text-white font-medium' : 'text-zinc-400'
            }
          >
            Monthly
          </span>
        </button>

        <button
          type="button"
          onClick={() => setBillingCycle('annual')}
          className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors cursor-pointer group"
        >
          <span
            className={`relative w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
              billingCycle === 'annual'
                ? 'border-[#00c6ff] bg-black'
                : 'border-zinc-600 group-hover:border-zinc-400'
            }`}
          >
            {billingCycle === 'annual' && (
              <motion.span
                layoutId="pricing-billing-dot-console"
                transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                className="w-2 h-2 rounded-full bg-[#00c6ff]"
              />
            )}
          </span>
          <span
            className={
              billingCycle === 'annual' ? 'text-white font-medium' : 'text-zinc-400'
            }
          >
            Annual
          </span>
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-white/10 text-white border border-white/10 flex items-center gap-1 transition-transform group-hover:scale-105">
            Save up to {maxDiscountPct}% <span role="img" aria-label="fire">🔥</span>
          </span>
        </button>
      </div>

      {/* 2. THE CONTINUOUS FRAME WITH MOVING 2PX CONIC GRADIENT BORDER */}
      <div className="relative w-full max-w-7xl mx-auto">
        {/* Subtle colorful ambient aura behind the table */}
        <div className="absolute -inset-1 rounded-[26px] overflow-hidden pointer-events-none opacity-20 blur-xl">
          <motion.div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '3200px',
              height: '3200px',
              marginLeft: '-1600px',
              marginTop: '-1600px',
              background:
                'conic-gradient(from 0deg, #00c6ff 0%, #2962ff 25%, #8a2be2 50%, #ff007a 75%, #00c6ff 100%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
          />
        </div>

        {/* Table Container with Moving 2px Hairline Gradient Border */}
        <div className="relative w-full rounded-[24px] p-[2px] overflow-hidden shadow-2xl">
          <motion.div
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '3200px',
              height: '3200px',
              marginLeft: '-1600px',
              marginTop: '-1600px',
              background:
                'conic-gradient(from 0deg, #00c6ff 0%, #2962ff 25%, #8a2be2 50%, #ff007a 75%, #00c6ff 100%)',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
            className="pointer-events-none select-none"
          />

          {/* Inner Pure Pitch-Black Content Container */}
          <div className="relative w-full h-full bg-black rounded-[22px] overflow-hidden">
            <div
              className={`grid grid-cols-1 md:grid-cols-2 ${
                tierSummary.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
              } divide-y md:divide-y-0 divide-white/[0.08] lg:divide-x`}
            >
              {tierSummary.map((plan) => {
                const isFree = plan.tier === 'free';
                const isPlus = plan.tier === 'plus';
                const isElite = plan.tier === 'elite';
                const isVip = plan.tier === 'vip';

                // Price Math
                const monthlyPrice = isFree || isVip ? 0 : plan.monthlyPriceEgp;
                const annualTotal = isFree || isVip ? 0 : plan.annualPriceEgp;
                const annualMonthly = Math.round(annualTotal / 12);
                const savedYear = Math.max(0, monthlyPrice * 12 - annualTotal);

                const displayedPrice = isFree || isVip ? 0 : isAnnual ? annualMonthly : monthlyPrice;

                // Feature items with progress bars
                const features = getPlanFeatureRows(plan);

                // Badges
                const badgeText = isFree
                  ? 'STARTER'
                  : isPlus
                  ? 'MOST POPULAR'
                  : isElite
                  ? 'STATE-OF-THE-ART'
                  : 'PARTNER & VIP';

                const badgeClass = isPlus
                  ? 'text-[10px] font-semibold uppercase tracking-wider text-black bg-white px-2 py-0.5 rounded shadow-sm'
                  : isElite
                  ? 'text-[10px] font-semibold uppercase tracking-wider text-pink-300 px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20'
                  : isVip
                  ? 'text-[10px] font-semibold uppercase tracking-wider text-purple-300 px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/20'
                  : 'text-[10px] font-medium uppercase tracking-wider text-zinc-400 px-2 py-0.5 rounded bg-white/[0.05] border border-white/10';

                // Button Styling
                const buttonClass = isPlus
                  ? 'w-full py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 hover:shadow-[0_0_24px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm cursor-pointer'
                  : isVip
                  ? 'w-full py-2.5 px-4 rounded-md text-sm font-semibold text-white bg-purple-600 hover:bg-purple-500 hover:shadow-[0_0_24px_rgba(168,85,247,0.4)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm cursor-pointer'
                  : 'w-full py-2.5 px-4 rounded-md text-sm font-semibold text-black bg-white hover:bg-neutral-200 hover:shadow-[0_0_24px_rgba(255,255,255,0.25)] active:scale-[0.98] transition-all duration-200 text-center block shadow-sm cursor-pointer';

                return (
                  <div
                    key={plan.tier}
                    className={`flex flex-col justify-between p-5 sm:p-6 lg:p-7 ${
                      isPlus ? 'bg-white/[0.01]' : ''
                    }`}
                  >
                    <div>
                      {/* Plan Header */}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white tracking-tight">
                          {plan.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={badgeClass}>{badgeText}</span>
                          <button
                            type="button"
                            onClick={() => handleEdit(plan)}
                            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            title={`Configure ${plan.name} parameters`}
                          >
                            <Settings size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Pricing Display */}
                      <div className="mt-3">
                        <div className="flex items-baseline gap-1">
                          <AnimatePresence mode="wait" initial={false}>
                            <motion.span
                              key={`${plan.tier}-${isAnnual ? 'annual' : 'monthly'}`}
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              transition={{ duration: 0.18, ease: 'easeOut' }}
                              className="text-3xl sm:text-4xl font-bold text-white tabular-nums tracking-tight inline-block"
                            >
                              {displayedPrice}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-sm font-medium text-zinc-400">EGP</span>
                          <span className="text-xs text-zinc-500 font-normal ml-1">/ mo</span>
                        </div>

                        {/* Subtitle Line 1 */}
                        <AnimatePresence mode="wait" initial={false}>
                          <motion.div
                            key={`${plan.tier}-sub1-${isAnnual ? 'annual' : 'monthly'}`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="text-xs text-zinc-400 mt-1"
                          >
                            {isFree ? (
                              'free forever'
                            ) : isVip ? (
                              <span className="text-purple-300 font-medium">Complimentary access (0 EGP)</span>
                            ) : isAnnual ? (
                              `billed annually (${annualTotal} EGP)`
                            ) : (
                              'billed monthly'
                            )}
                          </motion.div>
                        </AnimatePresence>

                        {/* Subtitle Line 2 */}
                        <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1 min-h-[16px]">
                          {isFree ? (
                            <span className="text-zinc-500">No credit card required</span>
                          ) : isVip ? (
                            <span className="text-zinc-400">Full partner & team unrestricted</span>
                          ) : isAnnual ? (
                            <>
                              <span>Save {savedYear} EGP a year</span>
                              <span
                                title={`Compared to paying monthly. Full annual price is ${annualTotal} EGP instead of ${
                                  monthlyPrice * 12
                                } EGP.`}
                                className="inline-flex cursor-help text-zinc-500 hover:text-white"
                              >
                                <Info className="w-3.5 h-3.5" />
                              </span>
                            </>
                          ) : (
                            <span>
                              {isPlus
                                ? 'Real-time alerts & indicators'
                                : 'Institutional quantitative edge'}
                            </span>
                          )}
                        </div>

                        {/* Active Members Chip */}
                        <div className="mt-3 flex items-center justify-between px-2.5 py-1.5 rounded-md bg-white/[0.03] border border-white/[0.06] text-xs">
                          <span className="text-zinc-400 flex items-center gap-1.5 text-[11px]">
                            <Users size={12} className="text-zinc-400" /> Active Members
                          </span>
                          <span className="font-bold text-white tabular-nums text-xs">
                            {plan.activeSeats} {plan.activeSeats === 1 ? 'seat' : 'seats'}
                          </span>
                        </div>
                      </div>

                      {/* Top Action Button */}
                      <div className="mt-5">
                        <button
                          type="button"
                          onClick={() => handleEdit(plan)}
                          className={buttonClass}
                        >
                          Configure Plan
                        </button>
                      </div>

                      {/* Condensed Feature Matrix */}
                      <div className="mt-6">
                        <ul className="space-y-3.5">
                          {features.map((feat) => (
                            <li
                              key={feat.key}
                              className="flex items-start gap-2.5 min-h-[40px]"
                            >
                              <span className="shrink-0 mt-0.5">
                                {feat.included ? (
                                  <Check className="w-3.5 h-3.5 text-white/80" />
                                ) : (
                                  <X className="w-3.5 h-3.5 text-zinc-600" />
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-xs sm:text-[13px] leading-tight ${
                                    feat.isCustomIndicator && feat.included
                                      ? 'text-white font-medium'
                                      : feat.included
                                      ? 'text-zinc-200 font-normal'
                                      : 'text-zinc-600 line-through decoration-zinc-700 font-normal'
                                  }`}
                                >
                                  {feat.customText}
                                </p>
                                {feat.hasProgressBar && (
                                  <div className="w-full h-[2.5px] bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{
                                        width: feat.included ? `${feat.progress}%` : '0%',
                                      }}
                                      transition={{
                                        duration: 0.75,
                                        delay: 0.15,
                                        ease: [0.16, 1, 0.3, 1],
                                      }}
                                      className={`h-full rounded-full ${
                                        feat.included ? 'bg-white' : 'bg-transparent'
                                      }`}
                                    />
                                  </div>
                                )}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Bottom Action Button Mirror */}
                    <div className="mt-6 pt-4 border-t border-white/[0.06] flex flex-col gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(plan)}
                        className={buttonClass}
                      >
                        Configure Plan
                      </button>

                      {/* Revenue Share Meta */}
                      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
                        <span>Commercial Yield</span>
                        <span className="font-semibold text-zinc-400 tabular-nums">
                          {isFree || isVip
                            ? 'Complimentary'
                            : `${plan.mrrContribution} EGP/mo (${plan.revenueSharePct}%)`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. AVAILABLE PAYMENT METHODS IN EGYPT */}
      <div className="w-full max-w-5xl mx-auto pt-4 flex flex-col items-center">
        <div className="flex items-center gap-2 mb-4 text-xs font-medium uppercase tracking-wider text-zinc-400">
          <CreditCard className="w-4 h-4 text-zinc-400" />
          <span>Available Payment Methods in Egypt</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-4xl">
          {/* InstaPay Pill */}
          <div className="inline-flex items-center gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none shadow-sm cursor-default">
            <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-white border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/payments/instapay.png"
                alt="InstaPay"
                className="w-full h-full object-contain p-0.5 rounded-full"
              />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
              InstaPay
            </span>
          </div>

          {/* Vodafone Cash Pill */}
          <div className="inline-flex items-center gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none shadow-sm cursor-default">
            <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-[#e60000] border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/payments/vodafone.png"
                alt="Vodafone Cash"
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
              Vodafone Cash
            </span>
          </div>

          {/* Visa & Mastercard Pill */}
          <div className="inline-flex items-center gap-3 px-4 py-2 sm:py-2.5 rounded-full bg-white/[0.03] border border-white/[0.08] hover:border-white/25 hover:bg-white/[0.07] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 select-none shadow-sm cursor-default">
            <div className="relative w-8 sm:w-9 h-8 sm:h-9 rounded-full overflow-hidden bg-zinc-900 border border-white/15 flex items-center justify-center shrink-0 shadow-inner">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/payments/cards.svg"
                alt="Visa & Mastercard"
                className="w-full h-full object-contain p-1 rounded-full"
              />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white tracking-tight">
              Visa & Mastercard
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-zinc-500 font-normal">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Local Currency (EGP)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>No Foreign Currency Limit Issues</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Instant Automated Activation</span>
          </div>
        </div>
      </div>

      {/* 4. EDIT PLAN DRAWER */}
      {editingPlan && (
        <EditPlanDrawer
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
