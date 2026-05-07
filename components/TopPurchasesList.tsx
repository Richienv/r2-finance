'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteExpense } from '@/app/actions/expenses';
import { deleteMacro } from '@/app/actions/macro';
import { formatRMB } from '@/lib/money';
import { cn } from '@/lib/cn';
import type { TopPurchase } from '@/lib/queries';

const MONTHS_SHORT = [
  'JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC',
];

function shortDate(date: string): string {
  const [yyyy, mm, dd] = date.split('-').map(Number);
  return `${MONTHS_SHORT[(mm ?? 1) - 1]} ${dd}, ${yyyy}`;
}

export function TopPurchasesList({ items }: { items: TopPurchase[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function remove(p: TopPurchase) {
    setRemovingId(p.id);
    startTransition(async () => {
      try {
        const rawId = p.id.slice(2); // strip "e:" / "m:" prefix
        if (p.source === 'DAILY') {
          await deleteExpense(rawId);
        } else {
          await deleteMacro(rawId);
        }
        router.refresh();
      } finally {
        setRemovingId(null);
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center font-mono text-[11px] text-[#444]">
        — no purchases yet —
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {items.map((p, i) => {
        const isRemoving = removingId === p.id && pending;
        return (
          <div
            key={p.id}
            className="flex items-center gap-3 px-4 py-3 border-b hairline"
            style={{ opacity: isRemoving ? 0.4 : 1 }}
          >
            <span
              className={cn(
                'font-display text-[14px] tabular-nums shrink-0 w-7 text-right',
                i < 3 ? 'text-accent' : 'text-[#444]',
              )}
            >
              #{i + 1}
            </span>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-sans text-[13px] text-white truncate">{p.label}</span>
              <span className="font-mono text-[8px] tracking-[1px] text-[#555] mt-0.5 tabular-nums">
                {p.source === 'MACRO' ? 'MACRO' : p.category} · {shortDate(p.date)}
              </span>
            </div>
            <span
              className="font-mono text-[14px] tabular-nums shrink-0"
              style={{ color: '#ff6666' }}
            >
              ¥{formatRMB(p.amountRMB)}
            </span>
            <button
              onClick={() => remove(p)}
              disabled={pending}
              aria-label={`Remove ${p.label}`}
              className="font-mono text-[12px] text-[#444] hover:text-danger w-6 shrink-0 disabled:opacity-30"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
