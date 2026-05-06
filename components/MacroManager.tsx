'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addMacro, deleteMacro, updateMacro } from '@/app/actions/macro';
import {
  MACRO_EXPENSE_CATEGORIES,
  MACRO_INCOME_CATEGORIES,
  type MacroType,
} from '@/lib/macro';
import { IDR_PER_RMB } from '@/lib/constants';
import { cstDateString, currentMonthKey, weekRange } from '@/lib/date';
import { formatIDR, formatRMB, rmbToIdr } from '@/lib/money';
import { cn } from '@/lib/cn';

type MacroItem = {
  id: string;
  date: string;
  amountRMB: number;
  type: string;
  category: string;
  note: string | null;
};

type Props = {
  items: MacroItem[];
  balanceRMB: number;
  incomeRMB: number;
  expenseRMB: number;
};

const PRESETS = [100, 500, 1000, 5000];

function presetLabel(v: number): string {
  return v >= 1000 ? `${v / 1000}k` : String(v);
}

function parseAmount(input: string): number {
  const n = parseFloat(input);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function MacroManager({ items, balanceRMB, incomeRMB, expenseRMB }: Props) {
  const router = useRouter();
  const [type, setType] = useState<MacroType>('INCOME');
  const [amountInput, setAmountInput] = useState<string>('');
  const [category, setCategory] = useState<string>(MACRO_INCOME_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const amount = parseAmount(amountInput);
  const editing = editingId !== null;

  const categoryList = useMemo(
    () => (type === 'INCOME' ? MACRO_INCOME_CATEGORIES : MACRO_EXPENSE_CATEGORIES),
    [type],
  );

  function selectType(t: MacroType) {
    setType(t);
    const list = t === 'INCOME' ? MACRO_INCOME_CATEGORIES : MACRO_EXPENSE_CATEGORIES;
    if (!(list as readonly string[]).includes(category)) {
      setCategory(list[0]);
    }
  }

  function adjustAmount(delta: number) {
    const next = Math.max(0, Math.round((amount + delta) * 10) / 10);
    setAmountInput(next === 0 ? '' : String(next));
    setError(null);
  }

  function clearForm() {
    setEditingId(null);
    setAmountInput('');
    setNote('');
    setError(null);
  }

  function startEdit(it: MacroItem) {
    const t = it.type as MacroType;
    setEditingId(it.id);
    setType(t);
    setCategory(it.category);
    setAmountInput(String(it.amountRMB));
    setNote(it.note ?? '');
    setError(null);
  }

  function submit() {
    setError(null);
    if (amount <= 0) {
      setError('enter amount');
      return;
    }
    startTransition(async () => {
      try {
        if (editingId) {
          await updateMacro({ id: editingId, type, amountRMB: amount, category, note });
        } else {
          await addMacro({ type, amountRMB: amount, category, note });
        }
        clearForm();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
        if (editingId === id) clearForm();
        await deleteMacro(id);
        router.refresh();
      } catch {}
    });
  }

  const balanceNegative = balanceRMB < 0;
  const balanceColor = balanceNegative ? '#ff4747' : '#e8ff47';
  const balanceSign = balanceNegative ? '−' : '';
  const isIncome = type === 'INCOME';
  const accentColor = isIncome ? '#e8ff47' : '#ff4747';
  const idrPreview = amount > 0 ? rmbToIdr(amount, IDR_PER_RMB) : 0;

  // Stats by time period (computed from items)
  const stats = useMemo(() => {
    const today = cstDateString();
    const monthKey = currentMonthKey();
    const wk = weekRange();
    const init = () => ({ income: 0, expense: 0 });
    const out = { today: init(), week: init(), month: init() };
    for (const it of items) {
      const isInc = it.type === 'INCOME';
      const a = it.amountRMB;
      if (it.date === today) {
        if (isInc) out.today.income += a;
        else out.today.expense += a;
      }
      if (it.date >= wk.start && it.date <= wk.end) {
        if (isInc) out.week.income += a;
        else out.week.expense += a;
      }
      if (it.date.startsWith(monthKey)) {
        if (isInc) out.month.income += a;
        else out.month.expense += a;
      }
    }
    return out;
  }, [items]);

  // Group entries by date for a calendar-style list
  const todayDate = useMemo(() => cstDateString(), []);
  const groupedItems = useMemo(() => {
    const groups: { date: string; items: MacroItem[]; netRMB: number }[] = [];
    let current: (typeof groups)[number] | null = null;
    for (const it of items) {
      if (!current || current.date !== it.date) {
        current = { date: it.date, items: [], netRMB: 0 };
        groups.push(current);
      }
      current.items.push(it);
      current.netRMB += it.type === 'INCOME' ? it.amountRMB : -it.amountRMB;
    }
    return groups;
  }, [items]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
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

      {/* Stats strip — net flow per period */}
      <div className="grid grid-cols-3 border-b hairline">
        <PeriodCell label="TODAY" income={stats.today.income} expense={stats.today.expense} />
        <PeriodCell label="WEEK" income={stats.week.income} expense={stats.week.expense} />
        <PeriodCell label="MONTH" income={stats.month.income} expense={stats.month.expense} />
      </div>

      {/* Entries list — grouped by date with daily totals */}
      <div className="flex-1 overflow-y-auto">
        {groupedItems.length === 0 ? (
          <div className="px-5 py-6 text-center text-[11px] font-mono text-[#444]">
            — log your first macro below —
          </div>
        ) : (
          groupedItems.map(group => (
            <div key={group.date}>
              <div
                className="px-5 py-1.5 flex items-center justify-between sticky top-0 z-10"
                style={{ background: '#0a0a0a' }}
              >
                <span className="font-mono text-[9px] tracking-[2px] text-[#666]">
                  {formatDateHeader(group.date, todayDate)}
                </span>
                <span
                  className="font-mono text-[9px] tabular-nums"
                  style={{ color: group.netRMB === 0 ? '#444' : group.netRMB > 0 ? '#a8b840' : '#cc4444' }}
                >
                  {group.netRMB > 0 ? '+' : group.netRMB < 0 ? '−' : ''}
                  ¥{formatRMB(Math.abs(group.netRMB))}
                </span>
              </div>
              {group.items.map(it => {
                const itemIncome = it.type === 'INCOME';
                const color = itemIncome ? '#e8ff47' : '#ff4747';
                const sign = itemIncome ? '+' : '−';
                const isEditingThis = editingId === it.id;
                return (
                  <div
                    key={it.id}
                    onClick={() => startEdit(it)}
                    className={cn(
                      'px-5 py-2.5 flex items-center justify-between border-b hairline cursor-pointer active:bg-[#0f0f0f]',
                      isEditingThis && 'bg-[#101010]',
                    )}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="font-mono text-[9px] tracking-[1px] uppercase"
                          style={{ color }}
                        >
                          {it.type}
                        </span>
                        <span className="font-mono text-[9px] tracking-[1px] uppercase text-[#666]">
                          {it.category}
                        </span>
                        <span className="font-sans text-[13px] text-white truncate">
                          {it.note || '—'}
                        </span>
                        {isEditingThis && (
                          <span
                            className="font-mono text-[8px] tracking-[1px] px-1.5 py-0.5 rounded-sm"
                            style={{ background: '#222', color: accentColor }}
                          >
                            EDIT
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className="font-mono text-[13px] tabular-nums"
                        style={{ color }}
                      >
                        {sign}{formatRMB(it.amountRMB)}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          remove(it.id);
                        }}
                        disabled={pending}
                        className="font-mono text-[10px] text-[#555] hover:text-danger px-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Bottom thumb-zone form */}
      <div className="shrink-0 border-t hairline" style={{ background: '#0a0a0a' }}>
        {/* Edit banner */}
        {editing && (
          <div
            className="px-3 py-2 flex items-center justify-between border-b-[0.5px]"
            style={{ background: '#101010', borderColor: '#1a1a1a' }}
          >
            <span
              className="font-mono text-[10px] tracking-[2px]"
              style={{ color: accentColor }}
            >
              EDITING ENTRY
            </span>
            <button
              onClick={clearForm}
              className="font-mono text-[10px] tracking-[2px] text-[#888] active:text-[#fff]"
            >
              CANCEL
            </button>
          </div>
        )}

        {/* Type toggle */}
        <div className="px-3 pt-3 flex gap-2">
          <button
            onClick={() => selectType('INCOME')}
            className={cn(
              'flex-1 h-10 rounded font-mono text-[11px] tracking-[2px] border-[0.5px]',
              isIncome
                ? 'bg-accent text-[#080808] border-accent'
                : 'bg-[#111] text-[#888] border-[#222]',
            )}
          >
            + INCOME
          </button>
          <button
            onClick={() => selectType('EXPENSE')}
            className={cn(
              'flex-1 h-10 rounded font-mono text-[11px] tracking-[2px] border-[0.5px]',
              !isIncome
                ? 'bg-[#ff4747] text-[#080808] border-[#ff4747]'
                : 'bg-[#111] text-[#888] border-[#222]',
            )}
          >
            − EXPENSE
          </button>
        </div>

        {/* Amount section: typeable hero input */}
        <div className="px-3 pt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="font-mono text-[9px] tracking-[2px] text-[#444]">AMOUNT (RMB)</span>
            <button
              onClick={() => {
                setAmountInput('');
                setError(null);
              }}
              disabled={amount === 0}
              className="font-mono text-[10px] tracking-[2px] text-[#555] disabled:opacity-30 px-2"
            >
              CLEAR
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="font-display text-[36px] leading-none"
              style={{ color: amount > 0 ? accentColor : '#333' }}
            >
              ¥
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={amountInput}
              onChange={e => {
                const cleaned = e.target.value.replace(/[^\d.]/g, '');
                const parts = cleaned.split('.');
                const safe = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
                setAmountInput(safe);
                setError(null);
              }}
              placeholder="0"
              className="flex-1 min-w-0 bg-transparent border-none outline-none font-display text-[36px] leading-none tabular-nums placeholder:text-[#333]"
              style={{ color: amount > 0 ? accentColor : '#F0F0F0' }}
            />
          </div>
          <div className="font-mono text-[10px] text-[#444] mt-1">
            ≈ {formatIDR(idrPreview)}
          </div>
        </div>

        {/* Add row */}
        <div className="px-3 pt-3 grid grid-cols-4 gap-2">
          {PRESETS.map(v => (
            <button
              key={`add-${v}`}
              onClick={() => adjustAmount(v)}
              className="h-9 rounded bg-[#111] border-[0.5px] border-[#222] font-display text-[13px] text-[#F0F0F0] active:bg-[#1a1a1a]"
            >
              +{presetLabel(v)}
            </button>
          ))}
        </div>

        {/* Subtract row */}
        <div className="px-3 pt-2 grid grid-cols-4 gap-2">
          {PRESETS.map(v => (
            <button
              key={`sub-${v}`}
              onClick={() => adjustAmount(-v)}
              disabled={amount === 0}
              className="h-9 rounded bg-[#0a0a0a] border-[0.5px] border-[#1a1a1a] font-display text-[13px] text-[#777] active:bg-[#151515] disabled:opacity-30"
            >
              −{presetLabel(v)}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="px-3 pt-3 grid grid-cols-4 gap-2">
          {categoryList.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'h-9 rounded font-mono text-[10px] tracking-[1px] border-[0.5px]',
                category === c
                  ? isIncome
                    ? 'bg-accent text-[#080808] border-accent'
                    : 'bg-[#ff4747] text-[#080808] border-[#ff4747]'
                  : 'bg-[#111] text-[#888] border-[#222]',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Note */}
        <div className="px-3 pt-3">
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="note (optional, e.g. salomon shoes)"
            className="w-full h-9 bg-transparent border-b-[0.5px] border-[#222] px-1 font-sans text-[13px] text-white placeholder:text-[#444] outline-none focus:border-[#444]"
          />
        </div>

        {error && (
          <div className="px-3 pt-2 text-[11px] text-danger font-mono text-center">{error}</div>
        )}

        {/* Submit */}
        <button
          onClick={submit}
          disabled={pending}
          className={cn(
            'h-12 w-full font-display text-sm tracking-wider mt-3 disabled:opacity-60',
            isIncome ? 'bg-accent text-[#080808]' : 'bg-[#ff4747] text-[#080808]',
          )}
        >
          {pending
            ? 'SAVING…'
            : editing
              ? `SAVE · ¥${formatRMB(amount)}`
              : `+ ADD ${type} · ¥${formatRMB(amount)}`}
        </button>
      </div>
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
      <span className="font-mono text-[14px] tabular-nums mt-0.5" style={{ color: netColor }}>
        {netSign}¥{formatRMBCompact(Math.abs(net))}
      </span>
      <span className="font-mono text-[8px] tabular-nums mt-0.5">
        <span style={{ color: '#7a8830' }}>+{formatRMBCompact(income)}</span>
        <span className="text-[#333] mx-1">·</span>
        <span style={{ color: '#aa3838' }}>−{formatRMBCompact(expense)}</span>
      </span>
    </div>
  );
}

function formatRMBCompact(n: number): string {
  if (n >= 10000) return `${(n / 1000).toFixed(0)}k`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return formatRMB(n);
}

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function formatDateHeader(date: string, today: string): string {
  const [, mm, dd] = date.split('-').map(Number) as [number, number, number];
  const label = `${MONTHS_SHORT[(mm ?? 1) - 1]} ${dd}`;
  if (date === today) return `${label} · TODAY`;
  return label;
}
