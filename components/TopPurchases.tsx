'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { deleteExpense } from '@/app/actions/expenses';
import { deleteMacro } from '@/app/actions/macro';
import { formatRMB } from '@/lib/money';
import type { TopPurchase } from '@/lib/queries';

const MONTHS_SHORT = [
  'JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC',
];

function shortDate(date: string): string {
  const [, mm, dd] = date.split('-').map(Number);
  return `${MONTHS_SHORT[(mm ?? 1) - 1]} ${dd}`;
}

export function TopPurchases({ items }: { items: TopPurchase[] }) {
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
      <div className="w-[300px] flex flex-col items-stretch">
        <div className="font-mono text-[9px] tracking-[2px] text-[#555] text-center mb-2">
          TOP 3 PURCHASES
        </div>
        <div className="font-mono text-[11px] text-[#444] text-center">— none yet —</div>
      </div>
    );
  }

  return (
    <div className="w-[320px] flex flex-col items-stretch">
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[9px] tracking-[2px] text-[#555]">TOP 3 PURCHASES</span>
        <Link
          href="/top"
          className="font-mono text-[9px] tracking-[2px] text-[#888] active:text-white"
        >
          SEE ALL →
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((p, i) => {
          const isRemoving = removingId === p.id && pending;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 font-mono text-[12px]"
              style={{ opacity: isRemoving ? 0.4 : 1 }}
            >
              <span className="text-[#444] tabular-nums shrink-0 w-4">#{i + 1}</span>
              <span className="text-[#bbb] truncate flex-1 min-w-0">{p.label}</span>
              <span className="font-mono text-[8px] tabular-nums tracking-[1px] text-[#444] shrink-0">
                {shortDate(p.date)}
              </span>
              <span
                className="tabular-nums shrink-0 text-right w-16"
                style={{ color: '#ff6666' }}
              >
                ¥{formatRMB(p.amountRMB)}
              </span>
              <button
                onClick={() => remove(p)}
                disabled={pending}
                aria-label={`Remove ${p.label}`}
                className="font-mono text-[12px] text-[#444] hover:text-danger active:text-danger w-4 shrink-0 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
