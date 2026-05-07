'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteMacro } from '@/app/actions/macro';
import { deleteExpense } from '@/app/actions/expenses';
import { cstDateString, weekRange } from '@/lib/date';
import { formatRMB } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { MacroType } from '@/lib/macro';
import { MacroBarChart, type DailyTotal } from './MacroBarChart';
import { MacroCalendar } from './MacroCalendar';
import { MacroSheet } from './MacroSheet';
import type { MacroFormInitial } from './MacroForm';

type MacroItem = {
  id: string;
  date: string;
  amountRMB: number;
  type: string; // INCOME | EXPENSE
  category: string;
  note: string | null;
};

type ExpenseItem = {
  id: string;
  date: string;
  amountRMB: number;
  category: string;
  note: string | null;
};

type Props = {
  monthKey: string;
  macros: MacroItem[]; // ALL macros (for stats / list)
  monthMacros: MacroItem[]; // macros in monthKey (for calendar)
  monthExpenses: ExpenseItem[]; // daily expenses in monthKey (excludes FIXED)
  balanceRMB: number;
  incomeRMB: number;
  expenseRMB: number;
};

type DayEntry = {
  id: string;
  source: 'MACRO' | 'DAILY';
  type: 'INCOME' | 'EXPENSE';
  category: string;
  note: string | null;
  amountRMB: number;
  date: string;
};

