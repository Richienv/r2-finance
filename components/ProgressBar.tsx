import { cn } from '@/lib/cn';

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn('h-2 w-full bg-border/60 rounded-sm overflow-hidden', className)}>
      <div
        className="h-full bg-accent transition-[width]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}
