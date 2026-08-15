'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const faqs = [
  {
    question: 'How accurate is the QuantEGX PSI strategy?',
    answer: 'The PSI (Price-Structure-Index) strategy has been rigorously backtested across 15 years of Egyptian Stock Exchange (EGX) historical data. While past performance does not guarantee future results, our algorithms consistently achieve a win rate above 65% with strict adherence to the calculated stop-loss and profit target rules.',
  },
  {
    question: 'Do I need to keep the app open to receive alerts?',
    answer: 'No! Our signal engine operates 24/7 on dedicated cloud infrastructure. Once you enable push notifications in your browser or on mobile, you will receive real-time alerts the moment a buy or sell trigger condition is met during EGX trading hours (10:00 AM – 2:30 PM Cairo time).',
  },
  {
    question: 'Does QuantEGX execute trades directly with my broker?',
    answer: 'QuantEGX is an institutional-grade decision intelligence and signal generation platform. We provide precise entry points, stop-loss levels, and dynamic position sizing. You execute trades directly with your preferred EGX broker (such as Thndr, EFG Hermes, CI Capital, or Beltone).',
  },
  {
    question: 'Can I customize the strategy parameters for specific tickers?',
    answer: 'Yes! Pro members can customize the PSI lookback periods, ATR volatility multipliers, and trailing stop rules. You can optimize strategies for high-beta stocks like FWRY or COMI, or stick to our default pre-optimized presets.',
  },
  {
    question: 'How often is historical EGX price data updated?',
    answer: 'End-of-day price histories and daily OHLCV bars are automatically reconciled every trading day at 3:00 PM Cairo time. Live intraday feeds stream throughout market hours.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="py-[112px] px-5 md:px-[40px] bg-transparent w-full" id="faq">
      <div className="max-w-[680px] mx-auto">
        
        {/* Heading */}
        <div className="text-center mb-12 flex flex-col gap-3 items-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-xs uppercase tracking-widest font-semibold">
            <HelpCircle size={13} className="text-tv-accent" /> Questions & Answers
          </div>
          <h2 className="text-[32px] md:text-[45px] font-medium text-white leading-[1.2] tracking-[-0.02em] capitalize">
            Frequently Asked Questions
          </h2>
          <p className="text-white/60 text-xs sm:text-sm max-w-md">
            Everything you need to know about our quantitative signals, pricing, and execution.
          </p>
        </div>

        {/* Accordion List (scaled 80%) */}
        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div 
                key={idx} 
                className={`border rounded-xl overflow-hidden transition-all duration-200 ${
                  isOpen 
                    ? 'border-tv-accent/40 bg-[#120e0c] shadow-lg shadow-tv-accent/5' 
                    : 'border-white/10 bg-[#0a0a0a]/80 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-5 text-left gap-3"
                >
                  <span className="text-sm md:text-[15px] font-medium text-white/90 leading-snug">
                    {faq.question}
                  </span>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-tv-accent text-white' : 'bg-white/5 text-white/50'
                  }`}>
                    {isOpen ? <Minus size={14} /> : <Plus size={14} />}
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-white/70 text-xs sm:text-sm leading-relaxed border-t border-white/5 pt-3.5">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
