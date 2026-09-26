'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from 'recharts';
import { Check, Landmark, Plus, Trash2, Wallet, X } from '@/components/ui/icon-library';
import { usePrivacyMode } from '@/hooks/usePrivacyMode';
import { useToast } from '@/context/ToastContext';
import { isBrokerageAccount } from '@/lib/portfolio-finance';
import { type BankAccount, type BankMonthlySnapshot } from '@/types/bank';

interface AccountBalanceHistoryDrawerProps {
  account: BankAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
}

type SnapshotEntry = Pick<BankMonthlySnapshot, 'yearMonth' | 'closingBalance'> & {
  id?: number;
};

type SnapshotResponse = {
  snapshots?: Array<{
    id?: number;
    yearMonth: string;
    closingBalance: number | string;
  }>;
  error?: string;
};

type BalanceChartPoint = {
  yearMonth: string;
  label: string;
  balance: number;
};

const todayYearMonth = () => new Date().toISOString().slice(0, 7);

function monthLabel(yearMonth: string): string {
  const date = new Date(`${yearMonth}-01T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return yearMonth;
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function formatCompact(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (absolute >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

export default function AccountBalanceHistoryDrawer({
  account,
  isOpen,
  onClose,
  onSaved,
}: AccountBalanceHistoryDrawerProps) {
  const { isPrivacy } = usePrivacyMode();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [yearMonth, setYearMonth] = useState(todayYearMonth);
  const [closingBalance, setClosingBalance] = useState('');
  const [useLatestAsCurrent, setUseLatestAsCurrent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = account?.currency === 'USD' ? '$' : '£';

  const formatBalance = (value: number | string) => {
    if (isPrivacy) return `•••••• ${currencySymbol}`;
    return `${Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} ${currencySymbol}`;
  };

  const chartData = useMemo<BalanceChartPoint[]>(
    () =>
      snapshots
        .map((snapshot) => ({
          yearMonth: snapshot.yearMonth,
          label: monthLabel(snapshot.yearMonth),
          balance: Number(snapshot.closingBalance) || 0,
        }))
        .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth)),
    [snapshots]
  );

  useEffect(() => {
    const mountFrame = window.requestAnimationFrame(() => setMounted(true));
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.cancelAnimationFrame(mountFrame);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !account) return;

    const controller = new AbortController();
    const resetFrame = window.requestAnimationFrame(() => {
      setIsLoading(true);
      setSnapshots([]);
      setYearMonth(todayYearMonth());
      setClosingBalance(String(Number(account.balance) || 0));
      setUseLatestAsCurrent(false);
    });

    fetch(`/api/banks/snapshots?accountId=${account.id}`, { signal: controller.signal })
      .then(async (response) => {
        const data = (await response.json()) as SnapshotResponse;
        if (!response.ok) throw new Error(data.error || 'Failed to load balance history');
        return data;
      })
      .then((data) => {
        const loaded = Array.isArray(data.snapshots)
          ? data.snapshots.map((snapshot) => ({
              id: snapshot.id,
              yearMonth: snapshot.yearMonth,
              closingBalance: snapshot.closingBalance,
            }))
          : [];
        setSnapshots(loaded);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        toast.error('History unavailable', 'Could not load this account’s balance history.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => {
      window.cancelAnimationFrame(resetFrame);
      controller.abort();
    };
  }, [account, isOpen, toast]);

  async function persistSnapshots(nextSnapshots: SnapshotEntry[], updateCurrentBalance = false) {
    if (!account) return false;

    const response = await fetch('/api/banks/snapshots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accountId: account.id,
        snapshots: nextSnapshots.map((snapshot) => ({
          yearMonth: snapshot.yearMonth,
          closingBalance: Number(snapshot.closingBalance),
        })),
        updateCurrentBalance,
      }),
    });

    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error || 'Failed to save balance history');
    setSnapshots(nextSnapshots);
    await onSaved?.();
    return true;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account) return;

    const normalizedMonth = yearMonth.trim();
    const numericBalance = Number(closingBalance);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(normalizedMonth)) {
      toast.error('Invalid month', 'Choose a valid month for this balance snapshot.');
      return;
    }
    if (!Number.isFinite(numericBalance)) {
      toast.error('Invalid balance', 'Enter a valid account balance.');
      return;
    }

    const nextSnapshots = [
      ...snapshots.filter((snapshot) => snapshot.yearMonth !== normalizedMonth),
      { yearMonth: normalizedMonth, closingBalance: numericBalance },
    ].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    setIsSubmitting(true);
    try {
      await persistSnapshots(nextSnapshots, useLatestAsCurrent);
      toast.success('Balance recorded', `${monthLabel(normalizedMonth)} is now part of the account history.`);
    } catch (error) {
      console.error('Failed to save account balance history:', error);
      toast.error('Could not save balance', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(yearMonthToDelete: string) {
    const nextSnapshots = snapshots.filter((snapshot) => snapshot.yearMonth !== yearMonthToDelete);
    setIsSubmitting(true);
    try {
      await persistSnapshots(nextSnapshots);
      toast.success('Snapshot removed', `${monthLabel(yearMonthToDelete)} was removed from the history.`);
    } catch (error) {
      console.error('Failed to delete account balance snapshot:', error);
      toast.error('Could not remove snapshot', 'Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const renderTooltip = ({ active, payload }: TooltipContentProps) => {
    if (!active || !payload?.length) return null;
    const point = payload[0]?.payload as BalanceChartPoint | undefined;
    if (!point) return null;

    return (
      <div className="space-y-1 border border-border-default bg-surface-base px-3 py-2 text-xs font-sans shadow-2xl">
        <div className="border-b border-border-default pb-1 text-[11px] font-medium text-text-muted">
          {point.label}
        </div>
        <div className="flex items-center justify-between gap-4 text-profit-chart">
          <span>Closing balance</span>
          <strong className="tabular-nums text-text-primary">
            {isPrivacy ? `•••••• ${currencySymbol}` : formatBalance(point.balance)}
          </strong>
        </div>
      </div>
    );
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && account && (
        <div key="account-balance-history-drawer" className="drawer-overlay">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="drawer-backdrop"
            onClick={onClose}
            aria-label="Close balance history drawer"
          />

          <motion.aside
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className={`drawer-sheet ${!isMobile ? 'drawer-sheet-viewport-safe' : ''}`}
            aria-label={`${account.accountName} balance history`}
          >
            <div className="drawer-brand-hairline" />
            <div className="drawer-header">
              <div className="drawer-drag-pill-container" onClick={onClose}>
                <div className="drawer-drag-pill" />
              </div>
              <div className="drawer-header-row">
                <div className="drawer-header-brand">
                  <div className="drawer-header-icon-box">
                    {isBrokerageAccount(account) ? (
                      <Wallet className="drawer-header-icon !text-accent-orange" />
                    ) : (
                      <Landmark className="drawer-header-icon !text-profit-chart" />
                    )}
                  </div>
                  <div className="drawer-header-titles">
                    <h2 className="drawer-title">
                      {account.accountName}
                    </h2>
                    <p className="drawer-subtitle">
                      {account.bankName || account.customBankName || 'Account'} · Balance history
                    </p>
                  </div>
                </div>
                <button type="button" onClick={onClose} className="drawer-close-btn" aria-label="Close drawer">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="drawer-body custom-scrollbar space-y-5">
              <div className="flex items-end justify-between gap-4 border-b border-border-default pb-4">
                <div>
                  <p className="field-label uppercase tracking-wide">Current balance</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-text-primary">
                    {formatBalance(account.balance)}
                  </p>
                </div>
                <span className="border border-border-default px-2 py-1 text-[10px] font-semibold text-text-muted">
                  {account.currency}
                </span>
              </div>

              <section className="space-y-2" aria-labelledby="balance-history-chart-title">
                <div className="flex items-center justify-between gap-3">
                  <div>
                      <h3 id="balance-history-chart-title" className="text-sm font-semibold text-text-primary">
                        Historical balance
                      </h3>
                      <p className="text-[11px] text-text-muted">Month-end snapshots you record manually</p>
                    </div>
                  {chartData.length > 0 && (
                    <span className="text-[11px] tabular-nums text-text-muted">
                      {chartData.length} {chartData.length === 1 ? 'month' : 'months'}
                    </span>
                  )}
                </div>

                <div className="h-[190px] w-full border-y border-border-default py-3">
                  {isLoading ? (
                    <div className="flex h-full items-center justify-center text-xs text-text-muted">Loading history…</div>
                  ) : chartData.length < 2 ? (
                    <div className="flex h-full items-center justify-center px-6 text-center text-xs text-text-muted">
                      Record at least two month-end balances to see the trend line.
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                        <defs>
                          <linearGradient id={`accountBalanceGradient-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-profit-chart)" stopOpacity={0.28} />
                            <stop offset="100%" stopColor="var(--color-profit-chart)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border-default)" strokeDasharray="2 2" vertical={false} />
                        <XAxis
                          dataKey="label"
                          stroke="var(--text-muted)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          minTickGap={18}
                        />
                        <YAxis
                          orientation="right"
                          stroke="var(--text-muted)"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={formatCompact}
                          domain={['auto', 'auto']}
                        />
                        <Tooltip content={renderTooltip} cursor={{ stroke: 'var(--text-primary)', strokeOpacity: 0.15 }} />
                        <Area
                          type="monotone"
                          dataKey="balance"
                          stroke="var(--color-profit-chart)"
                          strokeWidth={2}
                          fill={`url(#accountBalanceGradient-${account.id})`}
                          dot={{ r: 2, fill: 'var(--color-profit-chart)', strokeWidth: 0 }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </section>

              <form onSubmit={handleSubmit} className="space-y-3 border-b border-border-default pb-5">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">Record a month-end balance</h3>
                  <p className="text-[11px] text-text-muted">Existing entries for the same month will be updated.</p>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="drawer-form-field">
                    <span className="field-label">Month</span>
                    <input
                      type="month"
                      value={yearMonth}
                      onChange={(event) => setYearMonth(event.target.value)}
                      className="field-date-input"
                    />
                  </label>
                  <label className="drawer-form-field">
                    <span className="field-label">Closing balance ({account.currency})</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      value={closingBalance}
                      onChange={(event) => setClosingBalance(event.target.value)}
                      className="field-text-input text-right font-semibold tabular-nums"
                    />
                  </label>
                </div>
                <label className="flex cursor-pointer items-start gap-2 text-[11px] text-text-muted">
                  <input
                    type="checkbox"
                    checked={useLatestAsCurrent}
                    onChange={(event) => setUseLatestAsCurrent(event.target.checked)}
                    className="mt-0.5 accent-profit-chart"
                  />
                  <span>Use the latest recorded snapshot as the account’s current balance.</span>
                </label>
                <button
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="drawer-confirm-btn"
                >
                  <Plus className="drawer-btn-icon" />
                  {isSubmitting ? 'Saving…' : 'Save snapshot'}
                </button>
              </form>

              <section className="space-y-2" aria-labelledby="balance-history-list-title">
                <div className="flex items-center justify-between gap-3">
                  <h3 id="balance-history-list-title" className="text-sm font-semibold text-text-primary">Recorded snapshots</h3>
                  <span className="text-[11px] text-text-muted">Click a row to edit</span>
                </div>
                {snapshots.length === 0 ? (
                  <div className="border-y border-border-default py-6 text-center text-xs text-text-muted">
                    No balance snapshots recorded yet.
                  </div>
                ) : (
                  <div className="divide-y divide-border-default border-y border-border-default">
                    {[...snapshots].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth)).map((snapshot) => (
                      <div key={snapshot.yearMonth} className="flex items-center gap-3 py-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setYearMonth(snapshot.yearMonth);
                            setClosingBalance(String(snapshot.closingBalance));
                          }}
                          className="min-w-0 flex-1 text-left transition-colors hover:text-profit-chart"
                        >
                          <span className="block text-xs font-medium text-text-primary">{monthLabel(snapshot.yearMonth)}</span>
                          <span className="block text-[10px] text-text-muted">Month-end closing balance</span>
                        </button>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-text-primary">
                          {formatBalance(snapshot.closingBalance)}
                        </span>
                        <button
                          type="button"
                          onClick={() => void handleDelete(snapshot.yearMonth)}
                          disabled={isSubmitting}
                          className="shrink-0 p-1.5 text-text-muted transition-colors hover:text-loss-chart disabled:opacity-50"
                          aria-label={`Delete ${monthLabel(snapshot.yearMonth)} snapshot`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            <div className="drawer-footer">
              <button type="button" onClick={onClose} className="drawer-cancel-btn">
                Close
              </button>
              <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
                <Check className="h-3 w-3 text-profit-chart" />
                Saved per account
              </span>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
