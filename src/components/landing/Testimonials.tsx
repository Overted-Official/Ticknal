'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';

const caseStudies = [
  {
    id: 'lattice',
    logo: '/images/landing/rVnY8H86KzqwZXZe8e6z9JDA4.svg',
    logoWidth: 130,
    logoHeight: 26,
    image: '/images/landing/KUP2LdDDrV5R1Zsckb8CtPGqFkA.jpg',
    quote:
      '"The PSI indicator completely transformed my trading. My win rate jumped to 74% and I cut holding losses by 60% with the automated stop-loss warnings."',
    author: 'Karim Mansour',
    role: 'Proprietary Equity Trader',
    hasDetail: true,
  },
  {
    id: '53capital',
    logo: '/images/landing/YVvnfFSHAbI8EwOuHwLdToqCzBY.svg',
    logoWidth: 105,
    logoHeight: 20,
    image: '/images/landing/3CB8SzjV5WthxX6P8td5u4GS4iU.jpg',
    quote:
      '"Sector rotation alerts helped our desk front-run the industrial goods surge. The confluence engine is the sharpest tool on the EGX."',
    author: 'Nouran El-Gendi',
    role: 'Portfolio Manager, Alpha Capital',
    hasDetail: true,
  },
  {
    id: 'northridge',
    logo: '/images/landing/R4DQ1pneIOA2Hn64yiHexN2BgI.svg',
    logoWidth: 140,
    logoHeight: 22,
    image: '/images/landing/tOsVGu77Zl7FrSGYO1RuRGlWFg.jpg',
    quote:
      '"Having automated bank sync, real-time drawdown safeguards, and TradingView charts in one dark terminal delivered our most profitable quarter yet."',
    author: 'Omar Tarek',
    role: 'Managing Director, Nile Quant Fund',
    hasDetail: true,
  },
];

export default function Testimonials() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <section className="py-24 sm:py-32 px-6 sm:px-10 lg:px-14 bg-black text-white w-full overflow-hidden" id="customers">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col items-center">
        {/* Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mb-16 sm:mb-24">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="w-2 h-2 rounded-[2px] bg-[#969290]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#969290] font-medium">
              Trader Performance
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-serif font-normal text-white leading-[1.08] tracking-[-0.03em] mb-6"
          >
            Real Alpha<br />Systematic Results
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-white/60 font-sans font-normal leading-relaxed max-w-xl mb-8"
          >
            Ticknal powers high-performing independent traders, proprietary desks, and institutional portfolios.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.25 }}
          >
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-all font-sans"
            >
              Launch Terminal
            </Link>
          </motion.div>
        </div>

        {/* 3 Large Customer Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 w-full">
          {caseStudies.map((study, idx) => {
            const isExpanded = expandedId === study.id;
            return (
              <motion.div
                key={study.id}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="relative rounded-3xl overflow-hidden border border-white/10 bg-[#0e0e0e] min-h-[480px] sm:min-h-[540px] flex flex-col justify-between p-8 group"
              >
                {/* Background Image with Dark Vignette */}
                <div className="absolute inset-0 z-0">
                  <Image
                    src={study.image}
                    alt={study.author}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105 filter brightness-50"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
                </div>

                {/* Top Client Logo */}
                <div className="relative z-10">
                  <Image
                    src={study.logo}
                    alt="Client Logo"
                    width={study.logoWidth}
                    height={study.logoHeight}
                    className="h-5 sm:h-6 w-auto object-contain filter invert brightness-200"
                  />
                </div>

                {/* Bottom Content / Expandable Area */}
                <div className="relative z-10 mt-auto">
                  {idx === 0 || isExpanded ? (
                    <div>
                      <p className="font-serif text-base sm:text-lg text-white/95 leading-relaxed mb-6 font-light">
                        {study.quote}
                      </p>
                      <div>
                        <h4 className="text-sm font-medium text-white font-sans">
                          {study.author}
                        </h4>
                        <p className="text-xs font-mono uppercase tracking-wider text-white/50 mt-0.5">
                          {study.role}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {idx !== 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(study.id)}
                      className="mt-4 w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 border border-white/20 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer"
                      aria-label="Expand case study"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`}
                      >
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

