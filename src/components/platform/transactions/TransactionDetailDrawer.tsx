'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Edit2,
  Trash2,
  Calendar,
  Landmark,
  Tag,
  FileText,
  TrendingUp,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRight,
  ExternalLink,
} from '@/components/ui/icon-library';
import Link from 'next/link';
import { type UnifiedLedgerItem } from './types';
import { type BankTransaction } from '@/types/bank';

export interface TransactionDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  item: UnifiedLedgerItem | null;
  onEdit: (tx: BankTransaction) => void;
  onDelete: (id: number) => void;
  formatMoney: (val: number, currency: string, isPositive: boolean) => string;
}

export default function TransactionDetailDrawer({
  isOpen,
  onClose,
  item,
  onEdit,
  onDelete,
  formatMoney,
}: TransactionDetailDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const handleDelete = async () => {
    if (!item) return;
    if (confirm('Are you sure you want to delete this transaction?')) {
      setIsDeleting(true);
      try {
        await onDelete(item.originalId);
        onClose();
      } finally {
        setIsDeleting(false);
      }
    }
  };

  return (
    <>
      {createPortal(
        <AnimatePresence mode="wait">
          {isOpen && item && (
            <div
              key="transaction-detail-drawer-overlay"
              className="fixed inset-0 z-[70] flex items-end md:items-center justify-end overflow-hidden select-none pointer-events-auto"
            >
              {/* Backdrop */}
              <motion.div
                key="transaction-detail-drawer-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                aria-label="Close drawer overlay"
              />

              {/* Drawer Sheet */}
              <motion.div
                key="transaction-detail-drawer-sheet"
                initial={isMobile ? { y: '100%' } : { x: '100%' }}
                animate={isMobile ? { y: 0 } : { x: 0 }}
                exit={isMobile ? { y: '100%' } : { x: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 260 }}
                className="drawer-sheet"
              >
                {/* Header */}
                <div className="drawer-header">
                  {/* Mobile Drag Pill */}
                  <div
                    className="md:hidden w-full flex items-center justify-center pb-2 cursor-pointer"
                    onClick={onClose}
                  >
                    <div className="drawer-drag-pill" />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full border border-white/10 bg-surface-raised flex items-center justify-center font-bold text-xs shrink-0">
                        {item.kind === 'trade' ? (
                          <TrendingUp className="w-4 h-4 text-brand-blue" />
                        ) : item.type === 'TRANSFER' ? (
                          <ArrowRightLeft className="w-4 h-4 text-sky-400" />
                        ) : item.isPositive ? (
                          <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4 text-rose-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-text-primary truncate">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-text-muted">
                          {item.accountName} · {item.date}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={onClose}
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-active transition-colors"
                      title="Close drawer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {/* Amount Hero Card */}
                  <div className="p-4 rounded-xl bg-surface-raised border border-border-subtle flex flex-col items-center justify-center text-center">
                    <span className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-1">
                      {item.type.replace(/_/g, ' ')}
                    </span>
                    <div
                      className={`text-2xl font-bold tabular-nums ${
                        item.type === 'TRANSFER'
                          ? 'text-text-primary'
                          : item.isPositive
                          ? 'text-profit-num'
                          : 'text-loss-num'
                      }`}
                    >
                      {formatMoney(item.amount, item.currency, item.isPositive)}
                    </div>
                  </div>

                  {/* Metadata Cards */}
                  <div className="space-y-2">
                    {/* Account / Transfer Route */}
                    <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Landmark className="w-3.5 h-3.5" />
                        <span>{item.toAccountName ? 'Transfer Route' : 'Account'}</span>
                      </div>
                      {item.toAccountName ? (
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className="text-text-primary">{item.accountName}</span>
                          <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                          <span className="text-sky-400">{item.toAccountName}</span>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-text-primary">
                          {item.accountName}
                        </span>
                      )}
                    </div>

                    {/* Category */}
                    <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Category</span>
                      </div>
                      <span className="badge-symbol">
                        {item.category}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Transaction Date</span>
                      </div>
                      <span className="text-xs font-medium text-text-primary">
                        {item.date}
                      </span>
                    </div>

                    {/* Trade Specific Details */}
                    {item.tradeDetails && (
                      <>
                        <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 flex items-center justify-between">
                          <span className="text-xs text-text-muted">Side &amp; Shares</span>
                          <span className="text-xs font-semibold text-text-primary">
                            {item.tradeDetails.side} {item.tradeDetails.quantity.toLocaleString()} shares
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 flex items-center justify-between">
                          <span className="text-xs text-text-muted">Entry &amp; Exit Price</span>
                          <span className="text-xs font-medium text-text-primary tabular-nums">
                            {item.tradeDetails.entryPrice.toFixed(2)} → {item.tradeDetails.exitPrice.toFixed(2)} £
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 flex items-center justify-between">
                          <span className="text-xs text-text-muted">Realized P/L</span>
                          <span className={`text-xs font-bold tabular-nums ${item.tradeDetails.realizedPnl >= 0 ? 'text-profit-num' : 'text-loss-num'}`}>
                            {item.tradeDetails.realizedPnl >= 0 ? '+' : ''}{item.tradeDetails.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} £ ({item.tradeDetails.realizedPnlPct >= 0 ? '+' : ''}{item.tradeDetails.realizedPnlPct.toFixed(1)}%)
                          </span>
                        </div>
                        {item.tickerSymbol && (
                          <div className="pt-1">
                            <Link
                              href={`/charts?ticker=${item.tickerSymbol.replace('.CA', '')}`}
                              className="w-full py-2 px-3 rounded-lg border border-brand-blue/30 bg-brand-blue/10 text-brand-blue text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-brand-blue/20 transition-colors"
                            >
                              <span>Analyze {item.tickerSymbol} Chart</span>
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        )}
                      </>
                    )}

                    {/* Notes */}
                    {item.notes && (
                      <div className="p-3 rounded-lg bg-surface-raised/50 border border-border-subtle/60 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-text-muted">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Notes</span>
                        </div>
                        <p className="text-xs text-text-primary whitespace-pre-wrap pl-5">
                          {item.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions (Only for bank transactions) */}
                {item.kind === 'transaction' && item.rawTransaction && (
                  <div className="p-4 border-t border-border-subtle bg-surface-raised/40 flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (item.rawTransaction) onEdit(item.rawTransaction);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl border border-white/10 bg-surface-raised hover:bg-surface-active text-text-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Details</span>
                    </button>

                    <button
                      type="button"
                      disabled={isDeleting}
                      onClick={handleDelete}
                      className="py-2 px-3 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
