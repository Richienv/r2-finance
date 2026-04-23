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

export function MacroManager({ items, balanceRMB, incomeRMB, expenseRMB }: Props) {
  const router = useRouter();
  const [type, setType] = useState<MacroType>('INCOME');
  const [amount, setAmount] = useState('');
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

  function submit() {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('enter amount');
      return;
    }
    startTransition(async () => {
      try {
        await addMacro({ type, amountRMB: amt, category, note });
        setAmount('');
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
  const balanceIDR = rmbToIdr(Math.abs(balanceRMB), IDR_PER_RMB);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b hairline">
        <div className="font-mono text-[10px] tracking-[2px] text-muted mb-1">BALANCE</div>
        <div
          className="font-display text-[36px] tabular-nums"
          style={{ color: balanceColor }}
        >
          {balanceSign}¥{formatRMB(Math.abs(balanceRMB))}
        </div>
        <div className="font-mono text-[10px] text-[#444] mt-1">
          ≈ {balanceNegative ? '−' : ''}{formatIDR(balanceIDR)}
        </div>
        <div className="font-mono text-[9px] text-[#555] mt-2 tracking-[1px]">
          <span style={{ color: '#e8ff47' }}>+{formatRMB(incomeRMB)} IN</span>
          <span className="text-[#333] mx-2">·</span>
          <span style={{ color: '#ff4747' }}>−{formatRMB(expenseRMB)} OUT</span>
        </div>
      </div>

      <div className="px-5 py-4 border-b hairline flex flex-col gap-2">
        <div className="font-mono text-[10px] tracking-[2px] text-muted">LOG MACRO</div>

        <div className="flex gap-2">
          <button
            onClick={() => selectType('INCOME')}
            className={cn(
              'flex-1 h-9 rounded font-mono text-[11px] tracking-[2px] border-[0.5px]',
              type === 'INCOME'
                ? 'bg-accent text-[#080808] border-accent'
                : 'bg-[#111] text-[#888] border-[#222]',
            )}
          >
            + INCOME
          </button>
          <button
            onClick={() => selectType('EXPENSE')}
            className={cn(
              'flex-1 h-9 rounded font-mono text-[11px] tracking-[2px] border-[0.5px]',
              type === 'EXPENSE'
                ? 'bg-[#ff4747] text-[#080808] border-[#ff4747]'
                : 'bg-[#111] text-[#888] border-[#222]',
            )}
          >
            − EXPENSE
          </button>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="amount"
            className="w-24 bg-[#111] border-[0.5px] border-[#222] rounded px-3 py-2 font-mono text-[14px] text-accent outline-none tabular-nums"
          />
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="note (e.g. salomon shoes)"
            className="flex-1 min-w-0 bg-[#111] border-[0.5px] border-[#222] rounded px-3 py-2 font-sans text-[14px] text-white outline-none"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {categoryList.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'px-3 py-1 rounded-full font-mono text-[10px] tracking-[1.5px] border-[0.5px]',
                category === c
                  ? 'bg-accent text-[#080808] border-accent'
                  : 'bg-[#111] text-[#888] border-[#222]',
              )}
            >
              {c}
            </button>
          ))}
        </div>

        {error && <div className="text-[11px] text-danger font-mono">{error}</div>}

        <button
          onClick={submit}
          disabled={pending}
          className="h-11 bg-accent text-[#080808] font-display text-sm tracking-wider rounded disabled:opacity-60"
        >
          {pending ? 'SAVING…' : `+ ADD ${type}`}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-6 text-center text-[11px] font-mono text-[#444]">
            — no macro entries yet —
          </div>
        ) : (
          items.map(it => {
            const isIncome = it.type === 'INCOME';
            const color = isIncome ? '#e8ff47' : '#ff4747';
            const sign = isIncome ? '+' : '−';
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
    </div>
  );
}
