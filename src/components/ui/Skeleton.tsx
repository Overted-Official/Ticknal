import React from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape variant */
  variant?: 'rectangular' | 'circular' | 'rounded';
}

/**
 * Standard Ticknal Skeleton primitive
 *
 * Designed strictly for pure pitch-black platform surfaces (`bg-black`):
 * - Uses hairline/semi-translucent fill (`bg-white/[0.06]`)
 * - Shimmers via `animate-pulse`, respecting `prefers-reduced-motion`
 * - Screen-reader safe with `aria-hidden="true"`
 */
export function Skeleton({
  className,
  variant = 'rounded',
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-plt-hover animate-pulse motion-reduce:animate-none',
        variant === 'circular' && 'rounded-full',
        variant === 'rounded' && 'rounded-md',
        variant === 'rectangular' && 'rounded-none',
        className
      )}
      {...props}
    />
  );
}

export default Skeleton;
