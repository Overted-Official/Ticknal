'use client';

import React from 'react';
import Image from 'next/image';

export default function LandingDeviceStage() {
  return (
    <div className="relative w-full max-w-6xl xl:max-w-7xl mx-auto mt-4 sm:mt-6 mb-0 flex items-center justify-center select-none font-sans px-2 sm:px-6">
      {/* Stage Wrapper */}
      <div className="relative w-full flex items-center justify-center">
        {/* ============================================================== */}
        {/* DESKTOP / TABLET: iPad Pro 13" M4 Space Black (Landscape)       */}
        {/* Scaled up with bottom bleed - Hidden on mobile (< md)          */}
        {/* ============================================================== */}
        <div className="relative hidden md:flex justify-center items-start w-full overflow-hidden h-[480px] md:h-[520px] lg:h-[580px] xl:h-[640px]">
          <div
            className="relative w-full max-w-[960px] lg:max-w-[1080px] xl:max-w-[1180px] aspect-[2952/2264] shrink-0"
            style={{
              filter: 'drop-shadow(0 30px 70px rgba(0,0,0,0.98))',
            }}
          >
            {/* A. Clean OLED Screen Layer (Clean Empty State) */}
            <div
              className="absolute bg-black overflow-hidden flex flex-col justify-between items-center"
              style={{
                left: '3.39%',
                top: '4.42%',
                width: '93.22%',
                height: '91.17%',
                borderRadius: '24px',
              }}
            >
              {/* Top Space / Minimal indicator */}
              <div className="w-full h-8 flex items-center justify-between px-7 opacity-20 select-none pt-2">
                <span className="text-[11px] font-medium tracking-wider text-zinc-500 tabular-nums">9:41</span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-zinc-600" />
                  <div className="w-4 h-2 rounded-[2px] border border-zinc-600" />
                </div>
              </div>

              {/* Clean Center Monogram */}
              <div className="flex flex-col items-center justify-center gap-2 opacity-20 pointer-events-none select-none my-auto">
                <Image
                  src="/logo-white.svg"
                  alt="Ticknal"
                  width={52}
                  height={52}
                  className="object-contain"
                />
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-full h-8 flex items-center justify-center pb-3 select-none opacity-25">
                <div className="w-40 h-1 bg-white/20 rounded-full" />
              </div>
            </div>

            {/* B. Authentic Apple iPad Pro 13" M4 Space Black Hardware Frame Overlay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mockups/ipad-pro-13-landscape-black.webp"
              alt="iPad Pro 13 M4 Space Black Frame"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              loading="eager"
            />

            {/* C. Subtle Glass Specular Glint */}
            <div
              className="absolute inset-[4.42%_3.39%] rounded-[24px] pointer-events-none mix-blend-screen opacity-25"
              style={{
                background:
                  'linear-gradient(118deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 28%, transparent 52%, transparent 100%)',
              }}
            />
          </div>

          {/* Smooth Atmospheric Bottom Fade for Tablet Bleed */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 lg:h-40 bg-gradient-to-t from-black via-black/85 to-transparent z-20" />
        </div>

        {/* ============================================================== */}
        {/* MOBILE: iPhone 16 Pro Black Titanium                           */}
        {/* Scaled up with bottom bleed - Hidden on desktop (>= md)        */}
        {/* ============================================================== */}
        <div className="relative flex md:hidden justify-center items-start w-full overflow-hidden h-[380px] sm:h-[440px]">
          <div
            className="relative w-[285px] sm:w-[325px] aspect-[1406/2822] shrink-0"
            style={{
              filter:
                'drop-shadow(0 25px 50px rgba(0,0,0,0.98)) drop-shadow(0 8px 16px rgba(0,0,0,0.9))',
            }}
          >
            {/* A. Clean OLED Screen Layer */}
            <div
              className="absolute bg-black overflow-hidden flex flex-col justify-between items-center"
              style={{
                left: '7.25%',
                top: '3.54%',
                width: '85.78%',
                height: '92.91%',
                borderRadius: '42px',
              }}
            >
              {/* Minimal iOS Status Bar */}
              <div className="h-8 sm:h-9 w-full bg-black flex items-center justify-between px-5 text-[9px] sm:text-[10px] font-semibold text-white/35 shrink-0 pt-1.5 select-none">
                <span className="tabular-nums">9:41</span>
                {/* Dynamic Island Spacer */}
                <div className="w-16 h-3 bg-black rounded-full" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px]">5G</span>
                  <div className="w-3.5 h-1.5 rounded-xs border border-white/35 p-0.5 flex items-center">
                    <div className="w-full h-full bg-white/35 rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* Clean Center Monogram */}
              <div className="flex flex-col items-center justify-center gap-1.5 opacity-20 pointer-events-none select-none my-auto">
                <Image
                  src="/logo-white.svg"
                  alt="Ticknal"
                  width={36}
                  height={36}
                  className="object-contain"
                />
              </div>

              {/* iOS Home Indicator Bar */}
              <div className="h-4 w-full flex items-center justify-center pb-1 select-none opacity-25">
                <div className="w-24 h-1 bg-white/20 rounded-full" />
              </div>
            </div>

            {/* B. Authentic Apple iPhone 16 Pro Black Titanium Hardware Frame Overlay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mockups/iphone-16-pro-black.webp"
              alt="iPhone 16 Pro Black Titanium Frame"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              loading="eager"
            />

            {/* C. Subtle Glass Specular Glint */}
            <div
              className="absolute inset-[3.54%_7.25%] rounded-[42px] pointer-events-none mix-blend-screen opacity-20"
              style={{
                background:
                  'linear-gradient(132deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.02) 26%, transparent 48%, transparent 100%)',
              }}
            />
          </div>

          {/* Smooth Atmospheric Bottom Fade for Mobile Bleed */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-28 sm:h-32 bg-gradient-to-t from-black via-black/85 to-transparent z-20" />
        </div>
      </div>
    </div>
  );
}
