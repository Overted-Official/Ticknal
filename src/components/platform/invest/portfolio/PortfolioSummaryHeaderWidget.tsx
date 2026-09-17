'use client';

import React from 'react';
import {
  LineChart,
  WalletCards,
  BarChart3,
  ArrowDownRight,
  Zap,
} from '@/components/ui/icon-library';
import { money, STRATEGIES, type StrategyFilter } from './portfolioTypes';

interface PortfolioSummaryHeaderWidgetProps {
  investedValue: number;
  brokerageCash: number;
  hasBrokerage: boolean;
  totalPortfolioValue: number;
  freshSellDisplay: string;
  freshSellCount: number;
  freshOpportunityDisplay: string;
  freshness: number;
  strategy: StrategyFilter;
  isLoadingConsensus: boolean;
  linkedEgpBrokerageCount: number;
}

export default function PortfolioSummaryHeaderWidget({
  investedValue,
  brokerageCash,
  hasBrokerage,
  totalPortfolioValue,
  freshSellDisplay,
  freshSellCount,
  freshOpportunityDisplay,
  freshness,
  strategy,
  isLoadingConsensus,
  linkedEgpBrokerageCount,
}: PortfolioSummaryHeaderWidgetProps) {
  const cards = [
    {
      label: 'Invested value',
      value: money(investedValue),
      note: 'Open holdings at latest price',
      tone: 'text-plt-text',
      icon: LineChart,
    },
    {
      label: 'Brokerage cash',
      value: hasBrokerage ? money(brokerageCash) : 'Not linked',
      note: hasBrokerage
        ? `${linkedEgpBrokerageCount} linked EGP account${linkedEgpBrokerageCount === 1 ? '' : 's'}`
        : 'Create an EGP brokerage account',
      tone: hasBrokerage ? 'text-plt-profit' : 'text-plt-warning',
      icon: WalletCards,
    },
    {
      label: 'Total portfolio value',
      value: hasBrokerage ? money(totalPortfolioValue) : money(investedValue),
      note: hasBrokerage ? 'Invested value + brokerage cash' : 'Cash excluded until linked',
      tone: 'text-plt-text',
      icon: BarChart3,
    },
    {
      label: 'Fresh sell decisions',
      value: freshSellDisplay,
      note: `Within ${freshness} trading sessions`,
      tone: isLoadingConsensus ? 'text-plt-muted' : freshSellCount > 0 ? 'text-plt-risk' : 'text-plt-profit',
      icon: ArrowDownRight,
    },
    {
      label: 'Fresh buy opportunities',
      value: freshOpportunityDisplay,
      note: `Unheld · ${freshness} trading sessions`,
      tone: 'text-plt-accent',
      icon: Zap,
    },
  ];

  return (
    <div className="w-full min-w-0 relative">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-plt-accent">01 · High-level insights</p>
          <h2 className="mt-1 text-base font-semibold text-plt-text">Capital, risk, and today’s decisions</h2>
        </div>
        <span className="text-[11px] text-plt-muted">
          {strategy === 'all' ? 'Competing strategy view' : `${STRATEGIES.find((item) => item.id === strategy)?.label} view`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl bg-plt-card/55 px-3.5 py-3 min-w-0">
              <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-plt-muted">
                <span className="truncate">{card.label}</span>
                <Icon size={14} className={`${card.tone} shrink-0`} />
              </div>
              <div className={`mt-2 text-lg font-semibold truncate ${card.tone}`}>{card.value}</div>
              <p className="mt-1 text-[10px] text-plt-muted truncate">{card.note}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
