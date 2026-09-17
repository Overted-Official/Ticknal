'use client';

import React, { useState } from 'react';
import type { StrategyOpinion } from '@/lib/multi-strategy-consensus';
import { X } from '@/components/ui/icon-library';
import { signalTone } from './portfolioTypes';

export function TickerLogo({ symbol, logoUrl }: { symbol: string; logoUrl?: string | null }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-plt-hover text-[10px] font-semibold text-plt-muted">
      {logoUrl && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="ticker-logo-image ticker-logo-fill" onError={() => setFailed(true)} />
      ) : (
        symbol.slice(0, 2)
      )}
    </span>
  );
}

export function DecisionChip({
  strategy,
  opinion,
  loading = false,
}: {
  strategy: string;
  opinion?: StrategyOpinion;
  loading?: boolean;
}) {
  const signal = opinion?.signalDate ? opinion.verdict : 'NONE';
  const label = loading ? 'Analyzing…' : signal === 'NONE' ? 'No fresh signal' : signal;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold ${signalTone(signal)}`}
      title={opinion?.reason}
    >
      <span className="text-plt-muted">{strategy}</span>
      <span>{label}</span>
      {opinion?.signalDate && <span className="font-normal opacity-80">· {opinion.barsAgo ?? 0} sessions</span>}
    </span>
  );
}

export function StrategyDecisionCell({
  label,
  opinion,
  loading,
  active = false,
}: {
  label: string;
  opinion?: StrategyOpinion | null;
  loading?: boolean;
  active?: boolean;
}) {
  const hasSignal = Boolean(opinion?.signalDate);
  const signal = hasSignal ? opinion?.verdict : 'NONE';
  const value = loading ? 'Analyzing…' : hasSignal ? opinion?.verdict : 'No fresh signal';
  const meta = loading
    ? 'Loading canonical analysis'
    : hasSignal
      ? `${opinion?.signalDate} · ${opinion?.barsAgo ?? 0} sessions ago`
      : 'Outside selected window';

  return (
    <div className={`strategy-decision-cell ${active ? 'strategy-decision-cell-active' : ''}`} title={opinion?.reason}>
      <div className="strategy-decision-head">
        <span className="strategy-decision-tag">{label}</span>
        <span className={`strategy-decision-value ${signalTone(signal)}`}>{value}</span>
      </div>
      <span className="strategy-decision-meta">{meta}</span>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-plt-muted">{label}</span>
      {children}
    </label>
  );
}

export function DrawerShell({
  title,
  eyebrow,
  onClose,
  children,
}: {
  title: string;
  eyebrow: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-plt-overlay" onMouseDown={onClose}>
      <aside
        className="h-full w-full trade-drawer-width overflow-y-auto bg-plt-base shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between border-b border-plt-border-soft bg-plt-base px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-semibold text-plt-text">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-plt-muted hover:bg-plt-hover hover:text-plt-text cursor-pointer"
            aria-label="Close drawer"
          >
            <X size={17} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </aside>
    </div>
  );
}
