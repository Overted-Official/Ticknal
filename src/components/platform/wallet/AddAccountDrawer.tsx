'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, X, Plus } from 'lucide-react';
import { type BankItem } from '@/types/bank';
import { useToast } from '@/context/ToastContext';
import BankSearchSelect from './BankSearchSelect';

interface AddAccountDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  availableBanks: BankItem[];
  onAccountCreated: () => void;
}

export default function AddAccountDrawer({
  isOpen,
  onClose,
  availableBanks,
  onAccountCreated,
}: AddAccountDrawerProps) {
  const { toast } = useToast();
  const [bankId, setBankId] = useState<string>('');
  const [customBankName, setCustomBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('CURRENT');
  const [currency, setCurrency] = useState('EGP');
  const [balance, setBalance] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        toast.success('Bank Account Created', `${accountName} is now tracked in your wallet.`);
        onAccountCreated();
        onClose();
        setBankId('');
        setCustomBankName('');
        setAccountName('');
        setAccountNumber('');
        setBalance('');
      } else {
        toast.error('Failed to create account', 'Please verify your inputs and try again.');
      }
    } catch (err) {
      console.error('Failed to create account:', err);
      toast.error('Connection Error', 'Could not reach the server.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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
            className="relative w-full max-w-md bg-[#0e0e0e] border-l border-white/10 shadow-2xl flex flex-col h-full z-10"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-white/[0.02]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Landmark size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight">Add Bank Account</h3>
                  <p className="text-[11px] text-white/40">Connect Egyptian or foreign liquid cash accounts</p>
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

            {/* Body */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {/* Bank Selector */}
              <div className="space-y-1.5">
                <label className="block text-white/60 font-medium">Select Egyptian Bank</label>
                <BankSearchSelect
                  banks={availableBanks}
                  selectedBankId={bankId}
                  onSelectBank={(bank) => {
                    if (bank) {
                      setBankId(String(bank.id));
                      if (!accountName) {
                        setAccountName(`${bank.name} Main`);
                      }
                    } else {
                      setBankId('');
                    }
                  }}
                />
              </div>

              {/* Custom Institution Name */}
              {!bankId && (
                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">Custom Institution / Wallet Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Wise, Revolut, Cash Vault, Telda"
                    value={customBankName}
                    onChange={(e) => setNewAccCustomBankHelper(e.target.value, setCustomBankName)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
              )}

              {/* Account Label */}
              <div className="space-y-1.5">
                <label className="block text-white/60 font-medium">Account Label *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIB Salary, HSBC USD Savings"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Account Number / IBAN (Optional) */}
              <div className="space-y-1.5">
                <label className="block text-white/60 font-medium">Account Number / IBAN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EG3800..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

              {/* Currency & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="EGP" className="bg-[#111]">EGP (Egyptian Pound)</option>
                    <option value="USD" className="bg-[#111]">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-white/60 font-medium">Account Type</label>
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
              <div className="space-y-1.5">
                <label className="block text-white/60 font-medium">Current Balance ({currency})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-emerald-500/50"
                />
              </div>

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
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black font-bold transition disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
                >
                  <Plus size={15} />
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function setNewAccCustomBankHelper(val: string, setter: (v: string) => void) {
  setter(val);
}
