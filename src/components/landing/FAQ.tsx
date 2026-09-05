'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from '@/components/ui/icon-library';

const faqs = [
  {
    question: 'How accurate is the Ticknal PSI strategy?',
    answer: 'The PSI (Price-Structure-Index) strategy has been rigorously backtested across 15 years of Egyptian Stock Exchange (EGX) historical data. While past performance does not guarantee future results, our algorithms consistently achieve a win rate above 65% with strict adherence to the calculated stop-loss and profit target rules.',
  },
  {
    question: 'Do I need to keep the app open to receive alerts?',
    answer: 'No! Our signal engine operates 24/7 on dedicated cloud infrastructure. Once you enable push notifications in your browser or on mobile, you will receive real-time alerts the moment a buy or sell trigger condition is met during EGX trading hours (10:00 AM – 2:30 PM Cairo time).',
  },
  {
    question: 'Does Ticknal execute trades directly with my broker?',
    answer: 'Ticknal is an institutional-grade decision intelligence and signal generation platform. We provide precise entry points, stop-loss levels, and dynamic position sizing. You execute trades directly with your preferred EGX broker (such as Thndr, EFG Hermes, CI Capital, or Beltone).',
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
    <section className="py-20 sm:py-28 px-4 sm:px-6 md:px-10 bg-transparent w-full max-w-full overflow-hidden" id="faq">
      <div className="max-w-170 w-full max-w-full min-w-0 mx-auto">

        {/* Heading */}
        <div className="text-center mb-8 sm:mb-12 flex flex-col gap-4 items-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-plt-border text-plt-subtle text-xs tracking-widest font-medium">
            <HelpCircle size={16} className="text-tv-accent" /> Questions & Answers
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-display font-medium text-plt-text leading-tight tracking-normal capitalize">
            Frequently Asked Questions
          </h2>
          <p className="text-plt-subtle text-xs sm:text-sm max-w-md">
            Everything you need to know about our quantitative signals, pricing, and execution.
          </p>
        </div>

        {/* Accordion List */}
        <div className="space-y-3 sm:space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`card-shell surface-flush overflow-hidden transition-all duration-200 ${
                  isOpen
                    ? 'bg-plt-accent-soft'
                    : 'hover:border-plt-border-strong'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between p-4 sm:p-5 text-left gap-3 cursor-pointer"
                >
                  <span className="text-sm sm:text-base font-medium text-plt-text leading-snug">
                    {faq.question}
                  </span>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                    isOpen ? 'bg-tv-accent text-plt-text' : 'bg-plt-hover text-plt-muted'
                  }`}>
                    {isOpen ? <Minus size={16} /> : <Plus size={16} />}
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
                      <div className="p-4 sm:p-5 pt-0 text-plt-subtle text-xs sm:text-sm leading-relaxed border-t border-plt-border/50">
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
