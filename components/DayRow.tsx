'use client';
import { useEffect, useRef, useState, useTransition } from 'react';
import { formatRMB } from '@/lib/money';
import { cn } from '@/lib/cn';
import { deleteExpense, updateExpense } from '@/app/actions/expenses';

type Expense = { id: string; note: string | null; amountRMB: number; category: string };
export type Day = { date: string; label: string; total: number; expenses: Expense[]; isToday: boolean };

export function DayRow({
  day,
  open,
  onToggle,
}: {
  day: Day;
  open: boolean;
  onToggle: () => void;
}) {
  const over = day.total > 37;
  return (
    <div className="border-b hairline">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 h-11 text-left"
      >
        <span className="font-mono text-xs tracking-wider text-muted">
          {day.label}
          {day.isToday ? ' (today)' : ''}
        </span>
        <span className="flex items-center gap-2">
          <span className={cn('font-mono text-xs tabular-nums', over ? 'text-danger' : 'text-success')}>
            {formatRMB(day.total)} RMB
          </span>
          <span className="font-mono text-[10px] text-[#555]">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <ul className="pb-2">
          {day.expenses.length === 0 && (
            <li className="px-5 py-2 text-[11px] font-mono text-[#444]">— no expenses —</li>
          )}
          {day.expenses.map(e => (
            <ExpenseRow key={e.id} expense={e} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleted, setDeleted] = useState(false);
  const startX = useRef<number | null>(null);
  const movedRef = useRef(false);

  const [amountInput, setAmountInput] = useState(String(expense.amountRMB));
  const [noteInput, setNoteInput] = useState(expense.note ?? '');

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => { setConfirming(false); setDx(0); }, 3000);
    return () => clearTimeout(t);
  }, [confirming]);

  function onPointerDown(e: React.PointerEvent) {
    if (editing) return;
    startX.current = e.clientX;
    movedRef.current = false;
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (startX.current == null) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 3) movedRef.current = true;
    if (d < 0) setDx(Math.max(-96, d));
  }
  function onPointerUp() {
    if (startX.current == null) return;
    startX.current = null;
    setDragging(false);
    if (dx <= -60) {
      setDx(-80);
      setConfirming(true);
    } else {
      setDx(0);
    }
  }

  function doDelete() {
    startTransition(async () => {
      try {
        await deleteExpense(expense.id);
        setDeleted(true);
      } catch {
        setDx(0);
        setConfirming(false);
      }
    });
  }

  function openEdit() {
    if (movedRef.current || confirming) return;
    setAmountInput(String(expense.amountRMB));
    setNoteInput(expense.note ?? '');
    setEditing(true);
  }

  function saveEdit() {
    const amt = parseFloat(amountInput);
    if (!Number.isFinite(amt) || amt <= 0) return;
    startTransition(async () => {
      try {
        await updateExpense({ id: expense.id, amountRMB: amt, note: noteInput });
        setEditing(false);
      } catch {}
    });
  }

  if (deleted) return null;

  if (editing) {
    return (
      <li className="bg-[#0d0d0d] px-5 py-2 flex items-center gap-2 border-y-[0.5px] border-[#222]">
        <span className="font-mono text-[9px] tracking-[1px] uppercase text-[#555] shrink-0">
          {expense.category}
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={amountInput}
          onChange={e => setAmountInput(e.target.value)}
          className="w-16 bg-[#111] border-[0.5px] border-[#222] rounded px-2 py-1 font-mono text-[12px] text-[#e8ff47] outline-none tabular-nums"
        />
        <input
          type="text"
          value={noteInput}
          onChange={e => setNoteInput(e.target.value)}
          placeholder="note"
          className="flex-1 min-w-0 bg-[#111] border-[0.5px] border-[#222] rounded px-2 py-1 font-sans text-[12px] text-white outline-none"
        />
        <button
          onClick={saveEdit}
          disabled={pending}
          className="font-mono text-[10px] tracking-wider text-[#080808] bg-accent px-2 py-1 rounded"
        >
          {pending ? '…' : 'SAVE'}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="font-mono text-[10px] tracking-wider text-[#888] px-1"
        >
          ✕
        </button>
      </li>
    );
  }

  return (
    <li className="relative overflow-hidden">
      <button
        onClick={doDelete}
        disabled={pending}
        className="absolute right-0 top-0 bottom-0 w-20 flex items-center justify-center font-mono text-[10px] tracking-wider text-white bg-danger"
      >
        {pending ? '…' : confirming ? 'CONFIRM' : 'DELETE'}
      </button>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={openEdit}
        className="relative bg-bg pl-8 pr-5 py-1.5 flex items-center justify-between touch-pan-y cursor-pointer"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dragging ? undefined : 'transform 180ms ease-out',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-mono text-[9px] tracking-[1px] uppercase text-[#555] shrink-0">
            {expense.category}
          </span>
          <span className="font-sans text-[13px] text-white truncate">
            {expense.note ?? '—'}
          </span>
        </div>
        <span className="font-mono text-[12px] tabular-nums shrink-0" style={{ color: '#e8ff47' }}>
          {formatRMB(expense.amountRMB)} RMB
        </span>
      </div>
    </li>
  );
}
