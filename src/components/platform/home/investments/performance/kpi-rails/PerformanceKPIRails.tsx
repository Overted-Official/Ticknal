'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import FinancialsKPIRail from './FinancialsKPIRail';
import TradingMetricsKPIRail from './TradingMetricsKPIRail';
import NetWorthKPIRail from './NetWorthKPIRail';
import BanksKPIRail from './BanksKPIRail';
import { type OrderStats } from '../../homeInvestmentsTypes';
import { type BankAccount, type BankTransaction } from '@/types/bank';

export type PerformanceViewTab = 'net-worth' | 'investments' | 'banks';

interface PerformanceKPIRailsProps {
  activeTab?: PerformanceViewTab;
  orderStats: OrderStats;
  accounts?: BankAccount[];
  transactions?: BankTransaction[];
  usdRate?: number;
  cbeInflationRate?: number;
}

export default function PerformanceKPIRails({
  activeTab = 'investments',
  orderStats,
  accounts = [],
  transactions = [],
  usdRate = 50.20,
  cbeInflationRate = 14.9,
}: PerformanceKPIRailsProps) {
  return (
    <div className="w-full select-none">
      <AnimatePresence mode="wait">
        {activeTab === 'net-worth' && (
          <motion.div
            key="kpi-view-net-worth"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <NetWorthKPIRail
              orderStats={orderStats}
              accounts={accounts}
              usdRate={usdRate}
              cbeInflationRate={cbeInflationRate}
            />
          </motion.div>
        )}

        {activeTab === 'investments' && (
          <motion.div
            key="kpi-view-investments"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full space-y-2 sm:space-y-3"
          >
            {/* Rail 1: Primary Financials */}
            <FinancialsKPIRail orderStats={orderStats} />

            {/* Rail 2: Algorithmic Execution & Risk Metrics */}
            <TradingMetricsKPIRail orderStats={orderStats} />
          </motion.div>
        )}

        {activeTab === 'banks' && (
          <motion.div
            key="kpi-view-banks"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
            <BanksKPIRail
              accounts={accounts}
              transactions={transactions}
              usdRate={usdRate}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
