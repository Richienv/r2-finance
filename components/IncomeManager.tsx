'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addIncome, deleteIncome } from '@/app/actions/income';
import { INCOME_SOURCES, type IncomeSource } from '@/lib/income';
import { formatRMB } from '@/lib/money';
import { cn } from '@/lib/cn';

type IncomeItem = {
  id: string;
  date: string;
  amountRMB: number;
  source: string;
  note: string | null;
};

const SOURCE_LABEL: Record<IncomeSource, string> = {
  SALARY: 'Salary',
  BONUS: 'Bonus',
  SIDE: 'Side',
  OTHER: 'Other',
};

export function IncomeManager({ items, monthTotal }: { items: IncomeItem[]; monthTotal: number }) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<IncomeSource>('BONUS');
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('enter amount');
      return;
    }
    startTransition(async () => {
      try {
        await addIncome({ amountRMB: amt, source, note });
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
        await deleteIncome(id);
        router.refresh();
      } catch {}
    });
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-5 py-4 border-b hairline">
        <div className="font-mono text-[10px] tracking-[2px] text-muted mb-1">THIS MONTH</div>
        <div className="font-display text-[36px] text-accent tabular-nums">+{formatRMB(monthTotal)} RMB</div>
        <div className="font-mono text-[9px] text-[#444] mt-1">
          TIP: BONUSES ADD TO YOUR SAVINGS POOL · THEY DON&apos;T CHANGE DAILY BUDGET
        </div>
      </div>

      <div className="px-5 py-4 border-b hairline flex flex-col gap-2">
        <div className="font-mono text-[10px] tracking-[2px] text-muted">LOG INCOME</div>
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
            placeholder="note (optional)"
            className="flex-1 min-w-0 bg-[#111] border-[0.5px] border-[#222] rounded px-3 py-2 font-sans text-[14px] text-white outline-none"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {INCOME_SOURCES.map(s => (
            <button
              key={s}
              onClick={() => setSource(s)}
              className={cn(
                'px-3 py-1 rounded-full font-mono text-[10px] tracking-[1.5px] border-[0.5px]',
                source === s
                  ? 'bg-accent text-[#080808] border-accent'
                  : 'bg-[#111] text-[#888] border-[#222]',
              )}
            >
              {SOURCE_LABEL[s].toUpperCase()}
            </button>
          ))}
        </div>
        {error && <div className="text-[11px] text-danger font-mono">{error}</div>}
        <button
          onClick={submit}
          disabled={pending}
          className="h-11 bg-accent text-[#080808] font-display text-sm tracking-wider rounded disabled:opacity-60"
        >
          {pending ? 'SAVING…' : '+ ADD INCOME'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-6 text-center text-[11px] font-mono text-[#444]">
            — no income this month —
          </div>
        ) : (
          items.map(it => (
            <div key={it.id} className="px-5 py-2.5 flex items-center justify-between border-b hairline">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] tracking-[1px] uppercase text-[#888]">{it.source}</span>
                  <span className="font-sans text-[13px] text-white truncate">{it.note || '—'}</span>
                </div>
                <span className="font-mono text-[9px] text-[#444] mt-0.5">{it.date}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[13px] tabular-nums text-accent">+{formatRMB(it.amountRMB)}</span>
                <button
                  onClick={() => remove(it.id)}
                  disabled={pending}
                  className="font-mono text-[10px] text-[#555] hover:text-danger"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
