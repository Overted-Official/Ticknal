'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, X, Plus, Trash2, Calendar, TrendingUp, Save, CheckCircle2, History } from 'lucide-react';
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
      toast.warning('Select Month', 'Please select a month first.');
      return;
    }

    if (snapshots.some((s) => s.yearMonth === newMonthInput)) {
      toast.warning('Month Exists', 'This month is already in the list.');
      return;
    }

    const updated = [...snapshots, { yearMonth: newMonthInput, closingBalance: newBalanceInput || '0' }].sort((a, b) =>
      a.yearMonth.localeCompare(b.yearMonth)
    );

    setSnapshots(updated);
    setNewMonthInput('');
    setNewBalanceInput('');
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
        }),
      });

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

      if (accRes.ok && snapRes.ok) {
        toast.success('Account & History Saved', `Updated monthly trajectory for ${accountName}.`);
        onAccountUpdated();
        onClose();
      } else {
        toast.error('Save Failed', 'Could not save balance history.');
      }
    } catch (err) {
      console.error('Error saving account history:', err);
      toast.error('Connection Error', 'Failed to reach server.');
    } finally {
      setIsSaving(false);
    }
  }

  const isUsd = currency === 'USD';

  return (
    <AnimatePresence>
      {isOpen && account && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />

          {/* Sliding Sheet / Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-lg bg-[#0e0e0e] border-l border-white/10 shadow-2xl flex flex-col h-full z-10"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {account.bankLogoUrl ? (
                    <Image
                      src={account.bankLogoUrl}
                      alt={account.bankName || account.accountName}
                      width={28}
                      height={28}
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <Landmark size={18} className="text-white/40" />
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">{account.accountName}</h3>
                  <p className="text-[11px] text-white/40">{account.bankName || account.customBankName || 'Bank Account'}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white flex items-center justify-center transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 px-5 pt-3 pb-2 border-b border-white/[0.06] text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'history'
                    ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <History size={13} />
                <span>Monthly Balance History</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-white/10 text-white/70">
                  {snapshots.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
                  activeTab === 'details'
                    ? 'bg-white/15 text-white border border-white/20'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Account Info</span>
              </button>
            </div>

            {/* Content Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {activeTab === 'history' && (
                <div className="space-y-4">
                  {/* Trajectory Banner & Sparkline */}
                  {chartData.length > 1 && (
                    <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] text-white/40 uppercase font-medium">Balance Growth Trajectory</div>
                          {totalGrowth && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-sm font-bold font-mono ${totalGrowth.diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalGrowth.diff >= 0 ? '+' : ''}
                                {totalGrowth.diff.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {currency}
                              </span>
                              <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${totalGrowth.diff >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                {totalGrowth.diff >= 0 ? '↑' : '↓'} {totalGrowth.pct.toFixed(1)}%
                              </span>
                            </div>
                          )}
                        </div>
                        <TrendingUp size={16} className="text-emerald-400" />
                      </div>

                      {/* Mini Area Chart */}
                      <div className="h-28 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="balanceGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="monthLabel" stroke="#666" fontSize={9} tickLine={false} />
                            <YAxis stroke="#666" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                            <Tooltip
                              contentStyle={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.1)', fontSize: '11px', borderRadius: '8px' }}
                              formatter={(val: any) => [`${Number(val || 0).toLocaleString()} ${currency}`, 'Balance']}
                            />
                            <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#balanceGrowthGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Monthly Snapshots Input List */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-white/70 font-semibold uppercase tracking-wider text-[11px]">
                        Monthly Closing Balances ({currency})
                      </label>
                      <span className="text-[10px] text-white/40">Enter month-end balance</span>
                    </div>

                    {isLoadingSnapshots ? (
                      <div className="py-8 text-center text-white/40">Loading balance history...</div>
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
                              className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-white/[0.07] hover:border-white/15 transition-all"
                            >
                              <div className="w-24 shrink-0 flex items-center gap-1.5 font-medium text-white/80">
                                <Calendar size={12} className="text-white/40" />
                                <span>{formatYearMonthDisplay(snap.yearMonth)}</span>
                              </div>

                              <div className="flex-1 relative">
                                <input
                                  type="number"
                                  step="any"
                                  placeholder="0.00"
                                  value={snap.closingBalance}
                                  onChange={(e) => handleSnapshotValueChange(snap.yearMonth, e.target.value)}
                                  className="w-full bg-white/5 border border-white/10 rounded-md py-1.5 px-2.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500/50"
                                />
                              </div>

                              {hasPrev && (
                                <div className="w-20 text-right font-mono text-[10px] shrink-0">
                                  <span className={diff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {diff >= 0 ? '+' : ''}{pct.toFixed(1)}%
                                  </span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRemoveSnapshot(snap.yearMonth)}
                                className="p-1 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded transition"
                                title="Remove Month"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Add Another Month */}
                  <div className="pt-2 border-t border-white/[0.06] flex items-center gap-2">
                    <input
                      type="month"
                      value={newMonthInput}
                      onChange={(e) => setNewMonthInput(e.target.value)}
                      className="bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs focus:outline-none focus:border-emerald-500/50"
                    />
                    <input
                      type="number"
                      step="any"
                      placeholder={`Balance in ${currency}`}
                      value={newBalanceInput}
                      onChange={(e) => setNewBalanceInput(e.target.value)}
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg p-2 text-white text-xs font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                    <button
                      type="button"
                      onClick={handleAddMonth}
                      className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white font-medium text-xs flex items-center gap-1 transition"
                    >
                      <Plus size={13} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'details' && (
                <div className="space-y-3.5">
                  {/* Account Name */}
                  <div className="space-y-1">
                    <label className="block text-white/60 font-medium">Account Label *</label>
                    <input
                      type="text"
                      required
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  {/* Account Number */}
                  <div className="space-y-1">
                    <label className="block text-white/60 font-medium">Account Number / IBAN</label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>

                  {/* Currency & Type */}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <label className="block text-white/60 font-medium">Currency</label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="EGP" className="bg-[#111]">EGP</option>
                        <option value="USD" className="bg-[#111]">USD</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-white/60 font-medium">Type</label>
                      <select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                      >
                        <option value="CURRENT" className="bg-[#111]">Current Account</option>
                        <option value="SAVINGS" className="bg-[#111]">Savings Account</option>
                        <option value="CD_TIME_DEPOSIT" className="bg-[#111]">Certificates (CD)</option>
                        <option value="BROKER_CASH" className="bg-[#111]">Brokerage Cash</option>
                        <option value="WALLET" className="bg-[#111]">Digital Wallet</option>
                      </select>
                    </div>
                  </div>

                  {/* Current Balance */}
                  <div className="space-y-1">
                    <label className="block text-white/60 font-medium">Current Balance ({currency})</label>
                    <input
                      type="number"
                      step="any"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <Save size={15} />
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
