'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

const metrics = [
  {
    number: '15+',
    label: 'Years of backtested data',
  },
  {
    number: '98%',
    label: 'Signal Confluence Accuracy',
  },
  {
    number: '32k+',
    label: 'Active signals analyzed',
  },
];

export default function WhyChooseUs() {
  return (
    <section className="py-24 sm:py-32 px-6 sm:px-10 lg:px-14 bg-[#F9F9F9] text-[#080808] w-full overflow-hidden" id="signals">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col items-start text-left">
        {/* Subtitle Badge */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center gap-2 mb-6"
        >
          <span className="w-2 h-2 rounded-[2px] bg-[#969290]" />
          <span className="text-xs font-mono uppercase tracking-widest text-[#969290] font-medium">
            Redefining Trading
          </span>
        </motion.div>

        {/* Section Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-serif font-normal text-[#080808] leading-[1.08] tracking-[-0.03em] max-w-4xl mb-6"
        >
          Supercharge Your Trades With Algorithmic Intelligence
        </motion.h2>

        {/* Intro Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-[#636363] font-sans font-normal leading-relaxed max-w-xl mb-10"
        >
          Ticknal frees you from emotional guesswork and manual charting so you can spot high-probability setups, manage risk dynamically, and compound alpha effortlessly.
        </motion.p>

        {/* Secondary Action Pill Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="mb-20 sm:mb-24"
        >
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#030303] text-white text-sm font-medium hover:bg-zinc-800 transition-colors font-sans"
          >
            Start Trading
          </Link>
        </motion.div>

        {/* 3 Metric Columns with Vertical Line Separators */}
        <div className="w-full border-t border-zinc-200 pt-10 sm:pt-14 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-200">
          {metrics.map((metric, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: idx * 0.15 }}
              className={`flex flex-col justify-between py-6 md:py-0 ${
                idx === 0 ? 'md:pr-10' : idx === 1 ? 'md:px-10' : 'md:pl-10'
              }`}
            >
              <div className="text-6xl sm:text-7xl lg:text-[84px] font-serif font-light text-[#080808] tracking-tight leading-none mb-6">
                {metric.number}
              </div>
              <p className="text-xs uppercase font-mono tracking-widest text-[#8F8B85]">
                {metric.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

