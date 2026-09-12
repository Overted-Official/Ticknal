'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const solutions = [
  {
    id: 'day-trading',
    tabTitle: 'Day Trading',
    title: 'Intraday & Momentum Trading',
    description:
      'Catch 15m and 1h intraday wave structures, volume anomalies, and rapid breakout opportunities with real-time push alerts before price extends.',
    metric: '< 50ms',
    metricLabel: 'Signal generation latency',
    image: '/images/landing/ZrIgReHckPXIuJcXhdtpJBBiFM.jpg',
    logo: '/images/landing/rVnY8H86KzqwZXZe8e6z9JDA4.svg',
    logoWidth: 140,
    logoHeight: 26,
  },
  {
    id: 'swing-trading',
    tabTitle: 'Swing Trading',
    title: 'Multi-Day Swing & Trend Trading',
    description:
      'Leverage 1-Day candle confluence, proprietary PSI index swings, and institutional accumulation footprints to capture sustained market moves.',
    metric: '4.6x',
    metricLabel: 'Average Profit Factor',
    image: '/images/landing/Y925zcva04rWNHDLsGOILkLM.jpg',
    logo: '/images/landing/RKHz1mTbGeFr3dPLIsJLak.svg',
    logoWidth: 120,
    logoHeight: 24,
  },
  {
    id: 'portfolio',
    tabTitle: 'Portfolio Funds',
    title: 'Institutional Asset Allocation',
    description:
      'Systematically track money flows between Banking, Real Estate, Petrochemicals, and Non-Bank Financial sectors to overweight leading industries.',
    metric: '24/7',
    metricLabel: 'Automated risk & exposure monitoring',
    image: '/images/landing/M1oxWnB7xb9RowzhF8iZjEdE.jpg',
    logo: '/images/landing/R4DQ1pneIOA2Hn64yiHexN2BgI.svg',
    logoWidth: 145,
    logoHeight: 22,
  },
  {
    id: 'quant-algos',
    tabTitle: 'Quant & Algos',
    title: 'Algorithmic Confluence & Backtesting',
    description:
      'Verify your trading edge using 15 years of tick-by-tick EGX historical data, Monte Carlo simulations, and multi-factor consensus engine outputs.',
    metric: '15+ Yrs',
    metricLabel: 'Verified historical tick data',
    image: '/images/landing/KUP2LdDDrV5R1Zsckb8CtPGqFkA.jpg',
    logo: '/images/landing/QtfbMcpLNJxzcqop0YvedvV2haA.svg',
    logoWidth: 145,
    logoHeight: 24,
  },
];

export default function LanguagesSection() {
  const [activeTab, setActiveTab] = useState(0);
  const current = solutions[activeTab];

  return (
    <section className="py-24 sm:py-32 px-6 sm:px-10 lg:px-14 bg-[#F9F9F9] text-[#080808] w-full overflow-hidden" id="solutions">
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
            Market Solutions
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
          Built for Every Style of Trading
        </motion.h2>

        {/* Intro Paragraph */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-base sm:text-lg text-[#636363] font-sans font-normal leading-relaxed max-w-xl mb-8"
        >
          Whether you trade intraday momentum or build multi-month sector portfolios, Ticknal delivers systematic conviction.
        </motion.p>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25 }}
          className="mb-14 sm:mb-16"
        >
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#030303] text-white text-sm font-medium hover:bg-zinc-800 transition-colors font-sans"
          >
            Start Trading
          </Link>
        </motion.div>

        {/* 4 Horizontal Underline Tabs */}
        <div className="w-full border-b border-zinc-200 flex items-center gap-8 sm:gap-12 mb-10 overflow-x-auto no-scrollbar">
          {solutions.map((item, idx) => {
            const isActive = activeTab === idx;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`pb-4 text-base sm:text-lg font-sans transition-colors relative cursor-pointer shrink-0 ${
                  isActive ? 'text-[#080808] font-medium' : 'text-[#636363] hover:text-[#080808] font-normal'
                }`}
              >
                <span>{item.tabTitle}</span>
                {isActive && (
                  <motion.div
                    layoutId="solutionsUnderline"
                    className="absolute bottom-0 inset-x-0 h-0.5 bg-[#080808]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Showcase Card */}
        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="w-full rounded-3xl bg-[#E5E5E3] p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center"
            >
              {/* Left Details */}
              <div className="flex flex-col justify-between h-full space-y-8">
                <div>
                  <h3 className="text-3xl sm:text-4xl font-serif font-normal text-[#080808] mb-4">
                    {current.title}
                  </h3>
                  <p className="text-sm sm:text-base text-[#636363] font-sans leading-relaxed">
                    {current.description}
                  </p>
                </div>

                <div>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-[#030303] text-white text-sm font-medium hover:bg-zinc-800 transition-colors font-sans"
                  >
                    Explore Strategy
                  </Link>
                </div>
              </div>

              {/* Right Architectural Image with Logo & Metric */}
              <div className="relative w-full h-[340px] sm:h-[420px] rounded-2xl overflow-hidden bg-black group">
                <Image
                  src={current.image}
                  alt={current.title}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/30" />

                {/* Client Logo Top-Left */}
                <div className="absolute top-6 left-6">
                  <Image
                    src={current.logo}
                    alt="Client Logo"
                    width={current.logoWidth}
                    height={current.logoHeight}
                    className="h-5 sm:h-6 w-auto object-contain filter invert brightness-200"
                  />
                </div>

                {/* Metric Bottom-Left */}
                <div className="absolute bottom-6 left-6">
                  <div className="text-5xl sm:text-6xl font-serif font-light text-white leading-none mb-1">
                    {current.metric}
                  </div>
                  <p className="text-xs uppercase font-mono tracking-widest text-white/70">
                    {current.metricLabel}
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
