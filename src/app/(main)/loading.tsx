import Image from 'next/image';
import { CometSpinner } from '@/components/ui/CometSpinner';

export default function Loading() {
  return (
    <div className="fixed inset-0 z-50 flex select-none items-center justify-center overflow-hidden bg-black px-6 pt-[var(--ticknal-safe-area-top)] pb-[var(--ticknal-safe-area-bottom)]">
      <div className="relative flex h-28 w-28 items-center justify-center text-white">
        <div
          className="pointer-events-none absolute -inset-16 rounded-full blur-3xl opacity-25"
          style={{ background: 'radial-gradient(circle, #2962FF 0%, #00BCE6 40%, #D500F9 80%, transparent 100%)' }}
        />

        <CometSpinner className="absolute inset-0 h-full w-full text-white" />

        <Image
          src="/logo-white.svg"
          alt="Ticknal"
          width={48}
          height={48}
          className="relative z-10 object-contain"
          priority
        />
      </div>
    </div>
  );
}
