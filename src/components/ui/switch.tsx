import { cn } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const Switch = ({ checked, onCheckedChange, disabled, className }: SwitchProps) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onCheckedChange(!checked)}
    className={cn(
      'relative inline-flex h-6 w-11 items-center rounded-full border border-border transition disabled:cursor-not-allowed disabled:opacity-40',
      checked ? 'bg-primary/90' : 'bg-muted/40',
      className,
    )}
  >
    <span
      className={cn(
        'inline-block h-5 w-5 transform rounded-full bg-white shadow transition',
        checked ? 'translate-x-5' : 'translate-x-0.5',
      )}
    />
  </button>
);
