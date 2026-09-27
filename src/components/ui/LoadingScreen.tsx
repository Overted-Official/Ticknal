import Image from 'next/image';
import { cn } from '@/lib/utils';
import { CometSpinner } from '@/components/ui/CometSpinner';

interface LoadingScreenProps {
  label?: string;
  className?: string;
}

export default function LoadingScreen({
  label = 'Loading Ticknal',
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex select-none items-center justify-center overflow-hidden bg-black px-6 pt-[var(--ticknal-safe-area-top)] pb-[var(--ticknal-safe-area-bottom)]',
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="relative flex h-28 w-28 items-center justify-center text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-16 rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #2962FF 0%, #00BCE6 40%, #D500F9 80%, transparent 100%)' }}
        />
        <CometSpinner decorative className="absolute inset-0 h-full w-full" />
        <Image
          src="/logo-white.svg"
          alt=""
          width={48}
          height={48}
          className="relative z-10 object-contain"
          priority
        />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
