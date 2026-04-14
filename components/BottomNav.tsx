'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const OS_URL = 'https://r2-os.vercel.app';

const leftItems = [
  { href: '/',    label: 'HOME' },
  { href: '/add', label: 'ADD'  },
];

const rightItems = [
  { href: '/week',     label: 'WEEK'     },
  { href: '/settings', label: 'SETTINGS' },
];

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex-1 h-full flex items-center justify-center font-mono text-[11px] tracking-[1.5px]',
        active ? 'text-accent' : 'text-[#555]',
      )}
    >
      {active && (
        <span
          className="absolute top-0 left-1/2 -translate-x-1/2 h-[2px] w-8"
          style={{ background: '#e8ff47' }}
        />
      )}
      {label}
    </Link>
  );
}

export function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="h-16 shrink-0 flex items-center overflow-visible"
      style={{ background: '#111', borderTop: '1px solid #2a2a2a' }}
    >
      {leftItems.map(i => (
        <NavItem key={i.href} href={i.href} label={i.label} active={path === i.href} />
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
        <NavItem key={i.href} href={i.href} label={i.label} active={path === i.href} />
      ))}
    </nav>
  );
}
