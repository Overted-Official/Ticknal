'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const faqs = [
  {
    question: 'Which markets and exchanges does Ticknal support?',
    answer:
      'Ticknal is natively optimized for the Egyptian Exchange (EGX30, EGX70, EGX100, and Tamayuz), covering 250+ listed equities with tick-level data. We also support regional MENA indices and multi-asset tracking.',
  },
  {
    question: 'What are the PSI and Thoth proprietary models?',
    answer:
      'PSI (Proprietary Stock Index) and Thoth are quantitative models calibrated for emerging market liquidity patterns. They identify institutional accumulation, filter false breakouts, and compute high-confluence entry and exit targets.',
  },
  {
    question: 'Do I need coding or quantitative background to use Ticknal?',
    answer:
      'No. Ticknal converts complex quantitative mathematics into clean visual signals, direct entry levels, and automated stop-loss thresholds with one-click interactive TradingView chart integration.',
  },
  {
    question: 'How fast are trade alerts and signals pushed?',
    answer:
      'Signals are delivered with sub-second latency via web push notifications, desktop alerts, and mobile devices the instant multi-timeframe candle confluence is confirmed.',
  },
  {
    question: 'How is my portfolio and financial data protected?',
    answer:
      'We prioritize maximum privacy. Your strategy parameters and portfolio balances are secured with bank-grade encryption, client-side PIN security, and isolated sessions. Your data is never shared.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleAccordion = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-24 sm:py-32 px-6 sm:px-10 lg:px-14 bg-[#F9F9F9] text-[#080808] w-full overflow-hidden" id="faq">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col lg:flex-row items-start justify-between gap-12 lg:gap-20">
        {/* Left Column Header */}
        <div className="lg:w-[420px] shrink-0 flex flex-col items-start text-left">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="w-2 h-2 rounded-[2px] bg-[#969290]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#969290] font-medium">
              FAQ
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-serif font-normal text-[#080808] leading-[1.08] tracking-[-0.03em] mb-6"
          >
            Your Questions<br className="hidden sm:inline" /> Answered
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-[#636363] font-sans font-normal leading-relaxed mb-8 max-w-sm"
          >
            Everything you need to know about Ticknal&apos;s algorithmic signals, market coverage, and execution security.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#030303] text-white text-sm font-medium hover:bg-zinc-800 transition-colors font-sans"
            >
              Start Trading
            </Link>
          </motion.div>
        </div>

        {/* Right Column Accordion */}
        <div className="flex-1 w-full border-t border-b border-zinc-200 divide-y divide-zinc-200">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={idx} className="transition-colors">
                <button
                  type="button"
                  onClick={() => toggleAccordion(idx)}
                  className="w-full py-6 flex items-center justify-between text-left gap-4 group cursor-pointer"
                >
                  <span className="text-base sm:text-lg font-sans font-medium text-[#080808] group-hover:text-zinc-600 transition-colors">
                    {faq.question}
                  </span>
                  <div className="w-6 h-6 flex items-center justify-center text-[#080808] shrink-0">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
                    >
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 text-sm sm:text-base text-[#636363] font-sans font-normal leading-relaxed">
                        {faq.answer}
                      </p>
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

