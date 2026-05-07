'use client';

import { cn } from '@/lib/cn';
import { formatRMB } from '@/lib/money';
import type { DailyTotal } from './MacroBarChart';

type Props = {
  monthKey: string; // "YYYY-MM"
  days: DailyTotal[];
  today: string;
  selected?: string;
  onSelect?: (date: string) => void;
};

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function compact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return formatRMB(n);
}

export function MacroCalendar({ monthKey, days, today, selected, onSelect }: Props) {
  const [year, month] = monthKey.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  // First day of month, weekday in CST (UTC+8) — 0 = Sunday
  const firstDayWeek = new Date(`${monthKey}-01T00:00:00+08:00`).getUTCDay();

  // Map by date for quick lookup
  const byDate = new Map<string, DailyTotal>();
  for (const d of days) byDate.set(d.date, d);

  const maxExpense = Math.max(0, ...days.map(d => d.expense));

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to a full last row
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="px-3 pt-3 pb-2 border-b hairline">
      <div className="grid grid-cols-7 gap-1 mb-1.5">
        {WEEKDAYS.map((w, i) => (
          <div
            key={i}
            className="text-center font-mono text-[8px] tracking-[1px] text-[#555]"
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="aspect-square" />;
          const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
          const t = byDate.get(dateStr);
          const expense = t?.expense ?? 0;
          const income = t?.income ?? 0;
          const intensity = maxExpense > 0 ? expense / maxExpense : 0;
          const isToday = dateStr === today;
          const isSelected = dateStr === selected;
          const isFuture = dateStr > today;

          // Background color: expense days tinted red, income-only days tinted green
          let bg = '#0a0a0a';
          if (expense > 0) {
            bg = `rgba(204, 68, 68, ${0.15 + intensity * 0.45})`;
          } else if (income > 0) {
            bg = 'rgba(168, 184, 64, 0.18)';
          }

          return (
            <button
              key={dateStr}
              onClick={() => onSelect?.(dateStr)}
              className={cn(
                'aspect-square flex flex-col items-center justify-center rounded relative',
                isSelected && 'ring-1 ring-accent',
                !isSelected && isToday && 'ring-1 ring-[#3a3a3a]',
                isFuture && 'opacity-40',
              )}
              style={{ background: bg }}
            >
              <span
                className={cn(
                  'font-mono text-[11px] tabular-nums leading-none',
                  isToday ? 'text-accent' : 'text-white',
                )}
              >
                {day}
              </span>
              {expense > 0 && (
                <span className="font-mono text-[8px] text-[#ddd] tabular-nums leading-none mt-0.5">
                  {compact(expense)}
                </span>
              )}
              {income > 0 && expense === 0 && (
                <span
                  className="font-mono text-[8px] tabular-nums leading-none mt-0.5"
                  style={{ color: '#a8b840' }}
                >
                  +{compact(income)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
