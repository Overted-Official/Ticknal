'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

const partnerLogos = [
  { name: 'Westbridge', src: '/images/landing/bynHVo7ZvHysBYU8fxv4A87JLU.svg', width: 140, height: 26 },
  { name: 'Lattice', src: '/images/landing/rVnY8H86KzqwZXZe8e6z9JDA4.svg', width: 140, height: 26 },
  { name: 'Gantry', src: '/images/landing/RKHz1mTbGeFr3dPLIsJLak.svg', width: 115, height: 24 },
  { name: '53 CAPITAL', src: '/images/landing/YVvnfFSHAbI8EwOuHwLdToqCzBY.svg', width: 105, height: 20 },
  { name: 'NORTHRIDGE', src: '/images/landing/R4DQ1pneIOA2Hn64yiHexN2BgI.svg', width: 145, height: 22 },
  { name: 'Greythorne', src: '/images/landing/QtfbMcpLNJxzcqop0YvedvV2haA.svg', width: 145, height: 24 },
];

export default function Hero() {
  return (
    <section className="relative w-full min-h-[900px] lg:h-[950px] bg-black text-white overflow-hidden flex flex-col justify-between pt-28 sm:pt-36 pb-8 px-6 sm:px-10 lg:px-14">
      {/* Background Hero Image (Trading Terminal Desk) */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/images/landing/hero1.jpg"
          alt="Ticknal Trading Terminal"
          fill
          priority
          className="object-cover object-[center_right] lg:object-right select-none pointer-events-none brightness-90"
        />
        {/* Gradient vignette to ensure crystal-clear headline readability and dramatic candle glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black via-black/70 to-transparent" />
      </div>

      {/* Main Left-Aligned Hero Content */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto my-auto py-12 flex flex-col items-start text-left">
        {/* Announcement Pill Tag */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="#strategies"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.06] border border-white/15 hover:border-white/30 hover:bg-white/[0.1] transition-all text-[13px] text-white/90 backdrop-blur-md font-sans tracking-tight"
          >
            <span>Proprietary PSI V2 &amp; Thoth Models Live</span>
            <span className="text-white/60">→</span>
          </Link>
        </motion.div>

        {/* Dual-Tone Serif Headline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-6 flex flex-col items-start max-w-2xl"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-serif font-normal text-white tracking-[-0.03em] leading-[1.06]">
            Your Hyperintelligent
          </h1>
          <span className="text-4xl sm:text-6xl md:text-7xl lg:text-[76px] font-serif font-normal text-white/40 tracking-[-0.03em] leading-[1.06] mt-1">
            Trading Terminal
          </span>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg text-white/70 font-sans font-normal max-w-md leading-relaxed mb-8"
        >
          Deploy algorithmic strategies, live EGX signals, and institutional risk analytics built for high-conviction traders.
        </motion.p>

        {/* Primary CTA Button */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-white text-black text-[14px] font-medium hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98] transition-all font-sans shadow-[0_4px_24px_rgba(255,255,255,0.18)]"
          >
            Start Trading
          </Link>
        </motion.div>
      </div>

      {/* Enterprise Partner Ticker across the bottom edge */}
      <div className="relative z-10 max-w-[1440px] w-full mx-auto pt-6 border-t border-white/10">
        <div className="flex items-center justify-between gap-8 overflow-hidden py-3">
          <div className="animate-marquee flex items-center shrink-0 gap-12 sm:gap-16">
            {[...partnerLogos, ...partnerLogos].map((logo, idx) => (
              <div
                key={idx}
                className="shrink-0 opacity-70 hover:opacity-100 transition-opacity duration-300"
              >
                <Image
                  src={logo.src}
                  alt={logo.name}
                  width={logo.width}
                  height={logo.height}
                  className="h-5 sm:h-6 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
