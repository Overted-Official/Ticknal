'use client';

import React from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  ArrowRight,
  ChevronRight,
} from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { type UnifiedLedgerItem } from './types';
import { getCategoryBadgeStyle } from '@/lib/category-colors';

interface TransactionRowItemProps {
  item: UnifiedLedgerItem;
  formatMoney?: (val: number, currency: string, isPositive: boolean) => string;
  onClick: (item: UnifiedLedgerItem) => void;
}

export default function TransactionRowItem({
  item,
  formatMoney,
  onClick,
}: TransactionRowItemProps) {
  const { isPrivacy } = usePrivacyMode();

  const isTransfer = item.type === 'TRANSFER' || item.category.toLowerCase().includes('transfer');
  const isInflow = item.isPositive && !isTransfer;
  const isOutflow = !item.isPositive && !isTransfer;

  // Clear directional icons replacing bank logos
  const renderIcon = () => {
    if (isTransfer) {
      return <ArrowRightLeft className="w-4 h-4 text-sky-400" />;
    }
    if (isInflow) {
      return <ArrowDownLeft className="w-4 h-4 text-profit-num" />;
    }
    return <ArrowUpRight className="w-4 h-4 text-loss-num" />;
  };

  const iconBg = () => {
    if (isTransfer) {
      return 'bg-sky-500/10 border-sky-500/25';
    }
    if (isInflow) {
      return 'bg-profit-num/15 border-profit-num/30';
    }
    return 'bg-loss-chart/15 border-loss-chart/30';
  };

  // Formatter for Date: e.g. "2026-09-03" -> "Sep 3, 2026"
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.slice(0, 10).split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const m = monthNames[Number(month) - 1] || month;
      return `${m} ${Number(day)}, ${year}`;
    }
    return dateStr;
  };

  // Note text resolution
  const noteText = item.notes?.trim() || item.title?.trim() || item.category || 'Transaction';

  // Formatter for Value
  const formattedValue = () => {
    if (isPrivacy) return `•••••• ${item.currency === 'USD' ? '$' : '£'}`;
    const formatted = Math.abs(item.amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const unit = item.currency === 'USD' ? '$' : '£';
    if (isTransfer) return `${formatted} ${unit}`;
    const sign = isInflow ? '+' : '-';
    return `${sign}${formatted} ${unit}`;
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(item);
        }
      }}
      className="py-2.5 px-2 flex items-center justify-between hover:bg-surface-active/30 transition-colors group cursor-pointer border-b border-border-subtle/80 outline-none select-none gap-3"
    >
      {/* Left: Directional Icon + Note & Category • Account */}
      <div className="flex items-center gap-2.5 min-w-0 pr-1 flex-1">
        {/* Clear Directional Icon Avatar */}
        <div
          className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 shadow-xs ${iconBg()}`}
        >
          {renderIcon()}
        </div>

        {/* Note (Top) & Category • Account (Bottom) */}
        <div className="min-w-0 flex-1">
          {/* Note row */}
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium text-text-primary truncate max-w-[140px] sm:max-w-[200px] md:max-w-[280px] group-hover:text-brand-blue transition-colors">
              {noteText}
            </span>
            {item.tradeDetails && (
              <span
                className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold border shrink-0 ${
                  item.tradeDetails.side === 'BUY'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                }`}
              >
                {item.tradeDetails.side}
              </span>
            )}
          </div>

          {/* Category • Account row */}
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border select-none transition-colors shrink-0"
              style={getCategoryBadgeStyle(item.category)}
            >
              {item.category}
            </span>
            <span className="text-zinc-600 text-xs select-none">·</span>
            {isTransfer && item.toAccountName ? (
              <div className="flex items-center gap-1 text-[11px] text-text-muted font-normal truncate min-w-0">
                <span className="text-text-primary/90 font-medium truncate max-w-[110px] sm:max-w-[150px]" title={item.accountName}>
                  {item.accountName}
                </span>
                <ArrowRight className="w-3 h-3 text-sky-400 shrink-0 mx-0.5" />
                <span className="text-sky-300 font-medium truncate max-w-[110px] sm:max-w-[150px]" title={item.toAccountName}>
                  {item.toAccountName}
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-text-muted font-normal truncate" title={item.accountName}>
                {item.accountName}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Value (Top) & Date (Bottom) */}
      <div className="flex items-center gap-2.5 shrink-0 text-right">
        <div>
          <div
            className={`text-[13px] sm:text-sm font-semibold tabular-nums ${
              isTransfer
                ? 'text-text-primary'
                : isInflow
                ? 'text-profit-num'
                : 'text-loss-num'
            }`}
          >
            {formattedValue()}
          </div>
          <div className="text-[11px] text-text-muted font-normal tabular-nums mt-0.5">
            {formatDate(item.date)}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted/40 group-hover:text-text-primary transition-colors shrink-0" />
      </div>
    </div>
  );
}
