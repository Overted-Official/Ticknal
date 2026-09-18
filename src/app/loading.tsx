import React from 'react';
import Image from 'next/image';

export default function RootLoading() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[linear-gradient(180deg,#000000_0%,#090307_30%,#1c0a17_65%,#301728_100%)] select-none">
      <div className="relative flex flex-col items-center justify-center">
        {/* Soft ambient plum glow */}
        <div className="absolute -inset-10 rounded-full bg-[#301728]/50 blur-3xl pointer-events-none" />

        {/* Spinner & Centered Flat White Icon */}
        <div className="relative flex items-center justify-center w-24 h-24">
          <div className="absolute inset-0 rounded-full border border-white/10 border-t-white/80 animate-spin" />
          <div className="relative flex items-center justify-center animate-pulse">
            <Image
              src="/logo-mark.svg"
              alt="Ticknal"
              width={42}
              height={42}
              className="object-contain filter drop-shadow-[0_0_16px_rgba(255,255,255,0.25)]"
              priority
            />
          </div>
        </div>
      </div>
    </div>
  );
}
