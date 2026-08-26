'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import AuthButton from './AuthButton';
import { ArrowUpRight, Play } from '@/components/ui/icon-library';
import Globe from './Globe';

export default function Hero() {
  return (
    <section className="relative w-full min-h-174 lg:h-174 bg-plt-base overflow-hidden pt-20 md:pt-24 px-6 md:px-10 pb-10 flex items-center justify-center">
      {/* Layer 1: Base Candlesticks Grid with Screen blend */}
      <div
        className="hero-market-primary absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-30 mix-blend-screen"
      />

      {/* Layer 2: Secondary subtle candlesticks for depth and texture */}
      <div
        className="hero-market-secondary absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-20 mix-blend-screen"
      />

      {/* Layer 3: Main Glowing Blue Laser Light Beam */}
      <div
        className="hero-beam absolute inset-0 z-0 pointer-events-none bg-cover bg-center bg-no-repeat opacity-100"
      />

      {/* Layer 4: Ambient Glow behind right globe */}
      <div className="absolute top-1/2 right-12 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none z-0" />

      {/* Left vignette for maximum headline text readability */}
      <div className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-black via-black/80 to-transparent z-0 pointer-events-none" />

      {/* Content Wrapper (scaled 80%: 992px) */}
      <div className="max-w-248 w-full mx-auto relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8 h-full">

        {/* Left Content (scaled 80%: 420px) */}
        <div className="flex flex-col items-start text-left max-w-106 gap-6 z-10">

          <div className="flex flex-col gap-4">
            {/* Pre-title Badge */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-plt-hover border border-plt-border text-plt-text/90 text-xs font-medium hover:bg-plt-hover transition-colors w-fit shadow-sm"
            >
              <span className="w-2 h-2 rounded-full bg-tv-accent shadow-accent" />
              <span>Real-Time Trading Intelligence</span>
              <span className="text-plt-muted">→</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-stat sm:text-hero-sm lg:text-hero font-medium text-plt-text tracking-normal leading-hero capitalize"
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
              className="text-sm sm:text-base text-plt-text/75 font-normal leading-body tracking-normal"
            >
              Access live analytics, quantitative signals, and portfolio intelligence tools designed for the Egyptian Exchange (EGX).
            </motion.p>

            {/* Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-row items-center gap-2 w-full sm:w-auto"
            >
              <AuthButton
                variant="secondary"
                className="shadow-lg"
              >
                Get Started <ArrowUpRight size={16} />
              </AuthButton>

              <Link
                href="#features"
                className="btn-token btn-primary"
              >
                <Play size={16} fill="currentColor" /> How it works
              </Link>
            </motion.div>
          </div>

        </div>

        {/* Right Content: Interactive Globe */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-90 lg:w-88 h-100 lg:h-112 relative flex-shrink-0"
        >
          <Globe
            oceanColor="rgba(0,0,0,0)"
            outlineColor="#3b82f6"
            showOutline={true}
            graticuleColor="rgba(59,130,246,0.15)"
            showGrid={true}
            dots={{ color: "#3b82f6", size: 4, density: 7, allDots: false }}
            fill="dots"
            scale={8}
            speed={2}
            smoothing={8}
            direction="left"
            stopOnHover={true}
            outlineWidth={1}
            detail={5}
            markerConfig={{
              markers: [
                { lat: 30.0444, lng: 31.2357 },  // Cairo
                { lat: 25.2048, lng: 55.2708 },  // Dubai
                { lat: 51.5074, lng: -0.1278 },  // London
                { lat: 40.7128, lng: -74.006 },  // New York
              ],
              color: "#60a5fa",
              size: 30,
            }}
          />
        </motion.div>

      </div>
    </section>
  );
}
