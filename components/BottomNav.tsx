'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const OS_URL = 'https://r2-os.vercel.app';

const leftItems = [
  { href: '/',    label: 'HOME', icon: '🏠' },
  { href: '/add', label: 'ADD',  icon: '➕' },
];

const rightItems = [
  { href: '/week',     label: 'WEEK',     icon: '📊' },
  { href: '/settings', label: 'SETTINGS', icon: '⚙️' },
];

export function BottomNav() {
  const path = usePathname();

  return (
    <nav className="h-16 shrink-0 flex items-center border-t hairline bg-surface overflow-visible">
      {leftItems.map(i => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] tracking-wider',
            path === i.href ? 'text-accent' : 'text-muted',
          )}
        >
          <span className="text-lg leading-none">{i.icon}</span>
          <span className="font-mono">{i.label}</span>
        </Link>
      ))}

      {/* CENTER OS BUTTON */}
      <div className="flex-1 flex items-center justify-center">
        <button
          onClick={() => { window.location.href = OS_URL; }}
          className="active:scale-[0.92]"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: '#F0F0F0',
            color: '#080808',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'Impact, Arial Narrow, sans-serif',
            fontSize: '16px',
            letterSpacing: '2px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: 'translateY(-12px)',
            boxShadow: '0 -4px 16px rgba(255,255,255,0.1)',
            transition: 'transform 100ms, box-shadow 100ms',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >
          OS
        </button>
      </div>

      {rightItems.map(i => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] tracking-wider',
            path === i.href ? 'text-accent' : 'text-muted',
          )}
        >
          <span className="text-lg leading-none">{i.icon}</span>
          <span className="font-mono">{i.label}</span>
        </Link>
      ))}
    </nav>
  );
}
