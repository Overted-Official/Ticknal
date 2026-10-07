'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from '@/components/ui/icon-library';
import GhostMascot from '@/components/mascot/GhostMascot';
import TicknalBrand from '@/components/ui/TicknalBrand';

export default function NotFound() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/home');
    }
  };

  return (
    <main className="min-h-screen w-full bg-black text-white flex flex-col justify-between items-center p-6 sm:p-10 select-none font-sans relative overflow-hidden">
      {/* Top Header: Brand Logo & Home Navigation */}
      <header className="w-full flex items-center justify-between z-10 max-w-6xl mx-auto">
        <TicknalBrand size="md" />
        <Link
          href="/home"
          className="text-xs sm:text-sm text-zinc-400 hover:text-white transition-colors cursor-pointer"
        >
          Return to platform
        </Link>
      </header>

      {/* Subtle Background Starfield particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[18%] left-[15%] w-1 h-1 bg-white/40 rounded-full animate-pulse" />
        <div
          className="absolute top-[32%] right-[22%] w-1.5 h-1.5 bg-white/30 rounded-full animate-pulse"
          style={{ animationDelay: '1.2s' }}
        />
        <div
          className="absolute top-[65%] left-[25%] w-1 h-1 bg-white/30 rounded-full animate-pulse"
          style={{ animationDelay: '0.7s' }}
        />
        <div
          className="absolute top-[75%] right-[18%] w-1 h-1 bg-white/20 rounded-full animate-pulse"
          style={{ animationDelay: '2s' }}
        />
        <div
          className="absolute top-[48%] left-[8%] w-1 h-1 bg-white/20 rounded-full animate-pulse"
          style={{ animationDelay: '1.5s' }}
        />
        <div
          className="absolute top-[25%] left-[60%] w-1 h-1 bg-white/30 rounded-full animate-pulse"
          style={{ animationDelay: '2.5s' }}
        />
        <div
          className="absolute top-[82%] left-[45%] w-1.5 h-1.5 bg-white/20 rounded-full animate-pulse"
          style={{ animationDelay: '1.8s' }}
        />
      </div>

      {/* Center 404 & Mascot Hero */}
      <div className="flex flex-col items-center justify-center my-auto z-10 py-6 text-center">
        {/* 4 [Ghost Mascot] 4 Row */}
        <div className="flex items-center justify-center gap-1 sm:gap-3 leading-none">
          <span className="font-bold text-[84px] sm:text-[112px] md:text-[140px] text-zinc-300 tracking-tighter select-none font-sans leading-none">
            4
          </span>

          <GhostMascot
            width={150}
            height={190}
            className="w-[120px] h-[150px] sm:w-[140px] sm:h-[175px] md:w-[150px] md:h-[190px] mx-1 sm:mx-3"
          />

          <span className="font-bold text-[84px] sm:text-[112px] md:text-[140px] text-zinc-300 tracking-tighter select-none font-sans leading-none">
            4
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mt-6 sm:mt-8">
          Ups! Lost in Space
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-base text-zinc-400 max-w-md mx-auto mt-3 leading-relaxed px-4">
          Somewhere in the digital cosmos, this page got lost among the stars.
        </p>

        {/* Back Button */}
        <button
          type="button"
          onClick={handleBack}
          className="mt-8 inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#e6e8ec] hover:bg-white text-black font-semibold text-sm transition-all shadow-sm active:scale-[0.98] cursor-pointer group"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </button>
      </div>

      {/* Tiny 404 Footer Reference */}
      <div className="z-10 pb-2">
        <span className="text-xs text-zinc-600 font-medium tracking-wider">
          404
        </span>
      </div>
    </main>
  );
}
