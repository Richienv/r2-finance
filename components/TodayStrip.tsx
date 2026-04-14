import { formatRMB } from '@/lib/money';
import type { RollingDay } from '@/lib/rolling-budget';

export function TodayStrip({ today }: { today: RollingDay }) {
  const left = today.budgetAmount - today.spent;
  const over = left < 0;
  const strip = `TODAY: ${formatRMB(today.budgetAmount)} BUDGET · ${formatRMB(today.spent)} SPENT · ${formatRMB(Math.max(0, left))} LEFT`;

  let sub: { text: string; color: string } | null = null;
  if (today.carryover > 0.5) {
    sub = {
      text: `+${Math.round(today.carryover)} bonus from yesterday`,
      color: '#e8ff47',
    };
  } else if (today.carryover < -0.5) {
    sub = {
      text: `${Math.round(today.carryover)} carried from yesterday`,
      color: '#ff4444',
    };
  }

  return (
    <div
      className="shrink-0 flex flex-col items-center justify-center py-2 border-y hairline"
      style={{ color: over ? '#ff4444' : '#e8ff47' }}
    >
      <div className="font-mono text-[11px] tracking-wider">{strip}</div>
      {sub && (
        <div
          className="mt-1 font-mono text-[9px] tracking-wider"
          style={{ color: sub.color }}
        >
          {sub.text}
        </div>
      )}
    </div>
  );
}
