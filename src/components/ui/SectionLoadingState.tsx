import { cn } from '@/lib/utils';
import { CometSpinner } from '@/components/ui/CometSpinner';

interface SectionLoadingStateProps {
  label: string;
  className?: string;
  spinnerClassName?: string;
}

export default function SectionLoadingState({
  label,
  className,
  spinnerClassName,
}: SectionLoadingStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center text-xs text-text-muted',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <CometSpinner decorative className={cn('h-7 w-7', spinnerClassName)} />
      <span>{label}</span>
    </div>
  );
}
