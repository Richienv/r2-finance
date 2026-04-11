'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const items = [
  { href: '/',         label: 'HOME',     icon: '🏠' },
  { href: '/add',      label: 'ADD',      icon: '➕' },
  { href: '/week',     label: 'WEEK',     icon: '📊' },
  { href: '/settings', label: 'SETTINGS', icon: '⚙️' },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="h-16 shrink-0 grid grid-cols-4 border-t hairline bg-surface">
      {items.map(i => {
        const active = path === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 text-[10px] tracking-wider',
              active ? 'text-accent' : 'text-muted',
            )}
          >
            <span className="text-lg leading-none">{i.icon}</span>
            <span className="font-mono">{i.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
