'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { addMacro, updateMacro } from '@/app/actions/macro';
import {
  MACRO_EXPENSE_CATEGORIES,
  MACRO_INCOME_CATEGORIES,
  type MacroType,
} from '@/lib/macro';
import { IDR_PER_RMB } from '@/lib/constants';
import { formatIDR, formatRMB, rmbToIdr } from '@/lib/money';
import { cn } from '@/lib/cn';

const PRESETS = [100, 500, 1000, 5000];

function presetLabel(v: number): string {
  return v >= 1000 ? `${v / 1000}k` : String(v);
}

function parseAmount(input: string): number {
  const n = parseFloat(input);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export type MacroFormInitial = {
  id: string;
  type: MacroType;
  amountRMB: number;
  category: string;
  note: string | null;
  date?: string;
};

type Props = {
  initial?: MacroFormInitial | null;
  defaultType?: MacroType;
  defaultDate?: string;
  onSaved?: () => void;
};

export function MacroForm({ initial, defaultType = 'INCOME', defaultDate, onSaved }: Props) {
  const router = useRouter();
  const [type, setType] = useState<MacroType>(initial?.type ?? defaultType);
  const [amountInput, setAmountInput] = useState<string>(
    initial ? String(initial.amountRMB) : '',
  );
  const [category, setCategory] = useState<string>(
    initial?.category ??
      (defaultType === 'INCOME' ? MACRO_INCOME_CATEGORIES[0] : MACRO_EXPENSE_CATEGORIES[0]),
  );
  const [note, setNote] = useState<string>(initial?.note ?? '');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever the entry being edited (or default type) changes
  useEffect(() => {
    setType(initial?.type ?? defaultType);
    setAmountInput(initial ? String(initial.amountRMB) : '');
    setCategory(
      initial?.category ??
        (defaultType === 'INCOME' ? MACRO_INCOME_CATEGORIES[0] : MACRO_EXPENSE_CATEGORIES[0]),
    );
    setNote(initial?.note ?? '');
    setError(null);
  }, [initial, defaultType]);

  const amount = parseAmount(amountInput);
  const isIncome = type === 'INCOME';
  const accentColor = isIncome ? '#e8ff47' : '#ff4747';
  const idrPreview = amount > 0 ? rmbToIdr(amount, IDR_PER_RMB) : 0;
  const categoryList = isIncome ? MACRO_INCOME_CATEGORIES : MACRO_EXPENSE_CATEGORIES;
  const editing = !!initial;

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

  function handleAmountChange(raw: string) {
    const cleaned = raw.replace(/[^\d.]/g, '');
    const parts = cleaned.split('.');
    const safe = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
    setAmountInput(safe);
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
        if (initial) {
          await updateMacro({
            id: initial.id,
            type,
            amountRMB: amount,
            category,
            note,
          });
        } else {
          await addMacro({
            type,
            amountRMB: amount,
            category,
            note,
            date: defaultDate,
          });
        }
        router.refresh();
        onSaved?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'failed');
      }
    });
  }

  return (
    <div className="flex flex-col">
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

      {/* Amount */}
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
            onChange={e => handleAmountChange(e.target.value)}
            placeholder="0"
            className="flex-1 min-w-0 bg-transparent border-none outline-none font-display text-[36px] leading-none tabular-nums placeholder:text-[#333]"
            style={{ color: amount > 0 ? accentColor : '#F0F0F0' }}
          />
        </div>
        <div className="font-mono text-[10px] text-[#444] mt-1">
          ≈ {formatIDR(idrPreview)}
        </div>
      </div>

      {/* Add presets */}
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

      {/* Subtract presets */}
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
  );
}
