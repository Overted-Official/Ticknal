'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import AuthButton from './AuthButton';
import { ArrowUpRight, Play } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative w-full min-h-[697px] lg:h-[697px] bg-black overflow-hidden pt-[80px] md:pt-[90px] px-5 md:px-[40px] pb-10 flex items-center justify-center">
      {/* Layer 1: Base Candlesticks with Overlay Blend so they are colored by the glow */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-40 mix-blend-overlay"
        style={{ 
          backgroundImage: 'url("https://framerusercontent.com/images/zeiaTuQEued5LxPaQBjujd0qsWg.png")',
          filter: 'contrast(1.4) brightness(0.8)'
        }}
      />

      {/* Layer 2: Secondary subtle candlesticks for depth and texture */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-25 mix-blend-color-dodge"
        style={{ 
          backgroundImage: 'url("https://framerusercontent.com/images/zeiaTuQEued5LxPaQBjujd0qsWg.png")',
          filter: 'sepia(1) hue-rotate(-25deg) saturate(4)'
        }}
      />

      {/* Layer 3: Main Glowing Orange Laser Light Beam (on top of candles so beam illuminates them) */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-100"
        style={{ backgroundImage: 'url("https://framerusercontent.com/images/VTRQ7NkPkJjM8d02z85pj0EU1R8.png")' }}
      />

      {/* Layer 4: Ambient Warm Spotlight behind right card */}
      <div className="absolute top-1/2 right-[5%] -translate-y-1/2 w-[450px] h-[450px] bg-radial from-[#FE5000]/20 via-[#d9480f]/10 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Left vignette for maximum headline text readability */}
      <div className="absolute inset-y-0 left-0 w-[45%] bg-gradient-to-r from-black via-black/80 to-transparent z-0 pointer-events-none" />

      {/* Content Wrapper (scaled 80%: 992px) */}
      <div className="max-w-[992px] w-full mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 h-full">
        
        {/* Left Content (scaled 80%: 420px) */}
        <div className="flex flex-col items-start text-left max-w-[420px] gap-6 z-10">
          
          <div className="flex flex-col gap-4">
            {/* Pre-title Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/90 text-xs font-medium hover:bg-white/10 transition-colors w-fit shadow-sm"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-tv-accent shadow-[0_0_6px_#FE5000]" />
              <span>Real-Time Trading Intelligence</span>
              <span className="text-white/40">→</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-[38px] sm:text-[48px] lg:text-[54px] font-medium text-white tracking-[-0.04em] leading-[1.1] capitalize"
            >
              Trade Smarter.<br />
              Scale Faster.
            </motion.h1>
          </div>

          <div className="flex flex-col gap-6 w-full">
            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-white/75 font-normal leading-[1.5] tracking-[0px]"
            >
              Access live analytics, staking insights, and portfolio performance tools designed for fast-moving crypto markets.
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-row items-center gap-3 w-full sm:w-auto"
            >
              <AuthButton
                variant="secondary"
                className="px-[22px] py-[10px] text-xs md:text-sm font-semibold text-black bg-white hover:bg-white/90 flex items-center justify-center gap-1.5 rounded-full shadow-lg"
              >
                Get Started <ArrowUpRight size={15} />
              </AuthButton>
              
              <Link
                href="#features"
                className="px-[22px] py-[10px] text-xs md:text-sm font-semibold text-white bg-gradient-to-r from-[#d9480f] to-[#FE5000] hover:brightness-110 rounded-full transition-all flex items-center justify-center gap-1.5 shadow-[0_0_24px_rgba(254,80,0,0.35)]"
              >
                <Play size={14} fill="currentColor" /> How it works
              </Link>
            </motion.div>
          </div>

        </div>

        {/* Right Content: Framer Glass Card with glow blend */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[360px] lg:w-[352px] h-[400px] lg:h-[450px] relative flex-shrink-0"
        >
          <div 
            className="w-full h-full bg-contain bg-center bg-no-repeat drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
            style={{ backgroundImage: 'url("https://framerusercontent.com/images/AhQ73PjsAiqYpcQkGyFxkp8hyY.png")' }}
          />
        </motion.div>

      </div>
    </section>
  );
}
