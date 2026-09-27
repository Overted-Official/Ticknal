import { cn } from '@/lib/utils';
import { CometSpinner } from '@/components/ui/CometSpinner';

interface InlineSpinnerProps {
  className?: string;
  label?: string;
}

export default function InlineSpinner({
  className,
  label = 'Loading',
}: InlineSpinnerProps) {
  return (
    <span className="inline-flex shrink-0" role="status" aria-label={label}>
      <CometSpinner decorative className={cn('h-4 w-4', className)} />
      <span className="sr-only">{label}</span>
    </span>
  );
}
