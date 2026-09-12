'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const steps = [
  {
    number: '01',
    title: 'Eliminate Blind Entries',
    subtitle: 'Proprietary PSI & Thoth models that quantify trend momentum and institutional liquidity',
    targetId: 'card1',
  },
  {
    number: '02',
    title: 'Execute With Discipline',
    subtitle: 'Multi-timeframe signal confluence (15m, 1h, 1D) with strict risk-to-reward ratios',
    targetId: 'card2',
  },
  {
    number: '03',
    title: 'Compound Capital Safely',
    subtitle: 'Automated drawdown safeguards, portfolio health analytics, and multi-asset tracking',
    targetId: 'card3',
  },
];

export default function BentoGrid() {
  const [activeStep, setActiveStep] = useState(0);
  const card1Ref = useRef<HTMLDivElement>(null);
  const card2Ref = useRef<HTMLDivElement>(null);
  const card3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const refs = [card1Ref, card2Ref, card3Ref];
      const scrollPos = window.scrollY + 350;

      for (let i = refs.length - 1; i >= 0; i--) {
        const el = refs[i].current;
        if (el && el.offsetTop <= scrollPos) {
          setActiveStep(i);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToCard = (id: string, idx: number) => {
    setActiveStep(idx);
    const target = document.getElementById(id);
    if (target) {
      const top = target.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <section className="py-24 sm:py-32 px-6 sm:px-10 lg:px-14 bg-black text-white w-full overflow-hidden" id="strategies">
      <div className="max-w-[1440px] w-full mx-auto">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto mb-20 sm:mb-28">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex items-center gap-2 mb-6"
          >
            <span className="w-2 h-2 rounded-[2px] bg-[#969290]" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#969290] font-medium">
              Platform Intelligence
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl lg:text-[64px] font-serif font-normal text-white leading-[1.08] tracking-[-0.03em] mb-6"
          >
            Built for High-Conviction Traders Who Move Faster
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-base sm:text-lg text-white/60 font-sans font-normal leading-relaxed mb-8"
          >
            Traders spot high-probability setups and protect capital with Ticknal&apos;s automated models.
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

        {/* 2-Column Sticky Layout */}
        <div className="flex flex-col md:flex-row items-start gap-12 lg:gap-20">
          {/* Left Sticky Sidebar */}
          <div className="hidden md:flex flex-col sticky top-36 w-[300px] lg:w-[360px] shrink-0 space-y-8">
            {steps.map((step, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={step.number}
                  type="button"
                  onClick={() => scrollToCard(step.targetId, idx)}
                  className="text-left group cursor-pointer transition-all duration-300"
                >
                  <span
                    className={`text-xs font-mono block mb-1.5 transition-opacity ${
                      isActive ? 'text-white/70' : 'text-white/30 group-hover:text-white/50'
                    }`}
                  >
                    {step.number}
                  </span>
                  <span
                    className={`text-xl lg:text-2xl font-sans block tracking-tight transition-all ${
                      isActive
                        ? 'text-white font-medium'
                        : 'text-white/40 font-normal group-hover:text-white/70'
                    }`}
                  >
                    {step.title}
                  </span>
                  {isActive && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className="text-sm text-white/60 font-sans font-normal mt-2 leading-relaxed"
                    >
                      {step.subtitle}
                    </motion.p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right Cards Stack */}
          <div className="flex-1 w-full space-y-28 lg:space-y-36">
            {/* Card 1: Spot Setups Instantly */}
            <div id="card1" ref={card1Ref} className="space-y-8 scroll-mt-28">
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-[#0e0e0e]">
                <Image
                  src="/images/landing/a2p0UBSYnVNgrzFlVZJHkuWtS9c.png"
                  alt="Signals & Analytics UI"
                  fill
                  className="object-cover"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2">
                <div className="max-w-xl">
                  <h3 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-3">
                    Spot Setups Instantly
                  </h3>
                  <p className="text-sm sm:text-base text-white/60 font-sans leading-relaxed">
                    Algorithmic models scan the entire EGX in real time, detecting breakout volumes, sector rotations, and multi-factor confluence.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="self-start px-5 py-2 rounded-full bg-white text-black text-xs sm:text-sm font-medium hover:bg-white/90 transition-colors shrink-0"
                >
                  Explore Signals
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                <div className="border-l border-white/15 pl-6">
                  <span className="text-xs font-mono text-white/40 block mb-1">01</span>
                  <div className="text-3xl sm:text-4xl font-serif text-white mb-1">15m</div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/50">Intraday Resolution</span>
                </div>
                <div className="border-l border-white/15 pl-6">
                  <span className="text-xs font-mono text-white/40 block mb-1">02</span>
                  <div className="text-3xl sm:text-4xl font-serif text-white mb-1">250+</div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/50">Stocks Monitored 24/7</span>
                </div>
              </div>
            </div>

            {/* Card 2: Trade With Disciplined Rules */}
            <div id="card2" ref={card2Ref} className="space-y-8 scroll-mt-28">
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-[#0e0e0e]">
                <Image
                  src="/images/landing/Xqc6dokkglA8JUl1GKk6RK4Ajw.png"
                  alt="Execution & Strategy UI"
                  fill
                  className="object-cover object-top"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2">
                <div className="max-w-xl">
                  <h3 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-3">
                    Trade With Disciplined Rules
                  </h3>
                  <p className="text-sm sm:text-base text-white/60 font-sans leading-relaxed">
                    Never let emotions dictate execution. Pre-calculated entry points, dynamic profit targets, and trailing stops keep you disciplined.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="self-start px-5 py-2 rounded-full bg-white text-black text-xs sm:text-sm font-medium hover:bg-white/90 transition-colors shrink-0"
                >
                  View Strategies
                </Link>
              </div>

              {/* Light Testimonial Card */}
              <div className="bg-[#EBEBEB] text-[#080808] rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <span className="font-mono text-xs uppercase tracking-widest text-zinc-600 font-semibold">Trader Spotlight</span>
                  </div>
                  <blockquote className="font-serif text-base sm:text-lg text-zinc-900 leading-relaxed mb-6 italic">
                    &quot;Before Ticknal, I was stuck monitoring 15 different charts and missing critical breakouts. With the PSI indicator alerts, I caught the early banking rally and protected my downside with zero stress.&quot;
                  </blockquote>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-900 font-sans">
                      Ahmed El-Sayed
                    </h4>
                    <p className="text-xs uppercase font-mono tracking-wider text-zinc-500 mt-0.5">
                      Head of Equity Trading, Cairo Capital
                    </p>
                  </div>
                </div>

                <div className="relative w-[180px] sm:w-[220px] h-[160px] sm:h-[190px] rounded-xl overflow-hidden shrink-0">
                  <Image
                    src="/images/landing/SCpV8o72gbEYcXjkJO6N8UTTMk.jpg"
                    alt="Ahmed El-Sayed"
                    fill
                    className="object-cover"
                  />
                </div>
              </div>
            </div>

            {/* Card 3: Institutional Risk Intelligence */}
            <div id="card3" ref={card3Ref} className="space-y-8 scroll-mt-28">
              <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden border border-white/10 bg-[#0e0e0e]">
                <Image
                  src="/images/landing/NRv6P1BzvwLSLxmTA6JDSRppPg.png"
                  alt="Portfolio Intelligence UI"
                  fill
                  className="object-cover object-top"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pt-2">
                <div className="max-w-xl">
                  <h3 className="text-3xl sm:text-4xl font-serif font-normal text-white mb-3">
                    Institutional Risk Intelligence
                  </h3>
                  <p className="text-sm sm:text-base text-white/60 font-sans leading-relaxed">
                    Seamlessly tracks open positions, maximum adverse excursion (MAE), sector exposure, and net worth growth across bank accounts and brokerage accounts.
                  </p>
                </div>
                <Link
                  href="/login"
                  className="self-start px-5 py-2 rounded-full bg-white text-black text-xs sm:text-sm font-medium hover:bg-white/90 transition-colors shrink-0"
                >
                  Launch Terminal
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-6 border-t border-white/10">
                <div className="border-l border-white/15 pl-6">
                  <span className="text-xs font-mono text-white/40 block mb-1">01</span>
                  <div className="text-3xl sm:text-4xl font-serif text-white mb-1">+42.8%</div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/50">Average Strategy Alpha</span>
                </div>
                <div className="border-l border-white/15 pl-6">
                  <span className="text-xs font-mono text-white/40 block mb-1">02</span>
                  <div className="text-3xl sm:text-4xl font-serif text-white mb-1">&lt; 4.2%</div>
                  <span className="text-xs font-mono uppercase tracking-widest text-white/50">Controlled Max Drawdown</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
