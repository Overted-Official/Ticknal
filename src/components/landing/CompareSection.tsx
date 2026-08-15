'use client';

import { motion } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';

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
    <section className="pt-[128px] px-5 md:px-[40px] pb-0 bg-transparent w-full">
      <div className="max-w-[992px] mx-auto flex flex-col gap-[48px] items-center">
        
        {/* Heading */}
        <div className="flex flex-col gap-6 items-center text-center max-w-[654px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-tv-border text-white/80 text-xs font-medium w-fit"
          >
            <Sparkles size={13} className="text-tv-accent" /> Platform Comparison
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[32px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize"
          >
            Why QuantEGX Leaves Others Behind
          </motion.h2>
        </div>

        {/* Table (scaled 80%) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-full overflow-x-auto rounded-xl border border-[rgba(255,255,255,0.16)] bg-[#0a0a0a]/80 backdrop-blur-md shadow-xl"
        >
          <table className="w-full min-w-[600px] text-left border-collapse">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.12)] bg-[#1a1717]/80">
                <th className="py-4 px-6 text-sm font-semibold text-white/90">Features & Capabilities</th>
                <th className="py-4 px-6 text-sm font-bold text-tv-accent bg-tv-accent/10 border-x border-tv-accent/20">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-tv-accent animate-pulse" />
                    QuantEGX
                  </div>
                </th>
                <th className="py-4 px-6 text-xs font-medium text-white/60">Manual Trading</th>
                <th className="py-4 px-6 text-xs font-medium text-white/60">Legacy Screeners</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-[13px]">
              {comparisonData.map((row, idx) => (
                <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-6 font-medium text-white/90">{row.feature}</td>
                  
                  {/* QuantEGX Column */}
                  <td className="py-3.5 px-6 bg-tv-accent/5 border-x border-tv-accent/20">
                    <div className="flex items-center gap-2 text-tv-accent font-semibold text-xs">
                      <div className="w-5 h-5 rounded-full bg-tv-accent/20 flex items-center justify-center">
                        <Check size={12} className="text-tv-accent" />
                      </div>
                      Included
                    </div>
                  </td>

                  {/* Manual Trading */}
                  <td className="py-3.5 px-6 text-white/50">
                    {typeof row.manual === 'boolean' ? (
                      row.manual ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <X size={14} className="text-white/30" />
                      )
                    ) : (
                      <span>{row.manual}</span>
                    )}
                  </td>

                  {/* Legacy Screeners */}
                  <td className="py-3.5 px-6 text-white/50">
                    {typeof row.others === 'boolean' ? (
                      row.others ? (
                        <Check size={14} className="text-emerald-400" />
                      ) : (
                        <X size={14} className="text-white/30" />
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
