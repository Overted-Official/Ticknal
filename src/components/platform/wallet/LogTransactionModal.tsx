'use client';

import React, { useState } from 'react';
import { ArrowRightLeft, X } from 'lucide-react';
import { type BankAccount } from '@/types/bank';

interface LogTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: BankAccount[];
  categories: string[];
  onTransactionLogged: () => void;
}

export default function LogTransactionModal({
  isOpen,
  onClose,
  accounts,
  categories,
  onTransactionLogged,
}: LogTransactionModalProps) {
  const [txMode, setTxMode] = useState<'EXPENSE' | 'INCOME' | 'TRANSFER' | 'BROKER_INJECTION'>('EXPENSE');
  const [accountId, setAccountId] = useState<string>(accounts[0] ? String(accounts[0].id) : '');
  const [toAccountId, setToAccountId] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(accounts[0]?.currency || 'EGP');
  const [category, setCategory] = useState(categories[0] || 'Living & Bills');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId || !amount || Number(amount) <= 0) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/banks/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: Number(accountId),
          toAccountId: txMode === 'TRANSFER' && toAccountId ? Number(toAccountId) : null,
          type: txMode,
          amount: Number(amount),
          currency,
          category: txMode === 'TRANSFER' ? 'Internal Transfer' : category,
          transactionDate,
          notes: notes.trim() || null,
        }),
      });

      if (res.ok) {
        onTransactionLogged();
        onClose();
        setAmount('');
        setNotes('');
      }
    } catch (err) {
      console.error('Failed to log transaction:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111] border border-white/10 rounded-xl p-5 md:p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <ArrowRightLeft className="text-emerald-400" size={18} />
            Log Transaction / Cash Transfer
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="grid grid-cols-4 gap-1 bg-white/5 p-1 rounded-lg text-[10px] font-semibold text-center">
          <button
            type="button"
            onClick={() => setTxMode('EXPENSE')}
            className={`py-1.5 rounded transition ${txMode === 'EXPENSE' ? 'bg-rose-500 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setTxMode('INCOME')}
            className={`py-1.5 rounded transition ${txMode === 'INCOME' ? 'bg-emerald-500 text-black' : 'text-white/50 hover:text-white'}`}
          >
            Income
          </button>
          <button
            type="button"
            onClick={() => setTxMode('TRANSFER')}
            className={`py-1.5 rounded transition ${txMode === 'TRANSFER' ? 'bg-sky-500 text-white' : 'text-white/50 hover:text-white'}`}
          >
            Transfer
          </button>
          <button
            type="button"
            onClick={() => setTxMode('BROKER_INJECTION')}
            className={`py-1.5 rounded transition ${txMode === 'BROKER_INJECTION' ? 'bg-plt-orange text-white' : 'text-white/50 hover:text-white'}`}
          >
            To Stocks
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Account Selection */}
          <div>
            <label className="block text-white/50 mb-1">
              {txMode === 'TRANSFER' ? 'From Account (Source)' : 'Bank Account'}
            </label>
            <select
              value={accountId}
              onChange={(e) => {
                setAccountId(e.target.value);
                const sel = accounts.find((a) => String(a.id) === e.target.value);
                if (sel) setCurrency(sel.currency);
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
            >
              {accounts.map((a) => (
                <option key={a.id} value={String(a.id)} className="bg-[#111]">
                  {a.accountName} ({a.currency}) - Bal: {Number(a.balance).toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          {/* Destination Account (Only for transfers) */}
          {txMode === 'TRANSFER' && (
            <div>
              <label className="block text-white/50 mb-1">To Account (Destination)</label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="" className="bg-[#111]">-- Select Destination Account --</option>
                {accounts
                  .filter((a) => String(a.id) !== accountId)
                  .map((a) => (
                    <option key={a.id} value={String(a.id)} className="bg-[#111]">
                      {a.accountName} ({a.currency})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 mb-1">Amount ({currency}) *</label>
              <input
                type="number"
                step="any"
                required
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-white/50 mb-1">Date</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          </div>

          {/* Category (if not transfer) */}
          {txMode !== 'TRANSFER' && (
            <div>
              <label className="block text-white/50 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
              >
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-[#111]">{c}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-white/50 mb-1">Notes / Description (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Monthly rent, Client wire, Grocery trip"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-white/60 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Record Transaction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
