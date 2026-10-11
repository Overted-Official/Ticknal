'use client';

import React, { useState, useMemo } from 'react';
import { User } from '@/components/ui/icon-library';

interface LedgerUserAvatarProps {
  src: string | null;
  name: string;
  size?: 'sm' | 'md';
}

export default function LedgerUserAvatar({
  src,
  name,
  size = 'md',
}: LedgerUserAvatarProps) {
  const [hasError, setHasError] = useState(false);

  const initials = useMemo(() => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [name]);

  const sizeClasses = size === 'sm' ? 'w-6 h-6 text-[9px]' : 'w-7 h-7 text-[10px]';
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  if (!src || hasError) {
    return (
      <div
        className={`${sizeClasses} rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10 font-semibold text-zinc-300 select-none`}
      >
        {initials || <User className={`${iconSize} text-zinc-400`} />}
      </div>
    );
  }

  return (
    <div
      className={`relative ${sizeClasses} rounded-full overflow-hidden shrink-0 border border-white/10 bg-black`}
    >
      <img
        src={src}
        alt={name}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    </div>
  );
}
