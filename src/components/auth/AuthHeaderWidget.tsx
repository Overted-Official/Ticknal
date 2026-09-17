import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthHeaderWidget() {
  return (
    <div className="relative z-10 w-full max-w-5xl flex items-center justify-between py-2 min-w-0">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs sm:text-sm font-sans text-white/60 hover:text-white transition-colors group"
      >
        <span className="transition-transform group-hover:-translate-x-1">←</span>
        <span>Back to Ticknal</span>
      </Link>

      <Link href="/" className="flex items-center gap-2">
        <Image
          src="/logo-mark.svg"
          alt="Ticknal"
          width={20}
          height={20}
          className="w-5 h-5 object-contain"
        />
        <span className="text-white font-medium text-sm tracking-tight">Ticknal</span>
      </Link>
    </div>
  );
}
