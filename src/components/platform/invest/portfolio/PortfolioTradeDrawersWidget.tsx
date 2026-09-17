'use client';

import React, { useState } from 'react';
import { Check, Loader2 } from '@/components/ui/icon-library';
import type { OpportunitySignal } from '@/lib/opportunities';
import type { HoldingConsensus } from '@/lib/multi-strategy-consensus';
import {
  accountLabel,
  money,
  number,
  opinionFor,
  type Account,
  type HoldingRow,
  type StrategyFilter,
} from './portfolioTypes';
import { DrawerShell, Field } from './portfolioComponents';

interface BuyDrawerProps {
  opportunity: OpportunitySignal;
  accounts: Account[];
  onClose: () => void;
  onError: (message: string) => void;
}

export function BuyDrawer({ opportunity, accounts, onClose, onError }: BuyDrawerProps) {
  const [accountId, setAccountId] = useState(accounts[0] ? String(accounts[0].id) : '');
  const [date, setDate] = useState(opportunity.signal.date);
  const [price, setPrice] = useState(String(opportunity.signal.price));
  const [quantity, setQuantity] = useState('1');
  const [targetPrice, setTargetPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const amount = Number(price || 0) * Number(quantity || 0);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    onError('');
    try {
      const response = await fetch('/api/portfolio/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'BUY',
          accountId: Number(accountId),
          symbol: opportunity.symbol,
          date,
          price: Number(price),
          quantity: Number(quantity),
          targetPrice: targetPrice ? Number(targetPrice) : null,
          stopPrice: stopPrice ? Number(stopPrice) : null,
          strategyId: opportunity.strategyId,
          signalDate: opportunity.signal.date,
          signalPrice: opportunity.signal.price,
          notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Buy could not be completed');
      window.location.reload();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Buy could not be completed');
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell title={`Buy ${opportunity.symbol}`} eyebrow="Live trade" onClose={onClose}>
      <div className="mb-4 rounded-lg bg-plt-warning-soft px-3 py-2.5 text-[11px] text-plt-muted">
        <span className="font-semibold text-plt-text">This creates a live open position and debits brokerage cash.</span>
        <br />
        Signal: {opportunity.strategyShortName} BUY on {opportunity.signal.date} at {number(opportunity.signal.price, 2)}.
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-lg bg-plt-risk-soft p-3 text-xs text-plt-risk">
          An EGP brokerage account is required.{' '}
          <a href="/wallet?tab=banks" className="font-semibold underline">
            Open Accounts
          </a>{' '}
          to create one.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Brokerage account">
            <select
              required
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {accountLabel(account)} · {money(Number(account.balance))}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry date">
              <input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
              />
            </Field>
            <Field label="Entry price">
              <input
                required
                type="number"
                min="0.0001"
                step="0.0001"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
              />
            </Field>
          </div>
          <Field label="Quantity">
            <input
              required
              type="number"
              min="0.0001"
              step="0.0001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Target price">
              <input
                type="number"
                min="0"
                step="0.0001"
                value={targetPrice}
                onChange={(event) => setTargetPrice(event.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted"
              />
            </Field>
            <Field label="Stop price">
              <input
                type="number"
                min="0"
                step="0.0001"
                value={stopPrice}
                onChange={(event) => setStopPrice(event.target.value)}
                placeholder="Optional"
                className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted"
              />
            </Field>
          </div>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional trade note"
              className="w-full resize-none rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted"
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg bg-plt-card px-3 py-3 text-xs">
            <span className="text-plt-muted">Trade amount</span>
            <span className="font-semibold text-plt-text">{money(amount)}</span>
          </div>
          <button
            type="submit"
            disabled={isSaving || !accountId}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-plt-accent px-3 py-3 text-xs font-semibold text-plt-base disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{' '}
            {isSaving ? 'Executing…' : 'Execute live buy'}
          </button>
        </form>
      )}
    </DrawerShell>
  );
}

interface SellDrawerProps {
  holding: HoldingRow;
  accounts: Account[];
  consensus?: HoldingConsensus;
  strategy: StrategyFilter;
  onClose: () => void;
  onError: (message: string) => void;
}

export function SellDrawer({
  holding,
  accounts,
  consensus,
  strategy,
  onClose,
  onError,
}: SellDrawerProps) {
  const defaultAccount = holding.accountIds[0] || accounts[0]?.id;
  const [accountId, setAccountId] = useState(defaultAccount ? String(defaultAccount) : '');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [price, setPrice] = useState(String(holding.currentPrice));
  const [quantity, setQuantity] = useState(String(holding.quantity));
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const opinion = opinionFor(consensus, strategy) || consensus?.opinions.psiV2;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    onError('');
    try {
      const response = await fetch('/api/portfolio/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SELL',
          accountId: Number(accountId),
          symbol: holding.symbol,
          date,
          price: Number(price),
          quantity: Number(quantity),
          strategyId: opinion?.strategyId,
          signalDate: opinion?.signalDate,
          signalPrice: opinion?.price,
          notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Sell could not be completed');
      window.location.reload();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Sell could not be completed');
      setIsSaving(false);
    }
  };

  return (
    <DrawerShell title={`Sell ${holding.symbol}`} eyebrow="Live trade" onClose={onClose}>
      <div className="mb-4 rounded-lg bg-plt-warning-soft px-3 py-2.5 text-[11px] text-plt-muted">
        <span className="font-semibold text-plt-text">This reduces live lots and credits brokerage cash.</span>
        <br />
        FIFO is applied within the selected brokerage account. Aggregated holding quantity:{' '}
        {number(holding.quantity, 2)}.
      </div>
      {accounts.length === 0 ? (
        <div className="rounded-lg bg-plt-risk-soft p-3 text-xs text-plt-risk">
          No EGP brokerage account is linked to this holding.
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Brokerage account">
            <select
              required
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
            >
              {accounts
                .filter((account) => holding.accountIds.includes(account.id) || account.id === Number(accountId))
                .map((account) => (
                  <option key={account.id} value={account.id}>
                    {accountLabel(account)} · {money(Number(account.balance))}
                  </option>
                ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Exit date">
              <input
                required
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
              />
            </Field>
            <Field label="Exit price">
              <input
                required
                type="number"
                min="0.0001"
                step="0.0001"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
              />
            </Field>
          </div>
          <Field label="Quantity to sell">
            <input
              required
              type="number"
              min="0.0001"
              max={holding.quantity}
              step="0.0001"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none"
            />
          </Field>
          <Field label="Notes">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Optional exit note"
              className="w-full resize-none rounded-lg bg-plt-card px-3 py-2.5 text-xs text-plt-text outline-none placeholder:text-plt-muted"
            />
          </Field>
          <div className="flex items-center justify-between rounded-lg bg-plt-card px-3 py-3 text-xs">
            <span className="text-plt-muted">Expected proceeds</span>
            <span className="font-semibold text-plt-text">{money(Number(price || 0) * Number(quantity || 0))}</span>
          </div>
          <button
            type="submit"
            disabled={isSaving || !accountId}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-plt-risk px-3 py-3 text-xs font-semibold text-plt-base disabled:opacity-60 cursor-pointer"
          >
            {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}{' '}
            {isSaving ? 'Executing…' : 'Execute live sell'}
          </button>
        </form>
      )}
    </DrawerShell>
  );
}
