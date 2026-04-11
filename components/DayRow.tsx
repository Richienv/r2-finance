'use client';
import { useState } from 'react';
import { formatRMB } from '@/lib/money';
import { cn } from '@/lib/cn';

type Expense = { id: string; note: string | null; amountRMB: number; category: string };
type Day = { date: string; label: string; total: number; expenses: Expense[]; isToday: boolean };

export function DayRow({ day }: { day: Day }) {
  const [open, setOpen] = useState(false);
  const over = day.total > 37;
  return (
    <div className="border-b hairline">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 h-11 text-left"
      >
        <span className="font-mono text-xs tracking-wider text-muted">
          {day.label}{day.isToday ? ' (today)' : ''}
        </span>
        <span className={cn('font-mono text-xs tabular-nums', over ? 'text-danger' : 'text-success')}>
          {formatRMB(day.total)} RMB {over ? '⚠' : '✓'}
        </span>
      </button>
      {open && day.expenses.length > 0 && (
        <ul className="pb-2 pl-8 pr-5">
          {day.expenses.map(e => (
            <li key={e.id} className="flex justify-between text-[11px] text-white/70 py-0.5 font-mono">
              <span>└ {e.note ?? e.category.toLowerCase()}</span>
              <span className="tabular-nums">{formatRMB(e.amountRMB)} RMB</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
