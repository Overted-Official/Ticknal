'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, X, Plus, Star } from '@/components/ui/icon-library';
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
  const [interestRate, setInterestRate] = useState('');
  const [interestFrequency, setInterestFrequency] = useState('DAILY');
  const [isDefaultExpense, setIsDefaultExpense] = useState(false);
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
          interestRate: (accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && interestRate ? Number(interestRate) : null,
          interestFrequency: (accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && interestRate ? interestFrequency : 'NONE',
          isDefaultExpense,
        }),
      });

      if (res.ok) {
        toast.success('Account Created', `${accountName} is now tracked in your wallet.`);
        onAccountCreated();
        onClose();
        setBankId('');
        setCustomBankName('');
        setAccountName('');
        setAccountNumber('');
        setBalance('');
        setInterestRate('');
        setInterestFrequency('DAILY');
        setIsDefaultExpense(false);
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
            className="fixed inset-0 bg-plt-base/75 backdrop-blur-sm"
          />

          {/* Sliding Sheet / Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 220 }}
            className="relative w-full max-w-md bg-plt-base border-l border-plt-border-soft shadow-2xl flex flex-col h-full z-10 select-none"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-plt-border-soft bg-plt-card flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-xs font-bold text-plt-text tracking-tight font-sans">Add Account</h3>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Add a cash, wallet, savings, or brokerage account</p>
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

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs custom-scrollbar">
              {/* Bank Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Select institution</label>
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
                  <label className="text-xs font-semibold text-plt-muted font-sans">Custom Institution / Wallet Name</label>
                  <input
                    type="text"
                    placeholder={accountType === 'BROKERAGE' ? 'e.g. Mubasher, Thndr, CI Capital' : 'e.g. Wise, Revolut, Cash Vault, Telda'}
                    value={customBankName}
                    onChange={(e) => setNewAccCustomBankHelper(e.target.value, setCustomBankName)}
                    className="input-token"
                  />
                </div>
              )}

              {/* Account Label */}
              <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Account Label *</label>
                <input
                  type="text"
                  required
                  placeholder={accountType === 'BROKERAGE' ? 'e.g. Thndr EGX portfolio' : 'e.g. CIB Salary, HSBC USD Savings'}
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  className="input-token"
                />
              </div>

              {/* Account Number / IBAN (Optional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Account Number / IBAN (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. EG3800..."
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  className="input-token"
                />
              </div>

              {/* Currency & Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="select-token"
                  >
                    <option value="EGP">EGP (Egyptian Pound)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-plt-muted font-sans">Account Type</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className="select-token"
                  >
                    <option value="CURRENT">Current Account</option>
                    <option value="SAVINGS">Savings Account</option>
                    <option value="CD_TIME_DEPOSIT">Certificates (CD)</option>
                    <option value="BROKERAGE">Brokerage account</option>
                    <option value="WALLET">Digital Wallet</option>
                  </select>
                </div>
              </div>

              {/* Initial Balance */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-plt-muted font-sans">Current Balance ({currency})</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0.00"
                  value={balance}
                  onChange={(e) => setBalance(e.target.value)}
                  className="input-token"
                />
              </div>

              {accountType === 'BROKERAGE' && (
                <div className="rounded-2xl bg-plt-accent-soft p-3.5 text-[11px] text-plt-muted">
                  <p className="font-semibold text-plt-text">Brokerage account</p>
                  <p className="mt-1">Live EGX buys and sells require an EGP brokerage account. Opening cash is recorded as the current balance; fund it later with an explicit transfer.</p>
                </div>
              )}

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

              {/* Main Expense Account Switch */}
              {accountType !== 'BROKERAGE' && <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <div className="text-xs font-semibold text-plt-text font-sans flex items-center gap-1.5">
                    <Star size={13} className={isDefaultExpense ? "fill-plt-warning text-plt-warning" : "text-plt-muted"} />
                    <span>Set as Main Expense Account</span>
                  </div>
                  <p className="text-[10px] text-plt-muted font-sans">
                    Automatically pre-select this account when logging expenses & transactions
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDefaultExpense(!isDefaultExpense)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                    isDefaultExpense ? 'bg-plt-warning' : 'bg-white/20'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                      isDefaultExpense ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>}

              {/* Action Buttons */}
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
                  disabled={isSubmitting}
                  className="btn-token btn-primary btn-compact font-sans"
                >
                  <Plus size={14} />
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
