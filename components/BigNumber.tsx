import { ProgressBar } from './ProgressBar';
import { formatRMB, formatIDR, percent } from '@/lib/money';

export function BigNumber({
  remainingRMB,
  totalRMB,
  idr,
}: { remainingRMB: number; totalRMB: number; idr: number }) {
  const pct = percent(remainingRMB, totalRMB);
  return (
    <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div className="text-[11px] tracking-[0.2em] text-muted font-mono">REMAINING</div>
      <div className="mt-3 font-display text-[96px] leading-none text-accent">
        {formatRMB(remainingRMB)}
      </div>
      <div className="mt-1 text-xs tracking-widest text-muted font-mono">RMB</div>
      <div className="mt-4 text-base text-white/70">{formatIDR(idr)}</div>
      <div className="mt-6 w-full max-w-xs">
        <ProgressBar value={pct} />
        <div className="mt-2 text-[11px] text-muted font-mono">
          {Math.round(pct)}% of monthly free budget
        </div>
      </div>
    </section>
  );
}
