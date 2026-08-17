'use client';

import React, { useState } from 'react';
import { Landmark, X } from 'lucide-react';
import { type BankItem } from '@/types/bank';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBanks: BankItem[];
  onAccountCreated: () => void;
}

export default function AddAccountModal({
  isOpen,
  onClose,
  availableBanks,
  onAccountCreated,
}: AddAccountModalProps) {
  const [bankId, setBankId] = useState<string>('');
  const [customBankName, setCustomBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('CURRENT');
  const [currency, setCurrency] = useState('EGP');
  const [balance, setBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/banks/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bankId: bankId ? Number(bankId) : null,
          customBankName: customBankName.trim() || null,
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim() || null,
          accountType,
          currency,
          balance: Number(balance) || 0,
        }),
      });

      if (res.ok) {
        onAccountCreated();
        onClose();
        setBankId('');
        setCustomBankName('');
        setAccountName('');
        setAccountNumber('');
        setBalance('');
      }
    } catch (err) {
      console.error('Failed to create account:', err);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#111] border border-white/10 rounded-xl p-5 md:p-6 w-full max-w-md space-y-4 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Landmark className="text-emerald-400" size={18} />
            Add Bank Account
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Bank Selector */}
          <div>
            <label className="block text-white/50 mb-1">Egyptian Bank</label>
            <select
              value={bankId}
              onChange={(e) => {
                setBankId(e.target.value);
                const selected = availableBanks.find((b) => String(b.id) === e.target.value);
                if (selected && !accountName) {
                  setAccountName(`${selected.name} Main`);
                }
              }}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="" className="bg-[#111]">-- Select from 157 Egyptian Banks --</option>
              {availableBanks.map((b) => (
                <option key={b.id} value={String(b.id)} className="bg-[#111]">
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Bank Name fallback */}
          {!bankId && (
            <div>
              <label className="block text-white/50 mb-1">Custom Institution Name</label>
              <input
                type="text"
                placeholder="e.g. Wise, Revolut, Cash Safe"
                value={customBankName}
                onChange={(e) => setCustomBankName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>
          )}

          {/* Account Label */}
          <div>
            <label className="block text-white/50 mb-1">Account Name / Label *</label>
            <input
              type="text"
              required
              placeholder="e.g. CIB Salary, HSBC USD Savings"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Currency & Type */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 mb-1">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
              >
                <option value="EGP" className="bg-[#111]">EGP (Egyptian Pound)</option>
                <option value="USD" className="bg-[#111]">USD (US Dollar)</option>
              </select>
            </div>

            <div>
              <label className="block text-white/50 mb-1">Account Type</label>
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

          {/* Initial Balance */}
          <div>
            <label className="block text-white/50 mb-1">Current Balance ({currency})</label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
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
              {isSubmitting ? 'Adding...' : 'Add Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
