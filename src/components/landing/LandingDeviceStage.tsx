'use client';

import React from 'react';
import { HeroIpadScene, HeroPhoneScene } from '@/components/landing/hero-scenes/HeroDeviceScenes';

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
            {/* A. The hardware overlay masks the display to its exact curved opening. */}
            <div
              className="absolute bg-black overflow-hidden"
              style={{
                left: '3.39%',
                top: '4.42%',
                width: '93.22%',
                height: '91.17%',
              }}
            >
              <HeroIpadScene />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-7 items-center justify-between px-7 pt-2 text-[10px] font-medium tracking-wider text-white/30 select-none">
                <span className="tabular-nums">9:41</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-white/25" />
                  <div className="h-2 w-4 border border-white/25" />
                </div>
              </div>
            </div>

            {/* B. Authentic Apple iPad Pro 13" M4 Space Black Hardware Frame Overlay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mockups/ipad-pro-13-landscape-black.webp"
              alt=""
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
            {/* A. Keep the scene square beneath the hardware's display cutout. */}
            <div
              className="absolute bg-black overflow-hidden"
              style={{
                left: '7.25%',
                top: '3.54%',
                width: '85.78%',
                height: '92.91%',
              }}
            >
              <HeroPhoneScene />

              <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-8 items-center justify-between px-5 pt-1.5 text-[9px] font-semibold text-white/35 select-none">
                <span className="tabular-nums">9:41</span>
                <div className="h-3 w-16 rounded-full bg-black" />
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="flex h-1.5 w-3.5 items-center border border-white/35 p-0.5">
                    <div className="h-full w-full bg-white/35" />
                  </div>
                </div>
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-1 z-30 flex h-4 items-center justify-center select-none">
                <div className="h-1 w-24 rounded-full bg-white/30" />
              </div>
            </div>

            {/* B. Authentic Apple iPhone 16 Pro Black Titanium Hardware Frame Overlay */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/mockups/iphone-16-pro-black.webp"
              alt=""
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
