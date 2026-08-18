'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from 'lucide-react';
import AuthButton from './AuthButton';

export default function Pricing() {
  return (
    <section className="pt-[128px] px-5 md:px-[40px] pb-0 bg-transparent w-full" id="pricing">
      <div className="max-w-[992px] mx-auto flex flex-col gap-[58px] items-center">
        
        {/* Heading */}
        <div className="flex flex-col gap-6 items-center text-center max-w-[520px] w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-tv-border text-white/80 text-xs font-medium w-fit"
          >
            <Sparkles size={13} className="text-tv-accent" /> Pricing Plans
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[32px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize"
          >
            Discover the Perfect Fit for Your Strategy
          </motion.h2>
        </div>

        {/* Pricing Cards Grid (scaled 80%: max-w-[720px]) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[720px] mx-auto w-full items-stretch">
          
          {/* Basic Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#0f0f0f] border border-[rgba(255,255,255,0.12)] rounded-xl p-6 md:p-8 flex flex-col justify-between shadow-xl"
          >
            <div>
              <h3 className="text-xl font-bold text-white mb-1.5">Basic Tier</h3>
              <p className="text-white/50 text-xs mb-5">Perfect for swing traders and investors executing End-of-Day.</p>
              
              <div className="mb-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">Free</span>
                <span className="text-white/40 text-xs">/ forever</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  'End-of-Day EGX30 Algorithmic Signals',
                  'Daily Market Screener & Momentum Scan',
                  'Basic PSI Indicator Visualizations',
                  'Historical Backtest Performance Overview',
                  'Community Discord Access',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white/80 text-xs sm:text-[13px]">
                    <div className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <AuthButton variant="outline" className="w-full py-3 text-xs font-semibold rounded-lg border-white/20 hover:border-white/40">
              Get Started Free
            </AuthButton>
          </motion.div>

          {/* Pro Plan (Highlighted) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="bg-[#120e0c] border-2 border-tv-accent relative rounded-xl p-6 md:p-8 flex flex-col justify-between shadow-[0_0_40px_rgba(254,80,0,0.18)]"
          >
            {/* Pill */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tv-accent text-white text-[10px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-md">
              Most Popular
            </div>

            <div>
              <h3 className="text-xl font-bold text-white mb-1.5">Pro Trader</h3>
              <p className="text-white/50 text-xs mb-5">For active traders requiring instant intraday execution alerts.</p>
              
              <div className="mb-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-white">500</span>
                <span className="text-white/50 text-xs">EGP / month</span>
              </div>
              
              <ul className="space-y-3 mb-8">
                {[
                  'Sub-Second Real-Time Push Notifications',
                  'Intraday Timeframe Signals (15m, 1h, 4h, 1D)',
                  'Full Customizable Strategy Parameters',
                  'TradingView Lightweight Live Replays',
                  'Automated Portfolio Snapshots & Mark-to-Market',
                  'Priority 24/7 VIP Support',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-white/90 text-xs sm:text-[13px]">
                    <div className="w-4 h-4 rounded-full bg-tv-accent/20 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-tv-accent" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <AuthButton variant="primary" className="w-full py-3 text-xs font-semibold rounded-lg shadow-[0_0_16px_rgba(254,80,0,0.3)]">
              Upgrade to Pro
            </AuthButton>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
