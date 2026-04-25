'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addMacro, deleteMacro } from '@/app/actions/macro';
import {
  MACRO_EXPENSE_CATEGORIES,
  MACRO_INCOME_CATEGORIES,
  type MacroType,
} from '@/lib/macro';
import { IDR_PER_RMB } from '@/lib/constants';
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

export function MacroManager({ items, balanceRMB, incomeRMB, expenseRMB }: Props) {
  const router = useRouter();
  const [type, setType] = useState<MacroType>('INCOME');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<string>(MACRO_INCOME_CATEGORIES[0]);
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const categoryList = useMemo(
    () => (type === 'INCOME' ? MACRO_INCOME_CATEGORIES : MACRO_EXPENSE_CATEGORIES),
    [type],
  );

  function selectType(t: MacroType) {
    setType(t);
    const first = t === 'INCOME' ? MACRO_INCOME_CATEGORIES[0] : MACRO_EXPENSE_CATEGORIES[0];
    setCategory(first);
  }

  function addPreset(v: number) {
    setAmount(a => Math.round((a + v) * 10) / 10);
    setError(null);
  }

  function clearAmount() {
    setAmount(0);
    setError(null);
  }

  function submit() {
    setError(null);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('enter amount');
      return;
    }
    startTransition(async () => {
      try {
        await addMacro({ type, amountRMB: amount, category, note });
        setAmount(0);
        setNote('');
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      try {
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

      {/* Entries list (scrollable middle section) */}
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-6 text-center text-[11px] font-mono text-[#444]">
            — log your first macro below —
          </div>
        ) : (
          items.map(it => {
            const itemIncome = it.type === 'INCOME';
            const color = itemIncome ? '#e8ff47' : '#ff4747';
            const sign = itemIncome ? '+' : '−';
            return (
              <div
                key={it.id}
                className="px-5 py-2.5 flex items-center justify-between border-b hairline"
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
                  </div>
                  <span className="font-mono text-[9px] text-[#444] mt-0.5">{it.date}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-[13px] tabular-nums"
                    style={{ color }}
                  >
                    {sign}{formatRMB(it.amountRMB)}
                  </span>
                  <button
                    onClick={() => remove(it.id)}
                    disabled={pending}
                    className="font-mono text-[10px] text-[#555] hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom thumb-zone form */}
      <div className="shrink-0 border-t hairline" style={{ background: '#0a0a0a' }}>
        {/* Type toggle */}
        <div className="px-3 pt-3 flex gap-2">
          <button
            onClick={() => selectType('INCOME')}
            className={cn(
              'flex-1 h-10 rounded font-mono text-[11px] tracking-[2px] border-[0.5px] transition-colors',
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
              'flex-1 h-10 rounded font-mono text-[11px] tracking-[2px] border-[0.5px] transition-colors',
              !isIncome
                ? 'bg-[#ff4747] text-[#080808] border-[#ff4747]'
                : 'bg-[#111] text-[#888] border-[#222]',
            )}
          >
            − EXPENSE
          </button>
        </div>

        {/* Hero amount display */}
        <div className="px-3 pt-3 flex items-end justify-between">
          <div className="flex flex-col min-w-0">
            <div className="font-mono text-[9px] tracking-[2px] text-[#444]">AMOUNT (RMB)</div>
            <div
              className="font-display text-[40px] leading-none tabular-nums truncate"
              style={{ color: amount > 0 ? accentColor : '#333' }}
            >
              ¥{formatRMB(amount)}
            </div>
            <div className="font-mono text-[10px] text-[#444] mt-1">
              ≈ {formatIDR(idrPreview)}
            </div>
          </div>
          <button
            onClick={clearAmount}
            disabled={amount === 0}
            className="font-mono text-[10px] tracking-[2px] text-[#555] disabled:opacity-30 px-2 py-1"
          >
            CLEAR
          </button>
        </div>

        {/* Quick add presets */}
        <div className="px-3 pt-3 grid grid-cols-4 gap-2">
          {PRESETS.map(v => (
            <button
              key={v}
              onClick={() => addPreset(v)}
              className="h-10 rounded bg-[#111] border-[0.5px] border-[#222] font-display text-[14px] text-[#F0F0F0] active:bg-[#1a1a1a]"
            >
              +{v >= 1000 ? `${v / 1000}k` : v}
            </button>
          ))}
        </div>

        {/* Category grid (all visible at once, no wrapping) */}
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

        {/* Note input (compact, optional) */}
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

        {/* ADD button — pinned to bottom of form (closest to thumb) */}
        <button
          onClick={submit}
          disabled={pending}
          className={cn(
            'h-12 w-full font-display text-sm tracking-wider mt-3 disabled:opacity-60 transition-colors',
            isIncome ? 'bg-accent text-[#080808]' : 'bg-[#ff4747] text-[#080808]',
          )}
        >
          {pending ? 'SAVING…' : `+ ADD ${type} · ¥${formatRMB(amount)}`}
        </button>
      </div>
    </div>
  );
}
