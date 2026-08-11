import React from 'react';
import Image from 'next/image';

export default function Loading() {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-tv-base">
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <div className="w-16 h-16 rounded-full border-2 border-tv-accent/20 border-t-tv-accent animate-spin" />
        {/* Inner pulsing core with logo */}
        <div className="absolute w-8 h-8 flex items-center justify-center animate-pulse">
           <Image src="/logo.svg" alt="QuantEGX" width={24} height={24} />
        </div>
      </div>
    </div>
  );
}
