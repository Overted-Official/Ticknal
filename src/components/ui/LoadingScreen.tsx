import Image from 'next/image';
import { cn } from '@/lib/utils';
import TicknalBrand from '@/components/ui/TicknalBrand';

interface LoadingScreenProps {
  label?: string;
  className?: string;
}

/**
 * Unified fallback loading screen:
 * Displays the Ticknal mark with a subtle breathing neon halo ring, the official wordmark,
 * and an indeterminate glowing brand gradient progress bar on pure pitch black (#000000).
 * Matches the AppSplash design language exactly with zero orbiting spinners or mismatched artifacts.
 */
export default function LoadingScreen({
  label = 'Loading Ticknal',
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex select-none flex-col items-center justify-center overflow-hidden bg-plt-base px-6 pt-[var(--ticknal-safe-area-top)] pb-[var(--ticknal-safe-area-bottom)] animate-in fade-in duration-200',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center">
        {/* Logo Mark with subtle pulsing halo ring */}
        <div className="relative flex h-20 w-20 md:h-24 md:w-24 items-center justify-center text-plt-text">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-3.5 rounded-full border border-[rgba(0,188,230,0.3)] shadow-[0_0_18px_rgba(0,188,230,0.18)] animate-pulse"
          />
          <Image
            src="/logo-white.svg"
            alt=""
            width={52}
            height={52}
            className="relative z-10 object-contain"
            priority
          />
        </div>

        {/* Wordmark */}
        <div className="mt-5 flex flex-col items-center">
          <TicknalBrand href={null} showIcon={false} showText size="lg" className="text-plt-text" />
        </div>

        {/* Unified Loading Bar */}
        <div
          aria-hidden="true"
          className="mt-6 w-[150px] max-w-[55vw] h-[3px] bg-plt-hover rounded-full overflow-hidden relative"
        >
          <div
            className="h-full w-full rounded-full bg-gradient-to-r from-[#00bce6] via-[#2962ff] to-[#d500f9] shadow-[0_0_12px_rgba(0,188,230,0.6)] animate-pulse"
          />
        </div>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
