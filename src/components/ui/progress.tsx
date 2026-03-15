import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  indicatorClassName?: string;
}

export const Progress = ({ value, className, indicatorClassName }: ProgressProps) => (
  <div className={cn('relative h-2 w-full overflow-hidden rounded-full bg-muted/50', className)}>
    <div
      className={cn('h-full rounded-full transition-all duration-300', indicatorClassName)}
      style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
    />
  </div>
);
