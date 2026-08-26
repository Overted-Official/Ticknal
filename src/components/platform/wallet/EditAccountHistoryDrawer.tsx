'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, X, Plus, Trash2, Calendar, TrendingUp, Save, CheckCircle2, History } from '@/components/ui/icon-library';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { type BankAccount, type BankMonthlySnapshot } from '@/types/bank';
import { useToast } from '@/context/ToastContext';

interface EditAccountHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  onAccountUpdated: () => void;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

function formatYearMonthDisplay(ym: string) {
  const [year, month] = ym.split('-');
  const mIdx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES[mIdx] || month} ${year}`;
}

export default function EditAccountHistoryDrawer({
  isOpen,
  onClose,
  account,
  onAccountUpdated,
}: EditAccountHistoryDrawerProps) {
  const { toast } = useToast();

  // Account state
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('CURRENT');
  const [currency, setCurrency] = useState('EGP');
  const [balance, setBalance] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [interestFrequency, setInterestFrequency] = useState('DAILY');

  // Snapshots state
  const [snapshots, setSnapshots] = useState<Array<{ yearMonth: string; closingBalance: string }>>([]);
  const [newMonthInput, setNewMonthInput] = useState('');
  const [newBalanceInput, setNewBalanceInput] = useState('');
  const [isLoadingSnapshots, setIsLoadingSnapshots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('history');

  // Load account data & fetch snapshots when opened
  useEffect(() => {
    if (!account || !isOpen) return;

    setAccountName(account.accountName || '');
    setAccountNumber(account.accountNumber || '');
    setAccountType(account.accountType || 'CURRENT');
    setCurrency(account.currency || 'EGP');
    setBalance(String(account.balance || '0'));
    setInterestRate(account.interestRate ? String(account.interestRate) : '');
    setInterestFrequency(account.interestFrequency || 'DAILY');

    setIsLoadingSnapshots(true);
    fetch(`/api/banks/snapshots?accountId=${account.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.snapshots && data.snapshots.length > 0) {
          const formatted = data.snapshots.map((s: BankMonthlySnapshot) => ({
            yearMonth: s.yearMonth,
            closingBalance: String(s.closingBalance),
          }));
          setSnapshots(formatted);
        } else {
          // Pre-populate last 7 months of 2026 if empty for quick entry
          const defaultMonths = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
          setSnapshots(
            defaultMonths.map((ym, idx) => ({
              yearMonth: ym,
              closingBalance: idx === defaultMonths.length - 1 ? String(account.balance || '') : '',
            }))
          );
        }
      })
      .catch((err) => {
        console.error('Failed to fetch snapshots:', err);
      })
      .finally(() => {
        setIsLoadingSnapshots(false);
      });
  }, [account, isOpen]);

  // Handle adding new snapshot month
  const handleAddMonth = () => {
    if (!newMonthInput) {
      toast.warning('Select Month', 'Please select a year and month first.');
      return;
    }

    if (snapshots.some((s) => s.yearMonth === newMonthInput)) {
      toast.warning('Month Exists', 'This month is already in the list.');
      return;
    }

    const valToAdd =
      newBalanceInput.trim() !== ''
        ? newBalanceInput.trim()
        : snapshots.length > 0 && snapshots[snapshots.length - 1].closingBalance !== ''
        ? snapshots[snapshots.length - 1].closingBalance
        : String(account?.balance || '0');

    const updated = [...snapshots, { yearMonth: newMonthInput, closingBalance: valToAdd }].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth)
    );

    setSnapshots(updated);
    setNewMonthInput('');
    setNewBalanceInput('');
    toast.success('Month Added', `Added ${formatYearMonthDisplay(newMonthInput)} to history.`);
  };

  const handleRemoveSnapshot = (ym: string) => {
    setSnapshots((prev) => prev.filter((s) => s.yearMonth !== ym));
  };

  const handleSnapshotValueChange = (ym: string, val: string) => {
    setSnapshots((prev) =>
      prev.map((s) => (s.yearMonth === ym ? { ...s, closingBalance: val } : s))
    );
  };

  // Trajectory Chart & Growth Metrics
  const chartData = useMemo(() => {
    const sorted = [...snapshots]
      .filter((s) => s.closingBalance !== '' && !isNaN(Number(s.closingBalance)))
      .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    return sorted.map((s, idx) => {
      const currentVal = Number(s.closingBalance);
      const prevVal = idx > 0 ? Number(sorted[idx - 1].closingBalance) : null;
      const momChange = prevVal !== null ? currentVal - prevVal : null;
      const momPct = prevVal !== null && prevVal > 0 ? (momChange! / prevVal) * 100 : null;

      return {
        yearMonth: s.yearMonth,
        monthLabel: formatYearMonthDisplay(s.yearMonth),
        balance: currentVal,
        momChange,
        momPct,
      };
    });
  }, [snapshots]);

  const totalGrowth = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0].balance;
    const last = chartData[chartData.length - 1].balance;
    const diff = last - first;
    const pct = first > 0 ? (diff / first) * 100 : 0;
    return { diff, pct };
  }, [chartData]);

  // Save everything
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!account) return;

    setIsSaving(true);
    try {
      // 1. Update Account Details
      const accRes = await fetch('/api/banks/accounts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: account.id,
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim() || null,
          accountType,
          currency,
          balance: Number(balance) || 0,
          interestRate: (accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && interestRate ? Number(interestRate) : null,
          interestFrequency: (accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && interestRate ? interestFrequency : 'NONE',
        }),
      });

      if (!accRes.ok) {
        const errData = await accRes.json().catch(() => ({}));
        console.error('Account update error:', errData);
        toast.error('Save Failed', errData.error || 'Could not update account details.');
        return;
      }

      // 2. Save Snapshots
      const validSnapshots = snapshots.filter((s) => s.closingBalance !== '' && !isNaN(Number(s.closingBalance)));

      const snapRes = await fetch('/api/banks/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: account.id,
          snapshots: validSnapshots,
          updateCurrentBalance: true,
        }),
      });

      if (!snapRes.ok) {
        const errData = await snapRes.json().catch(() => ({}));
        console.error('Snapshots save error:', errData);
        toast.error('Save Failed', errData.error || 'Could not save balance history.');
        return;
      }

      toast.success('Account & History Saved', `Updated monthly trajectory for ${accountName}.`);
      onAccountUpdated();
      onClose();
    } catch (err) {
      console.error('Error saving account history:', err);
      toast.error('Connection Error', 'Failed to reach server.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && account && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-plt-base/75 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg bg-plt-base border-l border-plt-border-soft shadow-2xl flex flex-col h-full z-10 select-none"
          >
            <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-plt-text tracking-tight font-sans">{account.accountName}</h3>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">{account.bankName || account.customBankName || 'Bank Account'}</p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-plt-muted hover:text-plt-text hover:bg-plt-hover rounded-xl transition cursor-pointer"
                title="Close drawer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="px-4 py-2.5 bg-plt-card/50 border-b border-plt-border-soft shrink-0">
              <div className="pill-switch w-full flex">
                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
                    activeTab === 'history' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <History size={14} />
                  <span>Monthly History</span>
                  <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono bg-plt-base border border-plt-border-soft">
                    {snapshots.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`pill-switch-btn flex-1 flex items-center justify-center gap-1.5 ${
                    activeTab === 'details' ? 'pill-switch-btn-active font-semibold' : ''
                  }`}
                >
                  <span>Account Info</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleSave} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {chartData.length > 1 && (
                    <div className="card-widget-compact space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="kpi-title">Balance Growth Trajectory</div>
                          {totalGrowth && (
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`kpi-value ${totalGrowth.diff >= 0 ? 'text-plt-profit' : 'text-plt-risk'}`}>
                                {totalGrowth.diff >= 0 ? '+' : ''}
                                {totalGrowth.diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                              </span>
                              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${totalGrowth.diff >= 0 ? 'bg-plt-profit/15 text-plt-profit border border-plt-profit/30' : 'bg-plt-risk/15 text-plt-risk border border-plt-risk/30'}`}>
                                {totalGrowth.diff >= 0 ? '↑' : '↓'} {totalGrowth.pct.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <TrendingUp size={16} className="text-plt-profit" />
                      </div>

                      <div className="h-28 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="balanceGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="var(--plt-profit)" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="var(--plt-profit)" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="monthLabel" stroke="var(--chart-axis)" fontSize="var(--text-size-compact)" tickLine={false} />
                            <YAxis stroke="var(--chart-axis)" fontSize="var(--text-size-compact)" tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ backgroundColor: 'var(--plt-bg-surface-elevated)', borderColor: 'var(--plt-border)', fontSize: 'var(--text-size-caption)', borderRadius: 'var(--radius-lg)' }}
                              formatter={(val: any) => [`${Number(val || 0).toLocaleString()} ${currency}`, 'Balance']}
                            />
                            <Area type="monotone" dataKey="balance" stroke="var(--plt-profit)" strokeWidth={2} fillOpacity={1} fill="url(#balanceGrowthGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between pb-1">
                      <label className="text-xs font-semibold text-plt-muted font-sans">
                        Monthly Closing Balances ({currency})
                      </label>
                      <span className="text-[10px] text-plt-muted font-sans">Enter month-end balance</span>
                    </div>

                    {isLoadingSnapshots ? (
                      <div className="py-8 text-center text-plt-muted font-sans">Loading balance history...</div>
                    ) : (
                      <div className="space-y-1.5">
                        {snapshots.map((snap, idx) => {
                          const val = Number(snap.closingBalance);
                          const prev = idx > 0 ? Number(snapshots[idx - 1].closingBalance) : null;
                          const hasPrev = prev !== null && !isNaN(prev) && prev > 0 && !isNaN(val) && val > 0;
                          const diff = hasPrev ? val - prev! : 0;
                          const pct = hasPrev ? (diff / prev!) * 100 : 0;

                          return (
                            <div
                              key={snap.yearMonth}
                              className="flex items-center gap-2 p-2 rounded-xl bg-plt-card border border-plt-border-soft hover:bg-plt-hover/60 transition-all"
                            >
                              <div className="w-24 shrink-0 flex items-center gap-1.5 font-medium text-plt-text font-sans text-xs">
                                <Calendar size={14} className="text-plt-muted shrink-0" />
                                <span className="truncate">{formatYearMonthDisplay(snap.yearMonth)}</span>
                              </div>

                              <div className="flex-1 min-w-0 relative">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={snap.closingBalance}
                                  onChange={(e) => handleSnapshotValueChange(snap.yearMonth, e.target.value)}
                                  className="h-8 w-full rounded-lg bg-plt-base border border-plt-border-soft px-2.5 text-xs font-mono tabular-nums text-plt-text focus:border-plt-border-strong focus:outline-hidden transition"
                                />
                              </div>

                              {hasPrev && (
                                <div className="w-16 text-right font-mono text-[11px] shrink-0 font-semibold">
                                  <span className={diff >= 0 ? 'text-plt-profit' : 'text-plt-risk'}>
                                    {diff >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                  </span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveSnapshot(snap.yearMonth)}
                                className="p-1.5 text-plt-muted hover:text-plt-risk hover:bg-plt-risk/10 rounded-lg transition shrink-0 cursor-pointer"
                                title="Remove Month"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-plt-border-soft flex items-center gap-2">
                    <div className="w-36 shrink-0">
                      <input
                        type="month"
                        value={newMonthInput}
                        onChange={(e) => setNewMonthInput(e.target.value)}
                        className="h-8 w-full rounded-xl bg-plt-card border border-plt-border-soft px-2.5 text-xs font-sans text-plt-text focus:border-plt-border-strong focus:outline-hidden transition cursor-pointer [color-scheme:dark]"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input
                        type="number"
                        step="any"
                        placeholder={`Balance (${currency})`}
                        value={newBalanceInput}
                        onChange={(e) => setNewBalanceInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddMonth();
                          }
                        }}
                        className="h-8 w-full rounded-xl bg-plt-card border border-plt-border-soft px-2.5 text-xs font-mono tabular-nums text-plt-text placeholder:text-plt-muted focus:border-plt-border-strong focus:outline-hidden transition"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddMonth}
                      className="h-8 px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.16] text-white border border-white/20 text-xs font-semibold flex items-center gap-1.5 shrink-0 transition cursor-pointer"
                    >
                      <Plus size={14} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">Account Label *</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="input-token"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">Account Number / IBAN</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="input-token"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="select-token"
                      >
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-plt-muted font-sans">Type</label>
                      <select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        className="select-token"
                      >
                        <option value="CURRENT">Current Account</option>
                        <option value="SAVINGS">Savings Account</option>
                        <option value="CD_TIME_DEPOSIT">Certificates (CD)</option>
                        <option value="BROKER_CASH">Brokerage Cash</option>
                        <option value="WALLET">Digital Wallet</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-plt-muted font-sans">Current Balance ({currency})</label>
                    <input
                      type="number"
                      step="any"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="input-token"
                    />
                  </div>

                  {/* Optional Savings / CD Interest Configuration */}
                  {(accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && (
                    <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-plt-text font-sans flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-plt-profit" />
                          Interest & Yield Automation
                        </span>
                        <span className="text-[10px] text-plt-muted font-sans">Optional</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-plt-muted font-sans">Annual Rate (% APR)</label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 6.00"
                            value={interestRate}
                            onChange={(e) => setInterestRate(e.target.value)}
                            className="input-token"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-plt-muted font-sans">Compounding</label>
                          <select
                            value={interestFrequency}
                            onChange={(e) => setInterestFrequency(e.target.value)}
                            className="select-token"
                          >
                            <option value="DAILY">Daily (Added Daily)</option>
                            <option value="MONTHLY">Monthly</option>
                            <option value="QUARTERLY">Quarterly</option>
                            <option value="ANNUALLY">Annually</option>
                          </select>
                        </div>
                      </div>

                      {interestRate && Number(interestRate) > 0 && balance && Number(balance) > 0 && (
                        <div className="text-[10px] text-plt-profit font-sans flex items-center justify-between pt-1 border-t border-white/[0.05]">
                          <span>Projected Daily Yield:</span>
                          <span className="font-semibold tabular-nums">
                            +{((Number(balance) * (Number(interestRate) / 36500))).toFixed(2)} {currency}/day
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 border-t border-plt-border-soft flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-token btn-secondary btn-compact font-sans"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-token btn-primary btn-compact font-sans"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Changes & History'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
