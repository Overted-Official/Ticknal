'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { type HomeInvestmentOrder } from '../homeInvestmentsTypes';
import { type Opportunity } from '@/components/platform/OpportunityTable';

interface PositionRowItemProps {
  order: HomeInvestmentOrder;
  totalMarketValue: number;
  formatMoney: (val: number, showSign?: boolean, currency?: string) => string;
  isPrivacy: boolean;
  exitSignal?: Opportunity;
  showDetails?: boolean;
  onTickerClick: (order: HomeInvestmentOrder) => void;
  onSellClick: (order: HomeInvestmentOrder) => void;
  onBuyClick?: (order: HomeInvestmentOrder) => void;
}

export default function PositionRowItem({
  order,
  totalMarketValue,
  formatMoney,
  isPrivacy,
  exitSignal,
  showDetails = false,
  onTickerClick,
  onSellClick,
  onBuyClick,
}: PositionRowItemProps) {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [imgError, setImgError] = useState(false);
  const positionVal = order.currentPrice * order.quantity;
  const weightPct = totalMarketValue > 0 ? (order.marketValueEgp / totalMarketValue) * 100 : 0;
  const isPositive = order.profitLoss >= 0;
  const cleanSymbol = order.tickerSymbol.replace('.CA', '').trim().toUpperCase();
  const initial = cleanSymbol.slice(0, 2);

  const signalType = exitSignal?.signal?.signal;
  const isSell = signalType === 'SELL';
  const isBuy = signalType === 'BUY';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onTickerClick(order)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTickerClick(order);
        }
      }}
      className={`py-2.5 px-1.5 flex items-center justify-between hover:bg-surface-active/30 transition-colors group cursor-pointer border-b border-border-subtle/80 outline-none select-none ${
        isSell ? 'bg-rose-500/[0.03]' : isBuy ? 'bg-emerald-500/[0.02]' : ''
      }`}
    >
      {/* Left: Circular Avatar + Stacked Name & Ticker */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1.5 sm:pr-2">
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs ${
            isSell
              ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
              : isBuy
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-surface-active text-text-primary/90 border-white/5'
          }`}
        >
          {order.logoUrl && !imgError ? (
            <img
              src={order.logoUrl}
              alt={order.tickerSymbol}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[13px] font-medium text-text-primary truncate group-hover:text-brand-blue transition-colors">
              {order.companyName || cleanSymbol}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="badge-symbol">
              {cleanSymbol}
            </span>
            <span className="text-[11px] text-text-muted font-normal truncate">
              · {order.quantity.toLocaleString(isArabic ? 'ar-EG' : 'en-US')} {isArabic ? 'سهم' : 'shares'}
              {showDetails ? ` @ ${order.entryPrice.toFixed(2)} ${order.currency === '£' && isArabic ? 'ج.م' : order.currency}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Value + P/L Metrics + Dynamic Action Status Button */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-1.5 sm:pl-2 rtl:pl-0 rtl:pr-1.5 sm:rtl:pr-2">
        <div className="text-right rtl:text-left flex flex-col items-end rtl:items-start">
          <div className="text-[13px] font-semibold text-text-primary tabular-nums">
            {formatMoney(positionVal, false, order.currency)}
          </div>
          <div className="text-[11px] font-medium tabular-nums text-right rtl:text-left mt-0.5 flex items-center justify-end rtl:justify-start gap-1.5 whitespace-nowrap">
            <span className="text-text-muted">{weightPct.toFixed(1)}%</span>
            <span className="text-text-faint">·</span>
            <span
              className={`font-semibold ${
                isPositive ? 'text-profit-chart' : 'text-loss-chart'
              }`}
            >
              {formatMoney(order.profitLoss, true, order.currency)} ({isPositive ? '+' : ''}
              {order.profitLossPct.toFixed(1)}%)
            </span>
          </div>
        </div>

        {/* Dynamic Action Status Button: Buy / Hold / Sell */}
        <div className="w-[58px] sm:w-[68px] shrink-0 flex justify-end rtl:justify-start">
          {isSell ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSellClick(order);
              }}
              className="w-[56px] sm:w-[64px] py-1 text-center rounded-[6px] text-xs font-semibold transition-all cursor-pointer shadow-xs bg-loss-chart text-white hover:bg-loss-hover animate-pulse"
              title={isArabic ? 'إغلاق أو تخفيض المركز' : 'Sell or close position'}
            >
              {isArabic ? 'بيع' : 'Sell'}
            </button>
          ) : isBuy ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onBuyClick) {
                  onBuyClick(order);
                } else {
                  onTickerClick(order);
                }
              }}
              className="w-[56px] sm:w-[64px] py-1 text-center rounded-[6px] text-xs font-semibold transition-all cursor-pointer shadow-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white"
              title={isArabic ? 'إضافة إلى المركز' : 'Add to position'}
            >
              {isArabic ? 'شراء' : 'Buy'}
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTickerClick(order);
              }}
              className="w-[56px] sm:w-[64px] py-1 text-center rounded-[6px] text-xs font-medium transition-all cursor-pointer shadow-xs bg-white/[0.04] text-zinc-300 border border-white/10 hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
              title={isArabic ? 'مركز نشط - عرض التفاصيل' : 'Active position - View details'}
            >
              {isArabic ? 'احتفاظ' : 'Hold'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
