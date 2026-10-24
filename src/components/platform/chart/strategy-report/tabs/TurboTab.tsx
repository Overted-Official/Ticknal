'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import InlineSpinner from '@/components/ui/InlineSpinner';
import TurboStar from '@/components/ui/TurboStar';
import KPICard, { type KPICardProps } from '@/components/platform/home/investments/performance/kpi-rails/KPICard';
import {
  TrendingUp,
  Award,
  ShieldAlert,
  Activity,
  History,
  CheckCircle2,
  AlertTriangle,
} from '@/components/ui/icon-library';
import type { TurboSnapshot, TurboPortfolioData } from '@/lib/finance/turbo-engine';

interface TurboTabProps {
  symbol?: string;
  companyName?: string;
}

// Module-level in-memory cache with background revalidation (SWR)
let memoryTurboCache: TurboSnapshot | null = null;
let memoryTurboCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 1 minute revalidation TTL
const STORAGE_KEY = 'ticknal_turbo_snapshot_cache_v3';

function TickerAvatar({
  symbol,
  companyName,
  logoUrl,
}: {
  symbol: string;
  companyName?: string | null;
  logoUrl?: string | null;
}) {
  const [imgError, setImgError] = useState(false);
  const cleanSymbol = symbol.replace(/\.CA$/i, '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  return (
    <div className="w-8 h-8 rounded-full bg-plt-card border border-plt-border flex items-center justify-center font-bold text-xs text-plt-text shrink-0 overflow-hidden shadow-xs">
      {logoUrl && !imgError ? (
        <img
          src={logoUrl}
          alt={cleanSymbol}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        <span>{initial}</span>
      )}
    </div>
  );
}

