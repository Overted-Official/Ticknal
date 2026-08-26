'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Landmark, X, Plus } from '@/components/ui/icon-library';
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
                <h3 className="text-xs font-bold text-plt-text tracking-tight font-sans">Add Bank Account</h3>
                <p className="text-[10px] text-plt-muted font-sans mt-0.5">Connect Egyptian or foreign liquid cash accounts</p>
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
                <label className="text-xs font-semibold text-plt-muted font-sans">Select Egyptian Bank</label>
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
                    placeholder="e.g. Wise, Revolut, Cash Vault, Telda"
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
                  placeholder="e.g. CIB Salary, HSBC USD Savings"
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
                    <option value="BROKER_CASH">Brokerage Cash</option>
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
