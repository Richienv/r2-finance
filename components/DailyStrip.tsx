import { formatRMB } from '@/lib/money';
import { dailyStatus } from '@/lib/budget';

export function DailyStrip({ todaySpent, dailyFree }: { todaySpent: number; dailyFree: number }) {
  const s = dailyStatus(todaySpent);
  const left = Math.max(0, dailyFree - todaySpent);
  return (
    <div
      className="h-12 shrink-0 flex items-center justify-center text-[11px] font-mono tracking-wider border-y hairline"
      style={{ color: s.color }}
    >
      TODAY: {Math.round(dailyFree)} FREE · {formatRMB(todaySpent)} SPENT · {formatRMB(left)} LEFT
    </div>
  );
}