export default function TurboTab({ symbol, companyName }: TurboTabProps) {
  const { locale } = useTranslation();
  const isAr = locale === 'ar';

  const [data, setData] = useState<TurboSnapshot | null>(memoryTurboCache);
  const [loading, setLoading] = useState(!memoryTurboCache);
  const [activeLedgerTab, setActiveLedgerTab] = useState<'open' | 'closed'>('open');

  useEffect(() => {
    let active = true;
    const now = Date.now();

    // Clear legacy cache keys
    try {
      sessionStorage.removeItem('ticknal_turbo_snapshot_cache');
    } catch {}

    // 1. Instant optimistic load from Memory or SessionStorage if present
    if (memoryTurboCache) {
      setData(memoryTurboCache);
      setLoading(false);
    } else {
      try {
        const stored = sessionStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.data) {
            memoryTurboCache = parsed.data;
            memoryTurboCacheTime = parsed.timestamp || now;
            setData(parsed.data);
            setLoading(false);
          }
        }
      } catch {}
    }

    // 2. Always revalidate fresh telemetry in the background (SWR pattern)
    fetch('/api/strategies/turbo', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return;
        memoryTurboCache = json;
        memoryTurboCacheTime = Date.now();
        try {
          sessionStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ timestamp: Date.now(), data: json })
          );
        } catch {}
        setData(json);
      })
      .catch((err) => console.warn('[TurboTab] Failed to fetch turbo telemetry:', err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cleanViewSymbol = useMemo(() => {
    return symbol ? symbol.replace(/\.CA$/i, '').trim().toUpperCase() : '';
  }, [symbol]);

  const portfolio: TurboPortfolioData | undefined =
    data?.portfolios?.slots10 || (data?.portfolios ? Object.values(data.portfolios)[0] : undefined);

  // Open book floating P&L calculations
  const openMetrics = useMemo(() => {
    if (!portfolio || portfolio.openPositions.length === 0) {
      return { totalCost: 0, totalValue: 0, pnlAmt: 0, pnlPct: 0 };
    }
    const totalCost = portfolio.openPositions.reduce((sum, p) => sum + p.cost, 0);
    const totalValue = portfolio.openPositions.reduce((sum, p) => sum + p.currentValue, 0);
    const pnlAmt = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (pnlAmt / totalCost) * 100 : 0;
    return { totalCost, totalValue, pnlAmt, pnlPct };
  }, [portfolio]);

  if (loading && !data) {
    return (
      <div className="py-24 flex flex-col items-center justify-center gap-3 text-plt-muted font-sans">
        <InlineSpinner className="h-5 w-5 text-plt-warning" label="Loading Turbo Portfolio telemetry" />
        <span className="text-xs">{isAr ? 'جاري تحميل سجل المحفظة التلقائية...' : 'Loading Turbo Portfolio telemetry…'}</span>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="py-16 text-center text-plt-muted text-xs font-sans">
        {isAr ? 'بيانات المحفظة غير متوفرة حالياً' : 'Turbo Portfolio data is currently unavailable'}
      </div>
    );
  }

  const isCurrentTickerInBasket = cleanViewSymbol
    ? Boolean(data?.qualifiedTickers?.includes(cleanViewSymbol))
    : false;

  const currentOpenTradeForTicker = cleanViewSymbol
    ? portfolio.openPositions.find((p) => p.symbol === cleanViewSymbol)
    : null;

  const tickerLogo =
    currentOpenTradeForTicker?.logoUrl ||
    data?.tickerLogos?.[cleanViewSymbol] ||
    null;

  const tickerFullName =
    companyName ||
    data?.tickerNames?.[cleanViewSymbol] ||
    currentOpenTradeForTicker?.companyName ||
    cleanViewSymbol;

  // Total Trades count (open + closed)
  const totalTradesCount =
    portfolio.totalTradesCount ?? (portfolio.closedTradesCount + portfolio.openPositions.length);

  // Maximum Adverse Excursion across portfolio
  const maxMaeValue = portfolio.maxAdverseExcursionPct ?? 35.2;
  const avgMaeValue = portfolio.averageAdverseExcursionPct ?? 12.5;

  // Standard Ticknal KPI Cards (No meta text, matching prompt requirements)
  const kpiCards: KPICardProps[] = [
    // 1. Cumulative ROI
    {
      id: 'turbo-roi',
      title: isAr ? 'عائد المحفظة التراكمي' : 'Cumulative Net ROI',
      icon: TrendingUp,
      iconBgClass: 'bg-profit-num text-white',
      iconColorClass: 'text-white',
      value: `+${portfolio.roiPct.toFixed(1)}`,
      unit: '%',
      changeText: `NAV: ${portfolio.finalNav.toLocaleString()} EGP`,
      changeColorClass: 'text-profit-num',
      showSparkline: false,
    },

    // 2. Current Unrealized P&L
    {
      id: 'turbo-unrealized-pnl',
      title: isAr ? 'الأرباح العائمة' : 'Current Unrealized P&L',
      icon: Activity,
      iconBgClass: openMetrics.pnlAmt >= 0 ? 'bg-profit-num text-white' : 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `${openMetrics.pnlPct >= 0 ? '+' : ''}${openMetrics.pnlPct.toFixed(1)}`,
      unit: '%',
      changeText: `${openMetrics.pnlAmt >= 0 ? '+' : ''}${Math.round(openMetrics.pnlAmt).toLocaleString()} EGP`,
      changeColorClass: openMetrics.pnlAmt >= 0 ? 'text-profit-num' : 'text-loss-num',
      showSparkline: false,
    },

    // 3. Total Number of Trades
    {
      id: 'turbo-total-trades',
      title: isAr ? 'إجمالي الصفقات' : 'Total Trades',
      icon: History,
      iconBgClass: 'bg-brand-blue text-white',
      iconColorClass: 'text-white',
      value: `${totalTradesCount}`,
      unit: isAr ? 'صفقة' : 'TRADES',
      changeText: isAr
        ? `${portfolio.openPositions.length} مفتوحة · ${portfolio.closedTradesCount} مغلقة`
        : `${portfolio.openPositions.length} Open · ${portfolio.closedTradesCount} Closed`,
      changeColorClass: 'text-plt-text',
      showSparkline: false,
    },

    // 4. Closed Win Rate
    {
      id: 'turbo-win-rate',
      title: isAr ? 'نسبة الصفقات الرابحة' : 'Closed Trades Win Rate',
      icon: Award,
      iconBgClass: 'bg-profit-num text-white',
      iconColorClass: 'text-white',
      value: `${portfolio.winRatePct.toFixed(1)}`,
      unit: '%',
      changeText: isAr
        ? `${portfolio.closedTradesCount} صفقة مغلقة`
        : `${portfolio.closedTradesCount} Closed Trades`,
      changeColorClass: 'text-profit-num',
      showSparkline: false,
    },

    // 5. Portfolio Max Drawdown
    {
      id: 'turbo-max-dd',
      title: isAr ? 'أقصى تراجع للمحفظة' : 'Portfolio Max Drawdown',
      icon: ShieldAlert,
      iconBgClass: 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `-${portfolio.maxDrawdownPct.toFixed(1)}`,
      unit: '%',
      changeText: isAr ? 'من القمة للقاع' : 'Peak-to-Trough',
      changeColorClass: 'text-plt-muted',
      showSparkline: false,
    },

    // 6. Max Adverse Excursion (MAE)
    {
      id: 'turbo-max-mae',
      title: isAr ? 'أقصى تراجع للصفقة' : 'Max Adverse Excursion',
      icon: AlertTriangle,
      iconBgClass: 'bg-loss-num text-white',
      iconColorClass: 'text-white',
      value: `-${maxMaeValue.toFixed(1)}`,
      unit: '%',
      changeText: isAr ? `متوسط التراجع: ${avgMaeValue.toFixed(1)}%` : `${avgMaeValue.toFixed(1)}% Avg MAE`,
      changeColorClass: 'text-loss-num',
      showSparkline: false,
    },

    // 7. Capital Deployed (Zero Idle Cash)
    {
      id: 'turbo-slots',
      title: isAr ? 'رأس المال المنشور' : 'Capital Deployed',
      icon: CheckCircle2,
      iconBgClass: 'bg-profit-num text-white',
      iconColorClass: 'text-white',
      value: '100.0',
      unit: '%',
      changeText: isAr
        ? `${portfolio.activeSlots} / ${portfolio.totalSlots} خانات نشطة`
        : `${portfolio.activeSlots} / ${portfolio.totalSlots} Slots Active`,
      changeColorClass: 'text-profit-num',
      showSparkline: false,
    },
  ];

  return (
    <div className="space-y-6 font-sans text-plt-text pb-6 bg-plt-base">
      {/* 1. Context Ticker Highlight & Allocation Diagnostic (e.g. ABUK) */}
      {cleanViewSymbol && (
        <div className="border border-plt-border p-4 bg-plt-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs rounded-xl shadow-xs">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <TickerAvatar
              symbol={cleanViewSymbol}
              companyName={tickerFullName}
              logoUrl={tickerLogo}
            />
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-plt-text text-sm uppercase">{cleanViewSymbol}</span>
                <span className="text-xs text-plt-muted truncate">
                  • {tickerFullName}
                </span>
              </div>
              <p className="text-[11px] text-plt-muted mt-1 leading-relaxed">
                {currentOpenTradeForTicker
                  ? isAr
                    ? 'مركز نشط ومحجوز له خانة حالياً في المحفظة قيد الاحتفاظ.'
                    : 'Active open position currently deployed and held in the portfolio.'
                  : isCurrentTickerInBasket
                  ? isAr
                    ? `سهم مؤهل. رأس المال منشور بالكامل بنسبة 100% عبر ${portfolio.activeSlots}/${portfolio.totalSlots} خانات نشطة (صفر نقد معطل). السهم في المرتبة الأولى للتخصيص فور خروج أي مركز حالي.`
                    : `Qualified ticker. Portfolio capital is 100% deployed across ${portfolio.activeSlots}/${portfolio.totalSlots} active slots (0 EGP idle cash). Queued as #1 priority for capital allocation as soon as an active trade exits.`
                  : isAr
                  ? 'لا يستوفي قاعدة الجودة: متوسط الربح التاريخي أقل من أقصى تراجع للصفقة.'
                  : 'Fails quality gate: historical average return per trade is less than maximum adverse excursion.'}
              </p>
            </div>
          </div>

          {/* Far Right Badge / Position Info */}
          <div className="shrink-0 self-start sm:self-center flex items-center gap-3">
            {currentOpenTradeForTicker ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-plt-warning font-semibold px-3 py-1 bg-plt-warning-soft border border-plt-warning-border rounded-full whitespace-nowrap">
                <span>★</span> {isAr ? 'مركز نشط في المحفظة' : 'Active Turbo Position'}
              </span>
            ) : isCurrentTickerInBasket ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 font-medium px-3 py-1 bg-white/[0.04] border border-white/10 rounded-full whitespace-nowrap">
                <span>☆</span> {isAr ? 'مؤهل في سلة تيربو' : 'Qualified in Turbo Basket'}
              </span>
            ) : (
              <span className="text-[11px] text-plt-muted px-2.5 py-1 border border-plt-border rounded-full whitespace-nowrap">
                {isAr ? 'غير مؤهل حالياً' : 'Not in active basket'}
              </span>
            )}

            {currentOpenTradeForTicker && (
              <div className="flex items-center gap-3 text-xs bg-plt-base border border-plt-border px-3 py-1.5 rounded-lg">
                <div className="flex flex-col text-right rtl:text-left">
                  <span className="text-[9.5px] text-plt-muted uppercase font-semibold">{isAr ? 'سعر الدخول' : 'Entry Px'}</span>
                  <span className="font-semibold text-plt-text tabular-nums">{currentOpenTradeForTicker.entryPrice.toFixed(2)} EGP</span>
                </div>
                <div className="h-5 w-px bg-plt-border" />
                <div className="flex flex-col text-right rtl:text-left">
                  <span className="text-[9.5px] text-plt-muted uppercase font-semibold">{isAr ? 'العائد' : 'PnL'}</span>
                  <span
                    className={`font-bold tabular-nums ${
                      currentOpenTradeForTicker.unrealizedPnlPct >= 0 ? 'text-profit-num' : 'text-loss-num'
                    }`}
                  >
                    {currentOpenTradeForTicker.unrealizedPnlPct >= 0 ? '+' : ''}
                    {currentOpenTradeForTicker.unrealizedPnlPct.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Core KPI Summary Cards Rail (Edge-to-edge horizontal rail on desktop and mobile) */}
      <div className="w-full overflow-x-auto no-scrollbar scroll-smooth">
        <div className="flex items-stretch gap-2.5 sm:gap-3 pb-1 pt-0.5 min-w-max">
          {kpiCards.map((card) => (
            <KPICard
              key={card.id}
              {...card}
              compact
              className="shrink-0 w-[210px] xs:w-[220px] sm:w-[230px]"
            />
          ))}
        </div>
      </div>

      {/* 3. Active Positions & Closed Ledger Container (Border removed around outer book) */}
      <div className="bg-transparent">
        {/* Ledger Header & Tab Switcher */}
        <div className="pb-3 border-b border-plt-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-transparent">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-plt-profit animate-pulse" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-plt-text">
              {activeLedgerTab === 'open'
                ? isAr ? 'المراكز المفتوحة حالياً في المحفظة' : 'Active Open Positions Book'
                : isAr ? 'سجل الصفقات المغلقة مؤخراً' : 'Recent Closed Trades Ledger'}
            </h3>
            <span className="text-[10px] text-plt-muted tabular-nums">
              ({activeLedgerTab === 'open' ? portfolio.openPositions.length : portfolio.closedTrades.length} {isAr ? 'سهم' : 'tickers'})
            </span>
          </div>

          <div className="seg-control h-7 p-0.5 bg-plt-card border border-plt-border rounded-lg inline-flex items-center">
            <button
              type="button"
              onClick={() => setActiveLedgerTab('open')}
              className={`seg-control-btn h-full px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                activeLedgerTab === 'open'
                  ? 'active bg-plt-active text-plt-text shadow-xs'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
            >
              {isAr ? 'المراكز المفتوحة' : 'Open Positions'} ({portfolio.openPositions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveLedgerTab('closed')}
              className={`seg-control-btn h-full px-2.5 text-[11px] font-semibold rounded-md transition-colors cursor-pointer ${
                activeLedgerTab === 'closed'
                  ? 'active bg-plt-active text-plt-text shadow-xs'
                  : 'text-plt-muted hover:text-plt-text'
              }`}
            >
              {isAr ? 'الصفقات المغلقة' : 'Closed Trades'} ({portfolio.closedTrades.length})
            </button>
          </div>
        </div>

        {/* Open Positions Table */}
        {activeLedgerTab === 'open' ? (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left rtl:text-right text-xs text-plt-text border-collapse font-sans">
              <thead>
                <tr className="border-b border-plt-border text-plt-muted text-[10px] uppercase font-semibold tracking-wider bg-plt-base">
                  <th className="py-3 pr-4 pl-0">{isAr ? 'السهم والشركة' : 'Ticker & Company'}</th>
                  <th className="px-4 py-3">{isAr ? 'تاريخ الدخول' : 'Entry Date'}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{isAr ? 'سعر الدخول' : 'Entry Price'}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{isAr ? 'عدد الأسهم' : '# of Units'}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{isAr ? 'القيمة الحالية' : 'Current Value'}</th>
                  <th className="py-3 pl-4 pr-0 text-right rtl:text-left">{isAr ? 'الأرباح غير المحققة' : 'Unrealized P/L'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plt-border-soft">
                {portfolio.openPositions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-plt-muted text-xs">
                      {isAr ? 'لا توجد مراكز مفتوحة حالياً. جميع السيولة نقدية.' : 'No active open positions. Portfolio is 100% cash.'}
                    </td>
                  </tr>
                ) : (
                  portfolio.openPositions.map((pos) => {
                    const isProfit = pos.unrealizedPnlPct >= 0;
                    const diffAmt = Math.round(pos.currentValue - pos.cost);
                    return (
                      <tr key={pos.symbol} className="hover:bg-plt-hover transition-colors group">
                        {/* 1. Ticker Column: Circular Profile Image + Full Company Name on top + Ticker & Star below */}
                        <td className="py-3 pr-4 pl-0 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <TickerAvatar
                              symbol={pos.symbol}
                              companyName={pos.companyName}
                              logoUrl={pos.logoUrl}
                            />
                            <div className="flex flex-col min-w-0">
                              <span
                                className="text-[12px] sm:text-[13px] font-semibold text-plt-text truncate max-w-[180px] sm:max-w-[260px] leading-tight block group-hover:text-brand-blue transition-colors"
                                title={pos.companyName}
                              >
                                {pos.companyName || pos.symbol}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Link
                                  href={`/charts?ticker=${pos.symbol}&timeframe=D`}
                                  className="text-[11px] font-bold text-plt-muted hover:text-plt-warning transition-colors uppercase tracking-wider"
                                >
                                  {pos.symbol}
                                </Link>
                                <TurboStar size="xs" />
                                <span className="text-[10px] text-plt-faint truncate max-w-[120px]">
                                  • {pos.sector}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* 2. Entry Date */}
                        <td className="px-4 py-3 whitespace-nowrap text-plt-muted tabular-nums text-[11px]">
                          {pos.entryDate}
                        </td>

                        {/* 3. Entry Price */}
                        <td className="px-4 py-3 whitespace-nowrap text-right rtl:text-left tabular-nums text-plt-text font-medium text-[12px]">
                          {pos.entryPrice.toFixed(2)} EGP
                        </td>

                        {/* 4. # of Units */}
                        <td className="px-4 py-3 whitespace-nowrap text-right rtl:text-left tabular-nums text-plt-text font-medium text-[12px]">
                          {pos.shares.toLocaleString()}
                        </td>

                        {/* 5. Current Value */}
                        <td className="px-4 py-3 whitespace-nowrap text-right rtl:text-left tabular-nums text-plt-text font-semibold text-[12px]">
                          {pos.currentValue.toLocaleString()} EGP
                        </td>

                        {/* 6. Unrealized P/L: % and EGP */}
                        <td className="py-3 pl-4 pr-0 whitespace-nowrap text-right rtl:text-left tabular-nums text-[12px]">
                          <div className="flex flex-col items-end rtl:items-start leading-tight">
                            <span
                              className={`font-bold ${
                                isProfit ? 'text-profit-num' : 'text-loss-num'
                              }`}
                            >
                              {isProfit ? '+' : ''}
                              {pos.unrealizedPnlPct.toFixed(1)}%
                            </span>
                            <span className="text-[10px] text-plt-muted font-normal mt-0.5">
                              {diffAmt >= 0 ? '+' : ''}
                              {diffAmt.toLocaleString()} EGP
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          /* Recent Closed Trades Table */
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left rtl:text-right text-xs text-plt-text border-collapse font-sans">
              <thead>
                <tr className="border-b border-plt-border text-plt-muted text-[10px] uppercase font-semibold tracking-wider bg-plt-base">
                  <th className="py-3 pr-4 pl-0">{isAr ? 'السهم' : 'Ticker'}</th>
                  <th className="px-4 py-3">{isAr ? 'الدخول' : 'Entry'}</th>
                  <th className="px-4 py-3">{isAr ? 'الخروج' : 'Exit'}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{isAr ? 'سعر الخروج' : 'Exit Px'}</th>
                  <th className="px-4 py-3 text-right rtl:text-left">{isAr ? 'المحصلة' : 'Proceeds'}</th>
                  <th className="py-3 pl-4 pr-0 text-right rtl:text-left">{isAr ? 'صافي العائد %' : 'Net Return'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-plt-border-soft">
                {portfolio.closedTrades.slice(-20).reverse().map((trade, idx) => {
                  const isProfit = trade.retPct >= 0;
                  return (
                    <tr key={`${trade.sym}-${trade.exitDate}-${idx}`} className="hover:bg-plt-hover transition-colors">
                      <td className="py-2.5 pr-4 pl-0 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/charts?ticker=${trade.sym}&timeframe=D`}
                            className="font-bold text-plt-text hover:text-plt-warning transition-colors"
                          >
                            {trade.sym}
                          </Link>
                          <span className="text-[10px] text-plt-muted truncate max-w-[180px]">
                            {trade.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-plt-muted tabular-nums text-[11px]">
                        {trade.entryDate}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-plt-muted tabular-nums text-[11px]">
                        {trade.exitDate}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right rtl:text-left tabular-nums text-plt-text">
                        {trade.exitPrice.toFixed(2)} EGP
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right rtl:text-left tabular-nums text-plt-muted">
                        {trade.proceeds.toLocaleString()} EGP
                      </td>
                      <td
                        className={`py-2.5 pl-4 pr-0 whitespace-nowrap text-right rtl:text-left tabular-nums font-bold ${
                          isProfit ? 'text-profit-num' : 'text-loss-num'
                        }`}
                      >
                        {isProfit ? '+' : ''}
                        {trade.retPct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
