import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface RAMBarProps {
  percent: number;
  label?: string;
  valueText?: string;
  className?: string;
}

const getTone = (percent: number): string => {
  if (percent < 60) {
    return 'from-emerald-400 to-emerald-300';
  }

  if (percent < 85) {
    return 'from-amber-400 to-amber-300';
  }

  return 'from-red-500 to-red-400';
};

export const RAMBar = ({ percent, label, valueText, className }: RAMBarProps) => (
  <div className={cn('space-y-2', className)}>
    {(label || valueText) && (
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>{valueText}</span>
      </div>
    )}
    <Progress value={percent} indicatorClassName={`bg-gradient-to-r ${getTone(percent)}`} />
  </div>
);
