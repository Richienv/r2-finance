'use client';
import Link from 'next/link';

const quick = [
  { cat: 'FOOD',     label: 'FOOD' },
  { cat: 'SNACKS',   label: 'SNACKS' },
  { cat: 'PERSONAL', label: 'PERSONAL' },
  { cat: 'OTHER',    label: 'OTHER' },
] as const;

export function QuickAddRow() {
  return (
    <div className="grid grid-cols-4 gap-2 px-4 py-3 shrink-0">
      {quick.map(q => (
        <Link
          key={q.cat}
          href={`/add?cat=${q.cat}`}
          className="flex items-center justify-center h-11 rounded-full bg-[#111] border-[0.5px] border-[#222] font-mono text-[11px] tracking-[1.5px] uppercase text-[#F0F0F0] active:bg-accent active:text-[#080808] active:border-accent transition-colors"
        >
          {q.label}
        </Link>
      ))}
    </div>
  );
}
