import React from 'react';

export default function Loading() {
  return (
    <div className="flex-1 w-full h-full flex flex-col items-center justify-center bg-tv-base">
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <div className="w-16 h-16 rounded-full border-2 border-tv-accent/20 border-t-tv-accent animate-spin" />
        {/* Inner pulsing core */}
        <div className="absolute w-6 h-6 rounded-full bg-tv-accent/20 animate-pulse" />
      </div>
    </div>
  );
}
