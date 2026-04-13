'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { addExpense } from '@/app/actions/expenses';
import { CATEGORIES, CATEGORY_META, IDR_PER_RMB, type Category } from '@/lib/constants';
import { formatIDR, rmbToIdr } from '@/lib/money';
import { cn } from '@/lib/cn';

const PRESETS = [18, 20, 25, 30, 50];
const MIN_AMOUNT = 0.5;

function vibrate(pattern: number | number[]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try { navigator.vibrate(pattern); } catch {}
  }
}

function todayLabel(): string {
  const d = new Date();
  const wk = ['SUN','MON','TUE','WED','THU','FRI','SAT'][d.getDay()];
  const mo = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][d.getMonth()];
  return `TODAY, ${wk} ${mo} ${d.getDate()}`;
}

export function AddExpenseForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const initialCat = (sp.get('cat') as Category) ?? 'FOOD';

  const [step, setStep] = useState<1 | 2>(1);
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState<Category>(
    CATEGORIES.includes(initialCat) ? initialCat : 'FOOD',
  );
  const [note, setNote] = useState('');
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  const idrPreview = amount > 0 ? rmbToIdr(amount, IDR_PER_RMB) : 0;
  const canNext = amount >= MIN_AMOUNT;

  function bump(delta: number) {
    setAmount(a => Math.max(0, Math.round((a + delta) * 10) / 10));
    vibrate(10);
  }

  function setPreset(v: number) {
    setAmount(v);
    vibrate(15);
  }

  function goNext() {
    if (!canNext) return;
    setError(null);
    setStep(2);
  }

  function goBack() {
    setStep(1);
  }

  function submit() {
    setError(null);
    if (!(amount >= MIN_AMOUNT)) { setError('Enter an amount'); return; }
    startTransition(async () => {
      try {
        await addExpense({ amountRMB: amount, category, note });
        vibrate([10, 50, 10]);
        setFlash(true);
        setTimeout(() => router.push('/'), 180);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      }
    });
  }

  return (
    <div className="flex-1 relative overflow-hidden bg-bg">
      {/* success flash */}
      {flash && (
        <div className="absolute inset-0 z-50 pointer-events-none animate-pulse" style={{ background: '#E8FF4730' }} />
      )}

      {/* sliding rail */}
      <div
        className="absolute inset-0 flex transition-transform duration-[250ms] ease-out"
        style={{ width: '200%', transform: step === 1 ? 'translateX(0)' : 'translateX(-50%)' }}
      >
        {/* STEP 1 */}
        <section className="w-1/2 h-full flex flex-col">
          <Header
            left={<button onClick={() => router.back()} className="font-mono text-[10px] tracking-widest text-[#444]">← CANCEL</button>}
            center={<span className="font-display text-base tracking-wider text-[#F0F0F0]">ADD EXPENSE</span>}
          />

          {/* hero amount */}
          <div className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="font-mono text-[9px] tracking-[2px] text-[#444] mb-2">AMOUNT (RMB)</div>
            <div className="font-display text-[72px] leading-none text-[#F0F0F0] tabular-nums">
              ¥ {amount % 1 === 0 ? amount : amount.toFixed(1)}
            </div>
            <div className="mt-3 font-mono text-[13px] text-[#444]">≈ {formatIDR(idrPreview)}</div>
          </div>

          {/* presets */}
          <div className="px-4 flex justify-center gap-2 mb-2">
            {PRESETS.map(v => {
              const active = amount === v;
              return (
                <button
                  key={v}
                  onClick={() => setPreset(v)}
                  className={cn(
                    'h-8 w-12 rounded-full font-display text-sm border-[0.5px]',
                    active
                      ? 'bg-accent text-[#080808] border-accent'
                      : 'bg-[#111] text-[#F0F0F0] border-[#222]',
                  )}
                >
                  {v}
                </button>
              );
            })}
          </div>

          {/* increment rows */}
          <div className="px-4 flex flex-col gap-2 pb-2">
            <IncrementRow delta={10} onPress={bump} accelerate />
            <IncrementRow delta={5} onPress={bump} />
            <IncrementRow delta={1} onPress={bump} />
          </div>

          {error && step === 1 && (
            <div className="px-4 pb-2 text-xs text-danger font-mono text-center">{error}</div>
          )}

          {/* next button */}
          <button
            onClick={goNext}
            disabled={!canNext}
            className={cn(
              'h-14 w-full font-display text-lg tracking-wider',
              canNext ? 'bg-accent text-[#080808]' : 'bg-[#1A1A1A] text-[#333]',
            )}
          >
            {canNext ? 'NEXT →' : 'ENTER AMOUNT'}
          </button>
        </section>

        {/* STEP 2 */}
        <section className="w-1/2 h-full flex flex-col">
          <Header
            left={<button onClick={goBack} className="font-mono text-[10px] tracking-widest text-[#444]">← BACK</button>}
            center={<span className="font-display text-xl tracking-wider text-accent">¥ {amount % 1 === 0 ? amount : amount.toFixed(1)}</span>}
          />

          {/* category */}
          <div className="px-4 mt-5">
            <div className="font-mono text-[9px] tracking-[2px] text-[#444] mb-3">CATEGORY</div>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(c => {
                const m = CATEGORY_META[c];
                const active = category === c;
                return (
                  <button
                    key={c}
                    onClick={() => { setCategory(c); vibrate(10); }}
                    className={cn(
                      'h-20 rounded-lg flex flex-col items-center justify-center gap-1.5',
                      active
                        ? 'border-[1.5px]'
                        : 'bg-[#111] border-[0.5px] border-[#222]',
                    )}
                    style={active ? { background: '#E8FF4715', borderColor: '#E8FF47' } : undefined}
                  >
                    <span className="text-2xl leading-none">{m.emoji}</span>
                    <span
                      className="font-display text-base tracking-wider"
                      style={{ color: active ? '#E8FF47' : '#F0F0F0' }}
                    >
                      {m.label.toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* note */}
          <div className="px-4 mt-5">
            <div className="font-mono text-[9px] tracking-[2px] text-[#444] mb-2">NOTE (OPTIONAL)</div>
            <input
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="lunch at cafeteria..."
              className="w-full h-12 px-3.5 rounded-lg bg-[#111] border-[0.5px] border-[#222] outline-none text-sm text-[#F0F0F0] placeholder:text-[#444]"
            />
          </div>

          {/* date */}
          <div className="px-4 py-3 mt-1 flex items-center justify-between">
            <span className="font-mono text-[9px] tracking-[1px] text-[#444]">DATE · {todayLabel()}</span>
          </div>

          <div className="flex-1" />

          {error && step === 2 && (
            <div className="px-4 pb-2 text-xs text-danger font-mono text-center">{error}</div>
          )}

          {/* summary */}
          <div className="text-center font-mono text-[10px] text-[#444] mb-2 px-4 truncate">
            ¥ {amount % 1 === 0 ? amount : amount.toFixed(1)} · {category}
            {note ? ` · ${note}` : ''}
          </div>

          {/* add button */}
          <button
            onClick={submit}
            disabled={pending}
            className="h-14 w-full bg-accent text-[#080808] font-display text-lg tracking-wider disabled:opacity-60"
          >
            {pending ? 'SAVING…' : 'ADD EXPENSE ✓'}
          </button>
        </section>
      </div>
    </div>
  );
}

function Header({ left, center }: { left: React.ReactNode; center: React.ReactNode }) {
  return (
    <div className="h-[52px] shrink-0 flex items-center px-4 border-b-[0.5px] border-[#222] relative">
      <div className="flex-1">{left}</div>
      <div className="absolute left-1/2 -translate-x-1/2">{center}</div>
      <div className="flex-1" />
    </div>
  );
}

function IncrementRow({
  delta,
  onPress,
  accelerate = false,
}: {
  delta: number;
  onPress: (delta: number) => void;
  accelerate?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <HoldButton delta={-delta} onPress={onPress} accelerate={accelerate} />
      <HoldButton delta={delta} onPress={onPress} accelerate={accelerate} />
    </div>
  );
}

function HoldButton({
  delta,
  onPress,
  accelerate,
}: {
  delta: number;
  onPress: (delta: number) => void;
  accelerate: boolean;
}) {
  const startTimer = useRef<number | null>(null);
  const repeatTimer = useRef<number | null>(null);

  function clear() {
    if (startTimer.current) { window.clearTimeout(startTimer.current); startTimer.current = null; }
    if (repeatTimer.current) { window.clearInterval(repeatTimer.current); repeatTimer.current = null; }
  }

  useEffect(() => clear, []);

  function down() {
    onPress(delta);
    if (!accelerate) return;
    startTimer.current = window.setTimeout(() => {
      repeatTimer.current = window.setInterval(() => onPress(delta), 100);
    }, 500);
  }

  const sign = delta >= 0 ? '+' : '−';
  const abs = Math.abs(delta);

  return (
    <button
      onPointerDown={down}
      onPointerUp={clear}
      onPointerLeave={clear}
      onPointerCancel={clear}
      className="flex-1 h-14 bg-[#111] border-[0.5px] border-[#222] rounded-lg font-display text-xl text-[#F0F0F0] active:bg-[#1a1a1a] select-none"
    >
      {sign} {abs}
    </button>
  );
}
