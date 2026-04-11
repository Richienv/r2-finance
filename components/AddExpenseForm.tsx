'use client';

import { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addExpense } from '@/app/actions/expenses';
import { CATEGORIES, CATEGORY_META, IDR_PER_RMB, type Category } from '@/lib/constants';
import { formatIDR, rmbToIdr } from '@/lib/money';
import { cn } from '@/lib/cn';

const CHIPS = [18, 20, 25, 30, 50];

export function AddExpenseForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialCat = (sp.get('cat') as Category) ?? 'FOOD';
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<Category>(
    CATEGORIES.includes(initialCat) ? initialCat : 'FOOD',
  );
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const amt = Number(amount);
  const idrPreview = Number.isFinite(amt) && amt > 0 ? rmbToIdr(amt, IDR_PER_RMB) : 0;

  function submit() {
    setError(null);
    if (!(amt > 0)) { setError('Enter an amount'); return; }
    startTransition(async () => {
      try {
        await addExpense({ amountRMB: amt, category, note });
        router.push('/');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <div className="flex-1 flex flex-col px-5 pt-4 overflow-hidden">
      <div className="mx-auto h-1 w-10 rounded-full bg-border mb-4" />
      <h1 className="font-display text-2xl tracking-wider">ADD EXPENSE</h1>

      <label className="mt-6 block text-[10px] font-mono tracking-widest text-muted">AMOUNT (RMB)</label>
      <div className="mt-2 flex items-center gap-2 border hairline rounded-md bg-surface px-4 h-16">
        <span className="font-display text-3xl text-muted">¥</span>
        <input
          autoFocus
          inputMode="decimal"
          pattern="[0-9]*"
          value={amount}
          onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0.00"
          className="flex-1 bg-transparent outline-none font-display text-4xl text-white placeholder:text-muted/50"
        />
      </div>
      <div className="mt-1 text-xs text-muted font-mono">{formatIDR(idrPreview)}</div>

      <div className="mt-3 flex gap-2 overflow-x-auto">
        {CHIPS.map(c => (
          <button
            key={c}
            onClick={() => setAmount(String(c))}
            className="shrink-0 h-9 px-3 rounded-full border hairline font-mono text-xs text-muted active:bg-surface"
          >
            {c}
          </button>
        ))}
      </div>

      <label className="mt-5 block text-[10px] font-mono tracking-widest text-muted">CATEGORY</label>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {CATEGORIES.map(c => {
          const m = CATEGORY_META[c];
          const active = category === c;
          return (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={cn(
                'h-12 rounded-md border hairline flex items-center justify-center gap-2 font-mono text-xs tracking-wider',
                active ? 'bg-surface text-white' : 'text-muted',
              )}
              style={active ? { borderColor: m.color, color: m.color } : undefined}
            >
              <span>{m.emoji}</span>
              <span>{m.label.toUpperCase()}</span>
            </button>
          );
        })}
      </div>

      <label className="mt-5 block text-[10px] font-mono tracking-widest text-muted">NOTE</label>
      <input
        value={note}
        onChange={e => setNote(e.target.value)}
        placeholder="lunch at cafeteria..."
        className="mt-2 h-11 px-3 rounded-md bg-surface border hairline outline-none text-sm"
      />

      {error && <div className="mt-3 text-xs text-danger font-mono">{error}</div>}

      <div className="mt-auto pb-4 pt-4 grid grid-cols-2 gap-3">
        <button
          onClick={() => router.back()}
          className="h-12 rounded-md border hairline font-mono text-xs tracking-widest text-muted"
        >
          CANCEL
        </button>
        <button
          disabled={pending}
          onClick={submit}
          className="h-12 rounded-md bg-accent text-black font-mono text-xs tracking-widest disabled:opacity-60"
        >
          {pending ? 'ADDING…' : 'ADD ✓'}
        </button>
      </div>
    </div>
  );
}
