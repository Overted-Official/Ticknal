'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { ChevronRight, ChevronDown, ChevronUp, Plus } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type HomeInvestmentOrder } from '../homeInvestmentsTypes';
import { type Opportunity } from '@/components/platform/OpportunityTable';
import PositionRowItem from './PositionRowItem';
import TickerPositionsDrawer from './TickerPositionsDrawer';
import CloseOrderModal from '@/components/platform/CloseOrderModal';
import AddOrderModal, { type InitialOrderData } from '@/components/platform/AddOrderModal';
import QuickAddDrawer from '@/components/platform/QuickAddDrawer';
import { useGuestGuard } from '@/context/GuestGuardContext';

interface MyPositionsSectionProps {
  orders: HomeInvestmentOrder[];
  totalMarketValue: number;
  exitSignals?: Opportunity[];
}

export default function MyPositionsSection({
  orders = [],
  totalMarketValue = 0,
  exitSignals = [],
}: MyPositionsSectionProps) {
  const router = useRouter();
  const { isPrivacy } = usePrivacyMode();
  const { isGuest, requireAuth } = useGuestGuard();
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  const [activeTickerOrder, setActiveTickerOrder] = useState<HomeInvestmentOrder | null>(null);
  const [orderToClose, setOrderToClose] = useState<{
    id: number;
    tickerSymbol: string;
    quantity: number;
    currentPrice: number;
    currency: string;
    accountId?: number | null;
  } | null>(null);
  const [orderToAdd, setOrderToAdd] = useState<InitialOrderData | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const handleAddPositionClick = (e: React.MouseEvent) => {
    if (isGuest) {
      if (
        !requireAuth(
          e,
          'Portfolio Orders',
          'Unlock Portfolio Trading',
          'Create a free account to track buy & sell orders, sync cash balances, and monitor your realized gains.'
        )
      ) {
        return;
      }
    }
    setIsQuickAddOpen(true);
  };

  const handleTickerClick = (order: HomeInvestmentOrder) => {
    setActiveTickerOrder(order);
  };

  const handleBuyClick = (order: HomeInvestmentOrder) => {
    setOrderToAdd({
      symbol: order.tickerSymbol,
      companyName: order.companyName,
      logoUrl: order.logoUrl,
      currency: order.currency,
      price: order.currentPrice,
    });
  };

  const handleSellClick = (order: {
    id: number;
    tickerSymbol: string;
    quantity: number;
    currentPrice: number;
    currency: string;
    accountId?: number | null;
  }) => {
    setOrderToClose({
      id: order.id,
      tickerSymbol: order.tickerSymbol,
      quantity: order.quantity,
      currentPrice: order.currentPrice,
      currency: order.currency,
      accountId: order.accountId,
    });
  };

  const handleCloseSuccess = () => {
    setActiveTickerOrder(null);
    router.refresh();
  };

  const defaultCurrency = isArabic ? 'ج.م' : '£';

  // Format currency with privacy masking support
  const formatMoney = (value: number, showSign: boolean = false, currency: string = defaultCurrency): string => {
    const cur = currency === '£' && isArabic ? 'ج.م' : currency;
    if (isPrivacy) {
      if (value === 0) return `•••••• ${cur}`;
      const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
      return `${sign}•••••• ${cur}`;
    }
    if (value === 0) return `0.0 ${cur}`;
    const formatted = Math.abs(value).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    const sign = showSign && value > 0 ? '+' : value < 0 ? '-' : '';
    return `${sign}${formatted} ${cur}`;
  };

  // Map exit signals by symbol for fast lookup
  const exitSignalsMap = useMemo(() => {
    const map = new Map<string, Opportunity>();
    for (const sig of exitSignals) {
      const sym = sig.symbol.replace('.CA', '').trim().toUpperCase();
      map.set(sym, sig);
    }
    return map;
  }, [exitSignals]);

  // Gainers: open orders with profitLoss > 0, sorted descending by profitLossPct
  const gainers = useMemo(() => {
    return [...orders]
      .filter((o) => o.profitLoss > 0)
      .sort((a, b) => b.profitLossPct - a.profitLossPct);
  }, [orders]);

  // Losers: open orders with profitLoss <= 0, sorted ascending by profitLossPct
  const losers = useMemo(() => {
    return [...orders]
      .filter((o) => o.profitLoss <= 0)
      .sort((a, b) => a.profitLossPct - b.profitLossPct);
  }, [orders]);

  const [showAllGainers, setShowAllGainers] = useState(false);
  const [showAllLosers, setShowAllLosers] = useState(false);
  const [mobileTab, setMobileTab] = useState<'gainers' | 'losers'>('gainers');
  const INITIAL_ROWS = 5;

  const visibleGainers = showAllGainers ? gainers : gainers.slice(0, INITIAL_ROWS);
  const visibleLosers = showAllLosers ? losers : losers.slice(0, INITIAL_ROWS);

  const renderGainersList = () => (
    <div className="flex flex-col">
      <div className="hidden md:flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
        <div className="flex items-center gap-1 text-base font-bold text-text-primary">
          <span>{isArabic ? 'الأسهم الرابحة' : 'Stock gainers'}</span>
        </div>
        <span className="text-[11px] text-text-muted font-medium">
          {isArabic ? `${gainers.length} رابحة` : `${gainers.length} gainers`}
        </span>
      </div>

      <div className="divide-y divide-border-subtle/70">
        {gainers.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-xs">
            {isArabic ? 'لا توجد مراكز بعائد إيجابي حالياً.' : 'No positive return positions currently.'}
          </div>
        ) : (
          visibleGainers.map((order) => (
            <PositionRowItem
              key={order.id}
              order={order}
              totalMarketValue={totalMarketValue}
              formatMoney={formatMoney}
              isPrivacy={isPrivacy}
              exitSignal={exitSignalsMap.get(
                order.tickerSymbol.replace('.CA', '').trim().toUpperCase()
              )}
              onTickerClick={handleTickerClick}
              onSellClick={handleSellClick}
              onBuyClick={handleBuyClick}
            />
          ))
        )}
      </div>

      {gainers.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setShowAllGainers((prev) => !prev)}
          className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-surface-raised hover:bg-surface-hover-raised text-text-muted hover:text-text-primary border border-border-subtle text-xs font-medium font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
        >
          <span>
            {showAllGainers
              ? (isArabic ? 'عرض أفضل 5 رابحة' : 'Show top 5 gainers')
              : (isArabic ? `عرض جميع الرابحة (${gainers.length})` : `Show all ${gainers.length} gainers`)}
          </span>
          {showAllGainers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );

  const renderLosersList = () => (
    <div className="flex flex-col">
      <div className="hidden md:flex items-center justify-between pb-2 mb-1 border-b border-border-subtle">
        <div className="flex items-center gap-1 text-base font-bold text-text-primary">
          <span>{isArabic ? 'الأسهم الخاسرة' : 'Stock losers'}</span>
        </div>
        <span className="text-[11px] text-text-muted font-medium">
          {isArabic ? `${losers.length} مراكز` : `${losers.length} holdings`}
        </span>
      </div>

      <div className="divide-y divide-border-subtle/70">
        {losers.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-xs">
            {isArabic ? 'لا توجد مراكز متراجعة حالياً.' : 'No declining positions currently.'}
          </div>
        ) : (
          visibleLosers.map((order) => (
            <PositionRowItem
              key={order.id}
              order={order}
              totalMarketValue={totalMarketValue}
              formatMoney={formatMoney}
              isPrivacy={isPrivacy}
              exitSignal={exitSignalsMap.get(
                order.tickerSymbol.replace('.CA', '').trim().toUpperCase()
              )}
              onTickerClick={handleTickerClick}
              onSellClick={handleSellClick}
              onBuyClick={handleBuyClick}
            />
          ))
        )}
      </div>

      {losers.length > INITIAL_ROWS && (
        <button
          type="button"
          onClick={() => setShowAllLosers((prev) => !prev)}
          className="w-full mt-2.5 py-1.5 px-3 rounded-lg bg-surface-raised hover:bg-surface-hover-raised text-text-muted hover:text-text-primary border border-border-subtle text-xs font-medium font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
        >
          <span>
            {showAllLosers
              ? (isArabic ? 'عرض أكثر 5 خاسرة' : 'Show top 5 losers')
              : (isArabic ? `عرض جميع الخاسرة (${losers.length})` : `Show all ${losers.length} holdings`)}
          </span>
          {showAllLosers ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );

  return (
    <section id="section-my-positions" className="section-container section-viewport-fit space-y-4 relative">
      {/* Anchor alias for KPI card scroll targets */}
      <span id="section-active-positions" className="sr-only pointer-events-none absolute -top-24" />

      {/* 1. Header Row */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 pb-2 border-b border-border-subtle">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <h2 className="section-title">
              {isArabic ? 'الصفقات' : 'Positions'}
            </h2>
            <span className="badge-count">
              {orders.length}
            </span>
          </div>
          <p className="section-subtitle">
            {isArabic
              ? 'مراكز المحفظة المفتوحة مصنفة حسب الأداء ومؤشرات المخاطر'
              : 'Live open market holdings segmented by performance and risk triggers'}
          </p>
        </div>

        {/* Right side: Total Value + Add Position Button (Desktop/Tablet) */}
        <div className="hidden md:flex items-center gap-4 shrink-0">
          <div className="text-xs text-text-muted">
            {isArabic ? 'إجمالي القيمة السوقية:' : 'Total Market Value:'}{' '}
            <span className="text-text-primary font-semibold tabular-nums">
              {formatMoney(totalMarketValue)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleAddPositionClick}
            className="btn-primary-cta cursor-pointer"
            title={isArabic ? 'إضافة صفقة جديدة' : 'Add a new position'}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isArabic ? 'إضافة صفقة' : 'Add Position'}</span>
          </button>
        </div>
      </div>

      {/* Mobile: Total Value row, Add Position button full width FIRST, Switcher full width SECOND */}
      <div className="flex flex-col gap-2 md:hidden">
        <div className="text-xs text-text-muted flex items-center justify-between">
          <span>{isArabic ? 'إجمالي القيمة السوقية:' : 'Total Market Value:'}</span>
          <span className="text-text-primary font-semibold tabular-nums">
            {formatMoney(totalMarketValue)}
          </span>
        </div>

        {/* 1. Add Position Button - Full Width First */}
        <button
          type="button"
          onClick={handleAddPositionClick}
          className="btn-primary-cta w-full justify-center py-2 text-xs font-semibold cursor-pointer"
          title={isArabic ? 'إضافة صفقة جديدة' : 'Add a new position'}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isArabic ? 'إضافة صفقة' : 'Add Position'}</span>
        </button>

        {/* 2. Switcher Button - Full Width Second */}
        {orders.length > 0 && (
          <div className="seg-control w-full grid grid-cols-2 text-center">
            <button
              type="button"
              onClick={() => setMobileTab('gainers')}
              className={`seg-control-btn w-full justify-center gap-1.5 ${
                mobileTab === 'gainers' ? 'seg-control-btn-active' : ''
              }`}
            >
              <span>{isArabic ? 'الرابحة' : 'Gainers'}</span>
              <span className="text-[11px] opacity-75 tabular-nums">({gainers.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setMobileTab('losers')}
              className={`seg-control-btn w-full justify-center gap-1.5 ${
                mobileTab === 'losers' ? 'seg-control-btn-active' : ''
              }`}
            >
              <span>{isArabic ? 'الخاسرة' : 'Losers'}</span>
              <span className="text-[11px] opacity-75 tabular-nums">({losers.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Main Content */}
      <div className="flex-1 min-h-0 w-full overflow-y-auto custom-scrollbar">
        {orders.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center text-text-muted text-xs">
            <span>{isArabic ? 'لا توجد مراكز نشطة حالياً في المحفظة.' : 'No active holdings currently in portfolio.'}</span>
          </div>
        ) : (
          <>
            {/* Mobile View: Renders only the selected tab */}
            <div className="md:hidden">
              {mobileTab === 'gainers' ? renderGainersList() : renderLosersList()}
            </div>

            {/* Desktop View: 2 columns side-by-side */}
            <div className="hidden md:grid md:grid-cols-2 gap-6 lg:gap-8">
              {renderGainersList()}
              {renderLosersList()}
            </div>
          </>
        )}

        {/* Section Footer: View full transactions log link + total count */}
        {orders.length > 0 && (
          <div className="pt-3 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-border-subtle/60">
            <Link
              href="/wallet?tab=positions"
              className="text-xs font-semibold text-brand-blue hover:text-brand-blue-light inline-flex items-center gap-1 transition-colors"
            >
              {isArabic ? 'عرض سجل صفقات المحفظة' : 'View positions transactions log'}
              <ChevronRight className={`w-3.5 h-3.5 ${isArabic ? 'rotate-180' : ''}`} />
            </Link>
            <span className="text-[11px] text-text-muted">
              {isArabic
                ? `عرض ${visibleGainers.length + visibleLosers.length} من إجمالي ${orders.length} مركزاً`
                : `Showing ${visibleGainers.length + visibleLosers.length} of ${orders.length} total holdings`}
            </span>
          </div>
        )}
      </div>

      {/* Ticker Positions & Orders Slide-over Drawer */}
      <TickerPositionsDrawer
        isOpen={!!activeTickerOrder}
        onClose={() => setActiveTickerOrder(null)}
        order={activeTickerOrder}
        exitSignal={
          activeTickerOrder
            ? exitSignalsMap.get(
                activeTickerOrder.tickerSymbol.replace('.CA', '').trim().toUpperCase()
              )
            : undefined
        }
        onPositionsChanged={handleCloseSuccess}
      />

      {/* Close/Sell Order Modal */}
      <CloseOrderModal
        isOpen={!!orderToClose}
        onClose={() => setOrderToClose(null)}
        onSuccess={handleCloseSuccess}
        order={orderToClose}
      />

      {/* Add/Buy Position Modal */}
      <AddOrderModal
        isOpen={!!orderToAdd}
        onClose={() => setOrderToAdd(null)}
        initialData={orderToAdd ?? undefined}
        onSuccess={() => {
          setOrderToAdd(null);
          router.refresh();
        }}
      />

      {/* Quick Add Position Drawer */}
      <QuickAddDrawer
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        initialMode="position"
        onSuccess={() => {
          setIsQuickAddOpen(false);
          router.refresh();
        }}
      />
    </section>
  );
}
