'use client';

import { cn } from '@/lib/cn';
import { formatRMB } from '@/lib/money';

export type DailyTotal = {
  date: string;
  income: number;
  expense: number;
};

type Props = {
  days: DailyTotal[];
  today: string;
  selected?: string;
  onSelect?: (date: string) => void;
};

function formatCompact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return formatRMB(n);
}

export function MacroBarChart({ days, today, selected, onSelect }: Props) {
  const max = Math.max(1, ...days.map(d => d.expense));
  const totalExpense = days.reduce((s, d) => s + d.expense, 0);
  const avgPerDay = totalExpense / days.length;
  const avgPct = max > 0 ? (avgPerDay / max) * 100 : 0;

  // Pick a few day labels to render under the chart
  const labelIdx = new Set([
    0,
    Math.floor(days.length / 4),
    Math.floor(days.length / 2),
    Math.floor((3 * days.length) / 4),
    days.length - 1,
  ]);

  return (
    <div className="px-4 pt-3 pb-2 border-b hairline">
      <div className="flex items-end justify-between mb-1">
        <span className="font-mono text-[9px] tracking-[2px] text-[#555]">DAILY SPEND</span>
        <span className="font-mono text-[9px] text-[#555] tabular-nums">
          AVG ¥{formatCompact(Math.round(avgPerDay))}/D
        </span>
      </div>
      <div className="relative h-20">
        {/* avg line */}
        {avgPerDay > 0 && (
          <div
            className="absolute left-0 right-0 border-t border-dashed"
            style={{ borderColor: '#3a3a3a', bottom: `${avgPct}%` }}
          />
        )}
        <div className="absolute inset-0 flex items-end gap-[2px]">
          {days.map(d => {
            const h = max > 0 ? (d.expense / max) * 100 : 0;
            const isToday = d.date === today;
            const isSelected = d.date === selected;
            const empty = d.expense === 0;
            const bg = empty
              ? '#1a1a1a'
              : isSelected
                ? '#e8ff47'
                : isToday
                  ? '#a8b840'
                  : '#cc4444';
            return (
              <button
                key={d.date}
                onClick={() => onSelect?.(d.date)}
                className="flex-1 h-full flex items-end"
                aria-label={`${d.date}: ¥${formatRMB(d.expense)}`}
              >
                <div
                  className={cn('w-full rounded-t-[1px]', isSelected && 'ring-1 ring-accent')}
                  style={{
                    height: `${Math.max(empty ? 3 : 6, h)}%`,
                    background: bg,
                    opacity: empty ? 0.5 : 1,
                  }}
                />
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex justify-between mt-1 font-mono text-[8px] text-[#444]">
        {days.map((d, i) => {
          const day = Number(d.date.slice(8, 10));
          if (!labelIdx.has(i)) return <span key={d.date} className="flex-1" />;
          return (
            <span key={d.date} className="flex-1 text-center tabular-nums">
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}
