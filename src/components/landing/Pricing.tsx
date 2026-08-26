'use client';

import { motion } from 'framer-motion';
import { Check, Sparkles } from '@/components/ui/icon-library';
import AuthButton from './AuthButton';

export default function Pricing() {
  return (
    <section className="pt-20 sm:pt-28 md:pt-32 px-4 sm:px-6 md:px-10 pb-0 bg-transparent w-full" id="pricing">
      <div className="max-w-248 mx-auto flex flex-col gap-8 sm:gap-14 items-center">

        {/* Heading */}
        <div className="flex flex-col gap-4 sm:gap-6 items-center text-center max-w-130 w-full">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-tv-border text-plt-subtle text-xs font-medium w-fit"
          >
            <Sparkles size={16} className="text-tv-accent" /> Pricing Plans
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize"
          >
            Discover the Perfect Fit for Your Strategy
          </motion.h2>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-180 mx-auto w-full items-stretch">

          {/* Basic Free Plan */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card-shell p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-medium text-plt-text mb-2">Basic Tier</h3>
              <p className="text-plt-muted text-xs mb-6">Perfect for swing traders and investors executing End-of-Day.</p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-medium text-plt-text">Free</span>
                <span className="text-plt-muted text-xs">/ forever</span>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  'End-of-Day EGX30 Algorithmic Signals',
                  'Daily Market Screener & Momentum Scan',
                  'Basic PSI Indicator Visualizations',
                  'Historical Backtest Performance Overview',
                  'Community Discord Access',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-plt-subtle text-xs sm:text-body">
                    <div className="w-4 h-4 rounded-full bg-plt-hover flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 text-plt-text" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <AuthButton variant="outline" className="w-full">
              Get Started Free
            </AuthButton>
          </motion.div>

          {/* Pro Plan (Highlighted) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.15 }}
            className="card-shell p-6 sm:p-8 relative flex flex-col justify-between"
          >
            {/* Pill */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-tv-accent text-plt-text text-mini font-medium px-4 py-2 rounded-full tracking-wider shadow-md">
              Most Popular
            </div>

            <div>
              <h3 className="text-xl font-medium text-plt-text mb-2">Pro Trader</h3>
              <p className="text-plt-muted text-xs mb-6">For active traders requiring instant intraday execution alerts.</p>

              <div className="mb-6 flex items-baseline gap-2">
                <span className="text-4xl font-medium text-plt-text">500</span>
                <span className="text-plt-muted text-xs">EGP / month</span>
              </div>

              <ul className="space-y-4 mb-8">
                {[
                  'Sub-Second Real-Time Push Notifications',
                  'Intraday Timeframe Signals (15m, 1h, 4h, 1D)',
                  'Full Customizable Strategy Parameters',
                  'TradingView Lightweight Live Replays',
                  'Automated Portfolio Snapshots & Mark-to-Market',
                  'Priority 24/7 VIP Support',
                ].map((feat, i) => (
                  <li key={i} className="flex items-center gap-2 text-plt-text/90 text-xs sm:text-body">
                    <div className="w-4 h-4 rounded-full bg-tv-accent/20 flex items-center justify-center shrink-0">
                      <Check className="w-2 h-2 text-tv-accent" />
                    </div>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <AuthButton variant="primary" className="w-full shadow-accent">
              Unlock Pro Access
            </AuthButton>
          </motion.div>

        </div>

      </div>
    </section>
  );
}
