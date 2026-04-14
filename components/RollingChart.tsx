import { formatRMB } from '@/lib/money';
import type { RollingDay } from '@/lib/rolling-budget';

const WEEKDAYS = ['SUN','MON','TUE','WED','THU','FRI','SAT'];

function weekdayFor(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function dayLabel(date: string): string {
  const [, , d] = date.split('-');
  return String(Number(d));
}

export function RollingChart({
  days,
  today,
  weekSpent,
  monthSpent,
}: {
  days: RollingDay[];
  today: string;
  weekSpent: number;
  monthSpent: number;
}) {
  const max = Math.max(
    ...days.map(d => Math.max(d.budgetAmount, d.spent, 40)),
  );
  const avgSpent =
    days.length > 0 ? days.reduce((s, d) => s + d.spent, 0) / days.length : 0;

  return (
    <div className="shrink-0 mx-4 my-3 rounded-lg border-[0.5px] border-[#222] bg-[#0d0d0d] px-4 pt-3 pb-2">
      <div className="font-mono text-[9px] tracking-[1.5px] uppercase text-[#555] mb-3">
        7-DAY OVERVIEW
      </div>

      <div className="flex items-end justify-between h-[80px] gap-[12px]">
        {days.map(d => {
          const isToday = d.date === today;
          const bH = Math.max(2, Math.round((d.budgetAmount / max) * 80));
          const sH = Math.max(d.spent > 0 ? 2 : 0, Math.round((d.spent / max) * 80));
          const over = d.spent > d.budgetAmount;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full">
              <div className="flex items-end gap-[4px] h-full">
                <div
                  className="w-[8px]"
                  style={{
                    height: `${bH}px`,
                    background: '#2a2a2a',
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
                <div
                  className="w-[8px]"
                  style={{
                    height: `${sH}px`,
                    background: over ? '#ff4444' : '#e8ff47',
                    borderTopLeftRadius: 2,
                    borderTopRightRadius: 2,
                  }}
                />
              </div>
              <div
                className="mt-1.5 font-mono text-[8px] leading-none"
                style={{ color: isToday ? '#ffffff' : '#555' }}
              >
                {weekdayFor(d.date)}
              </div>
              <div
                className="mt-0.5 font-mono text-[8px] leading-none"
                style={{ color: isToday ? '#ffffff' : '#444' }}
              >
                {dayLabel(d.date)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-2 border-t-[0.5px] border-[#222] flex items-center justify-between font-mono text-[9px] text-[#555]">
        <span className="flex-1 text-center">
          AVG <span className="text-[#aaa]">{formatRMB(avgSpent)}</span>/DAY
        </span>
        <span className="w-px h-3 bg-[#222]" />
        <span className="flex-1 text-center">
          WEEK <span className="text-[#aaa]">{formatRMB(weekSpent)}</span>
        </span>
        <span className="w-px h-3 bg-[#222]" />
        <span className="flex-1 text-center">
          MONTH <span className="text-[#aaa]">{formatRMB(monthSpent)}</span>
        </span>
      </div>
    </div>
  );
}
