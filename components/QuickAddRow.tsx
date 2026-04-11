'use client';
import Link from 'next/link';

const quick = [
  { cat: 'FOOD',     label: 'FOOD',     emoji: '🍜' },
  { cat: 'PERSONAL', label: 'PERSONAL', emoji: '🛍️' },
  { cat: 'OTHER',    label: 'OTHER',    emoji: '📦' },
];

export function QuickAddRow() {
  return (
    <div className="grid grid-cols-3 gap-2 px-4 py-3 shrink-0">
      {quick.map(q => (
        <Link
          key={q.cat}
          href={`/add?cat=${q.cat}`}
          className="flex flex-col items-center justify-center h-16 rounded-md bg-surface border hairline active:scale-[0.98] transition-transform"
        >
          <span className="text-xl leading-none">{q.emoji}</span>
          <span className="mt-1 font-mono text-[10px] tracking-wider text-muted">{q.label}</span>
        </Link>
      ))}
    </div>
  );
}
