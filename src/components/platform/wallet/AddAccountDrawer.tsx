'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, X, Plus, Star, ChevronDown } from '@/components/ui/icon-library';
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
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
          interestRate:
            (accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && interestRate
              ? Number(interestRate)
              : null,
          interestFrequency:
            (accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && interestRate
              ? interestFrequency
              : 'NONE',
          isDefaultExpense,
        }),
      });

      if (res.ok) {
        toast.success('Account Created', `${accountName} is now tracked in your portfolio.`);
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div key="add-account-drawer-container" className="drawer-overlay z-[80]">
          {/* Backdrop with smooth fade in/out */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="drawer-backdrop"
            onClick={onClose}
            aria-label="Close drawer overlay"
          />

          {/* Drawer Sheet with responsive sliding (bottom-up on mobile, right on desktop) */}
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="drawer-sheet"
          >
            {/* Header: Clean Surface, Mobile Drag Pill, Title & Close Button */}
            <div className="drawer-header">
              {/* Mobile Drag Indicator */}
              <div
                className="md:hidden w-full flex items-center justify-center pb-2 cursor-pointer"
                onClick={onClose}
                aria-label="Drag handle to close"
              >
                <div className="drawer-drag-pill" />
              </div>

              {/* Main Header Row */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-surface-active border border-border-default flex items-center justify-center shrink-0">
                    <Landmark className="w-5 h-5 text-brand-blue" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <h2 className="font-semibold text-sm sm:text-base text-text-primary tracking-tight truncate font-sans">
                      Add Account
                    </h2>
                    <p className="text-[11px] text-text-muted font-sans truncate">
                      Add a commercial bank, savings, cash vault, or brokerage account
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="drawer-close-btn"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form wrapping body and sticky footer */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <div className="drawer-body custom-scrollbar space-y-4">
                {/* Bank / Institution Selector */}
                <div className="space-y-1.5">
                  <label className="field-label">Select Institution</label>
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

                {/* Custom Institution Name (if no bank selected) */}
                {!bankId && (
                  <div className="space-y-1.5">
                    <label className="field-label">Custom Institution / Wallet Name</label>
                    <div className="field-group">
                      <input
                        type="text"
                        placeholder={
                          accountType === 'BROKERAGE'
                            ? 'e.g. Mubasher, Thndr, CI Capital'
                            : 'e.g. Wise, Revolut, Cash Vault, Telda'
                        }
                        value={customBankName}
                        onChange={(e) => setCustomBankName(e.target.value)}
                        className="field-input text-xs font-normal"
                      />
                    </div>
                  </div>
                )}

                {/* Account Label */}
                <div className="space-y-1.5">
                  <label className="field-label">Account Label *</label>
                  <div className="field-group">
                    <input
                      type="text"
                      required
                      placeholder={
                        accountType === 'BROKERAGE'
                          ? 'e.g. Thndr EGX Portfolio'
                          : 'e.g. CIB Salary, HSBC USD Savings'
                      }
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      className="field-input text-xs font-normal"
                    />
                  </div>
                </div>

                {/* Account Number / IBAN (Optional) */}
                <div className="space-y-1.5">
                  <label className="field-label">Account Number / IBAN (Optional)</label>
                  <div className="field-group">
                    <input
                      type="text"
                      placeholder="e.g. EG3800..."
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="field-input text-xs font-normal"
                    />
                  </div>
                </div>

                {/* Currency & Type */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="field-label">Currency</label>
                    <div className="relative">
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="field-select-input"
                      >
                        <option value="EGP" className="bg-surface-input text-text-primary">EGP (Egyptian Pound)</option>
                        <option value="USD" className="bg-surface-input text-text-primary">USD (US Dollar)</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="field-label">Account Type</label>
                    <div className="relative">
                      <select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        className="field-select-input"
                      >
                        <option value="CURRENT" className="bg-surface-input text-text-primary">Current Account</option>
                        <option value="SAVINGS" className="bg-surface-input text-text-primary">Savings Account</option>
                        <option value="CD_TIME_DEPOSIT" className="bg-surface-input text-text-primary">Certificates (CD)</option>
                        <option value="BROKERAGE" className="bg-surface-input text-text-primary">Brokerage Account</option>
                        <option value="WALLET" className="bg-surface-input text-text-primary">Digital Wallet</option>
                      </select>
                      <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* Current Balance */}
                <div className="space-y-1.5">
                  <label className="field-label">Current Balance ({currency})</label>
                  <div className="field-group">
                    <input
                      type="number"
                      step="any"
                      placeholder="0.00"
                      value={balance}
                      onChange={(e) => setBalance(e.target.value)}
                      className="field-input"
                    />
                    <span className="field-suffix">{currency}</span>
                  </div>
                </div>

                {/* Brokerage Explanatory Card */}
                {accountType === 'BROKERAGE' && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-text-muted space-y-1">
                    <p className="font-semibold text-amber-400 font-sans">Brokerage Account Integration</p>
                    <p className="text-[11px] leading-relaxed">
                      Trading buys and sells will execute from and credit this cash balance. Opening cash is recorded as current balance; fund it anytime via internal transfer.
                    </p>
                  </div>
                )}

                {/* Optional Savings / CD Interest Configuration */}
                {(accountType === 'SAVINGS' || accountType === 'CD_TIME_DEPOSIT') && (
                  <div className="p-3.5 rounded-xl bg-surface-raised border border-border-default space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-text-primary font-sans flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-profit-num" />
                        Interest &amp; Yield Automation
                      </span>
                      <span className="text-[10px] text-text-muted font-sans">Optional</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="field-label text-[11px]">Annual Rate (% APR)</label>
                        <div className="field-group">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="e.g. 6.00"
                            value={interestRate}
                            onChange={(e) => setInterestRate(e.target.value)}
                            className="field-input"
                          />
                          <span className="field-suffix">%</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="field-label text-[11px]">Compounding</label>
                        <div className="relative">
                          <select
                            value={interestFrequency}
                            onChange={(e) => setInterestFrequency(e.target.value)}
                            className="field-select-input"
                          >
                            <option value="DAILY" className="bg-surface-input text-text-primary">Daily (Added Daily)</option>
                            <option value="MONTHLY" className="bg-surface-input text-text-primary">Monthly</option>
                            <option value="QUARTERLY" className="bg-surface-input text-text-primary">Quarterly</option>
                            <option value="ANNUALLY" className="bg-surface-input text-text-primary">Annually</option>
                          </select>
                          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>

                    {interestRate && Number(interestRate) > 0 && balance && Number(balance) > 0 && (
                      <div className="text-[10px] text-profit-num font-sans flex items-center justify-between pt-1 border-t border-border-subtle">
                        <span>Projected Daily Yield:</span>
                        <span className="font-semibold tabular-nums">
                          +{((Number(balance) * (Number(interestRate) / 36500))).toFixed(2)} {currency}/day
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Main Expense Account Switch */}
                {accountType !== 'BROKERAGE' && (
                  <div className="p-3.5 rounded-xl bg-surface-raised border border-border-default flex items-center justify-between gap-3">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="text-xs font-semibold text-text-primary font-sans flex items-center gap-1.5">
                        <Star
                          size={13}
                          className={isDefaultExpense ? 'fill-accent-amber text-accent-amber' : 'text-text-muted'}
                        />
                        <span>Set as Main Expense Account</span>
                      </div>
                      <p className="text-[10px] text-text-muted font-sans">
                        Automatically pre-select this account when logging expenses &amp; transfers
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDefaultExpense(!isDefaultExpense)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isDefaultExpense ? 'bg-accent-amber' : 'bg-surface-active'
                      }`}
                      aria-label="Toggle main expense account"
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          isDefaultExpense ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                )}
              </div>

              {/* Drawer Footer with standardized buttons */}
              <div className="drawer-footer">
                <button
                  type="button"
                  onClick={onClose}
                  className="drawer-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="drawer-confirm-btn"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
