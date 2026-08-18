'use client';

import { motion } from 'framer-motion';
import AuthButton from './AuthButton';
import { ArrowRight, Sparkles } from 'lucide-react';

export default function QuickStartSection() {
  return (
    <section className="pt-[112px] px-5 md:px-[40px] pb-[64px] bg-transparent w-full">
      <div className="max-w-[992px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative rounded-2xl p-8 md:p-14 border border-[rgba(255,255,255,0.16)] bg-gradient-to-b from-[#14100e] to-[#0a0a0a] text-center overflow-hidden shadow-[0_0_60px_rgba(254,80,0,0.12)]"
        >
          {/* Radial Accent Glows */}
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[480px] h-[240px] bg-tv-accent/20 rounded-full blur-[100px] pointer-events-none" />
          <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[320px] h-[160px] bg-tv-accent/15 rounded-full blur-[80px] pointer-events-none" />

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center gap-5 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px] uppercase tracking-widest font-semibold">
              <Sparkles size={12} className="text-tv-accent" /> Start Trading Quantitative Models
            </div>

            <h2 className="text-3xl md:text-[48px] font-bold text-white tracking-tight leading-[1.1]">
              Ready to automate your trading?
            </h2>

            <p className="text-sm sm:text-base text-white/70 max-w-lg leading-relaxed">
              Join QuantEGX today and get immediate access to proprietary signals, mark-to-market backtests, and real-time alerts for the Egyptian Stock Exchange.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3 mt-3 w-full sm:w-auto">
              <AuthButton
                variant="primary"
                className="w-full sm:w-auto px-7 py-3 text-xs md:text-sm font-semibold rounded-full flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(254,80,0,0.3)]"
              >
                Get Started Now <ArrowRight size={15} />
              </AuthButton>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