function compact(n: number): string {
  if (n >= 10000) return `${Math.round(n / 1000)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return formatRMB(n);
}

export function MacroBoard({
  monthKey,
  macros,
  monthMacros,
  monthExpenses,
  balanceRMB,
  incomeRMB,
  expenseRMB,
}: Props) {
  const router = useRouter();
  const today = useMemo(() => cstDateString(), []);
  const [pending, startTransition] = useTransition();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetInitial, setSheetInitial] = useState<MacroFormInitial | null>(null);
  const [sheetDefaultType, setSheetDefaultType] = useState<MacroType>('INCOME');

  function openAdd(t: MacroType, dateOverride?: string) {
    setSheetInitial(null);
    setSheetDefaultType(t);
    setSheetDate(dateOverride);
    setSheetOpen(true);
  }
  const [sheetDate, setSheetDate] = useState<string | undefined>(undefined);

  function openEdit(item: MacroItem) {
    setSheetInitial({
      id: item.id,
      type: item.type as MacroType,
      amountRMB: item.amountRMB,
      category: item.category,
      note: item.note,
      date: item.date,
    });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    // keep the data around briefly for the slide-out animation
    setTimeout(() => {
      setSheetInitial(null);
      setSheetDate(undefined);
    }, 250);
  }

  // Selected day for the day-detail panel (defaults to today)
  const [selectedDate, setSelectedDate] = useState<string>(today);

  // Build per-day totals for the month (combined macro EXPENSE + daily expense + macro INCOME)
  const dailyTotals: DailyTotal[] = useMemo(() => {
    const [year, month] = monthKey.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const map = new Map<string, DailyTotal>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${monthKey}-${String(d).padStart(2, '0')}`;
      map.set(date, { date, income: 0, expense: 0 });
    }
    for (const m of monthMacros) {
      const t = map.get(m.date);
      if (!t) continue;
      if (m.type === 'INCOME') t.income += m.amountRMB;
      else t.expense += m.amountRMB;
    }
    for (const e of monthExpenses) {
      const t = map.get(e.date);
      if (!t) continue;
      t.expense += e.amountRMB;
    }
    return Array.from(map.values());
  }, [monthKey, monthMacros, monthExpenses]);

  // Stats by time period (computed from ALL macros + ALL month expenses)
  const stats = useMemo(() => {
    const wk = weekRange();
    const init = () => ({ income: 0, expense: 0 });
    const out = { today: init(), week: init(), month: init() };

    function addTo(period: { income: number; expense: number }, t: 'INCOME' | 'EXPENSE', a: number) {
      if (t === 'INCOME') period.income += a;
      else period.expense += a;
    }

    for (const m of macros) {
      const isInc = m.type === 'INCOME' ? 'INCOME' : 'EXPENSE';
      const a = m.amountRMB;
      if (m.date === today) addTo(out.today, isInc, a);
      if (m.date >= wk.start && m.date <= wk.end) addTo(out.week, isInc, a);
      if (m.date.startsWith(monthKey)) addTo(out.month, isInc, a);
    }
    for (const e of monthExpenses) {
      const a = e.amountRMB;
      if (e.date === today) addTo(out.today, 'EXPENSE', a);
      if (e.date >= wk.start && e.date <= wk.end) addTo(out.week, 'EXPENSE', a);
      addTo(out.month, 'EXPENSE', a);
    }
    return out;
  }, [macros, monthExpenses, today, monthKey]);

  // Entries for the selected day
  const dayEntries: DayEntry[] = useMemo(() => {
    const out: DayEntry[] = [];
    for (const m of monthMacros) {
      if (m.date !== selectedDate) continue;
      out.push({
        id: m.id,
        source: 'MACRO',
        type: m.type === 'INCOME' ? 'INCOME' : 'EXPENSE',
        category: m.category,
        note: m.note,
        amountRMB: m.amountRMB,
        date: m.date,
      });
    }
    for (const e of monthExpenses) {
      if (e.date !== selectedDate) continue;
      out.push({
        id: e.id,
        source: 'DAILY',
        type: 'EXPENSE',
        category: e.category,
        note: e.note,
        amountRMB: e.amountRMB,
        date: e.date,
      });
    }
    out.sort((a, b) => b.amountRMB - a.amountRMB);
    return out;
  }, [monthMacros, monthExpenses, selectedDate]);

  function removeEntry(entry: DayEntry) {
    startTransition(async () => {
      try {
        if (entry.source === 'MACRO') await deleteMacro(entry.id);
        else await deleteExpense(entry.id);
        router.refresh();
      } catch {}
    });
  }

  function onEntryClick(entry: DayEntry) {
    if (entry.source !== 'MACRO') return; // daily expenses edited on /week
    const m = monthMacros.find(x => x.id === entry.id);
    if (m) openEdit(m);
  }

  const balanceNegative = balanceRMB < 0;
  const balanceColor = balanceNegative ? '#ff4747' : '#e8ff47';
  const balanceSign = balanceNegative ? '−' : '';
  const dayLabel = formatDayLabel(selectedDate, today);

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Compact balance strip */}
        <div className="px-5 py-3 border-b hairline flex items-center justify-between">
          <div className="flex flex-col">
            <div className="font-mono text-[9px] tracking-[2px] text-muted">BALANCE</div>
            <div
              className="font-display text-[26px] leading-tight tabular-nums"
              style={{ color: balanceColor }}
            >
              {balanceSign}¥{formatRMB(Math.abs(balanceRMB))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5 font-mono text-[10px] tabular-nums">
            <span style={{ color: '#e8ff47' }}>+¥{formatRMB(incomeRMB)}</span>
            <span style={{ color: '#ff4747' }}>−¥{formatRMB(expenseRMB)}</span>
          </div>
        </div>

        {/* Stats strip — net flow per period (combined macros + daily expenses) */}
        <div className="grid grid-cols-3 border-b hairline">
          <PeriodCell label="TODAY" income={stats.today.income} expense={stats.today.expense} />
          <PeriodCell label="WEEK" income={stats.week.income} expense={stats.week.expense} />
          <PeriodCell label="MONTH" income={stats.month.income} expense={stats.month.expense} />
        </div>

        {/* Bar chart */}
        <MacroBarChart
          days={dailyTotals}
          today={today}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />

        {/* Calendar */}
        <MacroCalendar
          monthKey={monthKey}
          days={dailyTotals}
          today={today}
          selected={selectedDate}
          onSelect={setSelectedDate}
        />

        {/* Day detail */}
        <div>
          <div
            className="px-5 py-2 flex items-center justify-between"
            style={{ background: '#0a0a0a' }}
          >
            <span className="font-mono text-[10px] tracking-[2px] text-[#888]">{dayLabel}</span>
            <span className="font-mono text-[10px] tabular-nums">
              {dayEntries.length === 0 ? (
                <span className="text-[#444]">—</span>
              ) : (
                <>
                  {dayEntries.some(e => e.type === 'INCOME') && (
                    <span style={{ color: '#a8b840' }}>
                      +¥{formatRMB(dayEntries.filter(e => e.type === 'INCOME').reduce((s, e) => s + e.amountRMB, 0))}
                    </span>
                  )}
                  {dayEntries.some(e => e.type === 'INCOME') &&
                    dayEntries.some(e => e.type === 'EXPENSE') && (
                      <span className="text-[#333] mx-1.5">·</span>
                    )}
                  {dayEntries.some(e => e.type === 'EXPENSE') && (
                    <span style={{ color: '#cc4444' }}>
                      −¥{formatRMB(dayEntries.filter(e => e.type === 'EXPENSE').reduce((s, e) => s + e.amountRMB, 0))}
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          {dayEntries.length === 0 ? (
            <div className="px-5 py-4 text-center text-[11px] font-mono text-[#444]">
              — nothing logged on this day —
            </div>
          ) : (
            dayEntries.map(e => {
              const isInc = e.type === 'INCOME';
              const color = isInc ? '#e8ff47' : '#ff4747';
              const sign = isInc ? '+' : '−';
              const tappable = e.source === 'MACRO';
              return (
                <div
                  key={`${e.source}:${e.id}`}
                  onClick={() => onEntryClick(e)}
                  className={cn(
                    'px-5 py-2.5 flex items-center justify-between border-b hairline',
                    tappable ? 'cursor-pointer active:bg-[#0f0f0f]' : '',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-mono text-[8px] tracking-[1px] uppercase shrink-0"
                      style={{ color: e.source === 'MACRO' ? color : '#666' }}
                    >
                      {e.source === 'MACRO' ? e.type : e.category}
                    </span>
                    {e.source === 'MACRO' && (
                      <span className="font-mono text-[8px] tracking-[1px] uppercase text-[#666] shrink-0">
                        {e.category}
                      </span>
                    )}
                    <span className="font-sans text-[13px] text-white truncate">
                      {e.note || '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="font-mono text-[13px] tabular-nums"
                      style={{ color }}
                    >
                      {sign}{formatRMB(e.amountRMB)}
                    </span>
                    <button
                      onClick={ev => {
                        ev.stopPropagation();
                        removeEntry(e);
                      }}
                      disabled={pending}
                      className="font-mono text-[10px] text-[#555] hover:text-danger px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
          {/* extra padding so the last row isn't hugged by the add button */}
          <div className="h-3" />
        </div>
      </div>

      {/* Sticky action buttons */}
      <div
        className="shrink-0 grid grid-cols-2 gap-2 p-2 border-t hairline"
        style={{ background: '#0a0a0a' }}
      >
        <button
          onClick={() => openAdd('INCOME', selectedDate)}
          className="h-12 bg-accent text-[#080808] font-display text-sm tracking-wider rounded"
        >
          + INCOME
        </button>
        <button
          onClick={() => openAdd('EXPENSE', selectedDate)}
          className="h-12 bg-[#ff4747] text-[#080808] font-display text-sm tracking-wider rounded"
        >
          − EXPENSE
        </button>
      </div>

      {/* Bottom sheet */}
      <MacroSheet
        open={sheetOpen}
        onClose={closeSheet}
        initial={sheetInitial}
        defaultType={sheetDefaultType}
        defaultDate={sheetDate}
      />
    </div>
  );
}

function PeriodCell({
  label,
  income,
  expense,
}: {
  label: string;
  income: number;
  expense: number;
}) {
  const net = income - expense;
  const netColor = net === 0 ? '#444' : net > 0 ? '#a8b840' : '#cc4444';
  const netSign = net > 0 ? '+' : net < 0 ? '−' : '';
  return (
    <div className="px-3 py-2 flex flex-col items-center border-r-[0.5px] border-[#1a1a1a] last:border-r-0">
      <span className="font-mono text-[8px] tracking-[2px] text-[#555]">{label}</span>
      <span
        className="font-mono text-[14px] tabular-nums mt-0.5"
        style={{ color: netColor }}
      >
        {netSign}¥{compact(Math.abs(net))}
      </span>
      <span className="font-mono text-[8px] tabular-nums mt-0.5">
        <span style={{ color: '#7a8830' }}>+{compact(income)}</span>
        <span className="text-[#333] mx-1">·</span>
        <span style={{ color: '#aa3838' }}>−{compact(expense)}</span>
      </span>
    </div>
  );
}

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatDayLabel(date: string, today: string): string {
  const [, mm, dd] = date.split('-').map(Number) as [number, number, number];
  const label = `${MONTHS_SHORT[(mm ?? 1) - 1]} ${dd}`;
  if (date === today) return `${label} · TODAY`;
  return label;
}
