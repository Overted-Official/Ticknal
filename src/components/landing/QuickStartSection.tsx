'use client';

import { motion } from 'framer-motion';
import AuthButton from './AuthButton';
import { ArrowRight, Sparkles } from '@/components/ui/icon-library';

export default function QuickStartSection() {
  return (
    <section className="pt-20 sm:pt-28 px-4 sm:px-6 md:px-10 pb-12 sm:pb-16 bg-transparent w-full">
      <div className="max-w-248 mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-2xl p-6 sm:p-10 md:p-14 border border-plt-border-strong bg-gradient-to-b from-plt-accent-soft to-plt-base text-center overflow-hidden shadow-accent"
        >
          {/* Radial Accent Glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-120 h-60 bg-tv-accent/20 rounded-full blur-26 pointer-events-none" />
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-tv-accent/15 rounded-full blur-20 pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-6 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-plt-border text-plt-subtle text-caption tracking-widest font-medium">
              <Sparkles size={16} className="text-tv-accent" /> Start Trading Quantitative Models
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-hero-sm font-medium text-plt-text tracking-tight leading-hero">
              Ready to automate your trading?
            </h2>

            <p className="text-xs sm:text-base text-plt-subtle max-w-lg leading-relaxed">
              Join Ticknal today and get immediate access to proprietary signals, mark-to-market backtests, and real-time alerts for the Egyptian Stock Exchange.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2 mt-4 w-full sm:w-auto">
              <AuthButton
                variant="primary"
                className="w-full sm:w-auto"
              >
                Get Started Now <ArrowRight size={16} />
              </AuthButton>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
