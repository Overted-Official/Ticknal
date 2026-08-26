'use client';

import { motion } from 'framer-motion';
import { Check, X, Sparkles } from '@/components/ui/icon-library';

const comparisonData = [
  {
    feature: 'Real-Time EGX Ingestion',
    quantEGX: true,
    manual: false,
    others: 'Delayed (15m+)',
  },
  {
    feature: 'Proprietary PSI & Kronos Models',
    quantEGX: true,
    manual: false,
    others: false,
  },
  {
    feature: 'Automated Push Notifications',
    quantEGX: true,
    manual: false,
    others: 'Email Only',
  },
  {
    feature: '15-Year Backtested Win Rates',
    quantEGX: true,
    manual: false,
    others: false,
  },
  {
    feature: 'Interactive TradingView Integration',
    quantEGX: true,
    manual: 'Basic Static',
    others: 'Separate Tab',
  },
  {
    feature: 'Intraday Strategy Confluence (15m, 1h, 1D)',
    quantEGX: true,
    manual: false,
    others: 'End of Day Only',
  },
  {
    feature: 'Automated Portfolio Growth Snapshots',
    quantEGX: true,
    manual: 'Manual Excel',
    others: 'Basic PnL',
  },
];

export default function CompareSection() {
  return (
    <section className="pt-20 sm:pt-28 md:pt-32 px-4 sm:px-6 md:px-10 pb-0 bg-transparent w-full overflow-hidden" id="compare">
      <div className="max-w-248 mx-auto flex flex-col gap-8 sm:gap-12 items-center">

        {/* Heading */}
        <div className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-164 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-tv-border text-plt-subtle text-xs font-medium w-fit"
          >
            <Sparkles size={16} className="text-tv-accent" /> Platform Comparison
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize"
          >
            Why QuantEGX Leaves Others Behind
          </motion.h2>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="card-shell surface-flush w-full overflow-x-auto backdrop-blur-md"
        >
          <table className="data-table w-full min-w-150 text-left border-collapse">
            <thead>
              <tr className="border-b border-plt-border bg-plt-muted-surface/80">
                <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-plt-text/90">Features & Capabilities</th>
                <th className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-tv-accent bg-tv-accent/10 border-x border-tv-accent/20">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tv-accent animate-pulse" />
                    QuantEGX
                  </div>
                </th>
                <th className="p-3 sm:p-4 text-xs font-medium text-plt-subtle">Manual Trading</th>
                <th className="p-3 sm:p-4 text-xs font-medium text-plt-subtle">Legacy Screeners</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-plt-border-soft text-xs sm:text-body">
              {comparisonData.map((row, idx) => (
                <tr key={idx} className="hover:bg-plt-hover transition-colors">
                  <td className="p-3 sm:p-4 font-medium text-plt-text/90">{row.feature}</td>

                  {/* QuantEGX Column */}
                  <td className="p-3 sm:p-4 bg-tv-accent/5 border-x border-tv-accent/20">
                    <div className="flex items-center gap-2 text-tv-accent font-medium text-xs sm:text-sm">
                      <div className="w-5 h-5 rounded-full bg-tv-accent/20 flex items-center justify-center">
                        <Check size={14} className="text-tv-accent" />
                      </div>
                      Included
                    </div>
                  </td>

                  {/* Manual Trading */}
                  <td className="p-3 sm:p-4 text-plt-muted">
                    {typeof row.manual === 'boolean' ? (
                      row.manual ? (
                        <Check size={16} className="text-plt-profit" />
                      ) : (
                        <X size={16} className="text-plt-faint" />
                      )
                    ) : (
                      <span>{row.manual}</span>
                    )}
                  </td>

                  {/* Legacy Screeners */}
                  <td className="p-3 sm:p-4 text-plt-muted">
                    {typeof row.others === 'boolean' ? (
                      row.others ? (
                        <Check size={16} className="text-plt-profit" />
                      ) : (
                        <X size={16} className="text-plt-faint" />
                      )
                    ) : (
                      <span>{row.others}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

      </div>
    </section>
  );
}
