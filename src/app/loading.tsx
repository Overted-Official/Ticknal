import React from 'react';
import Image from 'next/image';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black select-none">
      <div className="relative flex flex-col items-center justify-center">
        {/* Ambient brand glow — cyan/blue/magenta */}
        <div
          className="absolute -inset-16 rounded-full blur-3xl pointer-events-none opacity-30"
          style={{ background: 'radial-gradient(circle, #2962FF 0%, #00BCE6 40%, #D500F9 80%, transparent 100%)' }}
        />

        {/* Spinner ring + Logo */}
        <div className="relative flex items-center justify-center w-24 h-24">
          {/* Gradient spinner arc */}
          <svg
            className="absolute inset-0 animate-spin"
            width="96" height="96" viewBox="0 0 96 96"
            fill="none" xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="spinGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#00BCE6" stopOpacity="0" />
                <stop offset="40%"  stopColor="#2962FF" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#D500F9" stopOpacity="1" />
              </linearGradient>
            </defs>
            <circle cx="48" cy="48" r="44" stroke="url(#spinGrad)" strokeWidth="3" strokeLinecap="round" strokeDasharray="200 76" />
          </svg>
          {/* Faint full ring */}
          <div className="absolute inset-0 rounded-full border border-white/8" />

          {/* Centred logo mark */}
          <div className="relative flex items-center justify-center animate-pulse">
            <Image
              src="/logo-mark.svg"
              alt="Ticknal"
              width={42}
              height={42}
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
