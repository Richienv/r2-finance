'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const OS_URL = 'https://r2-os.vercel.app';

const leftItems = [
  { href: '/',      label: 'HOME',  icon: '🏠' },
  { href: '/macro', label: 'MACRO', icon: '📈' },
];

const rightItems = [
  { href: '/week',     label: 'WEEK',     icon: '📊' },
  { href: '/settings', label: 'SETTINGS', icon: '⚙️' },
];

function NavItem({
  href,
  label,
  icon,
  active,
}: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        'flex-1 h-full flex flex-col items-center justify-center gap-1',
        active ? 'text-accent' : 'text-[#555]',
      )}
    >
      <span
        className="text-[22px] leading-none"
        style={{
          filter: active ? 'none' : 'grayscale(1) brightness(0.7)',
          opacity: active ? 1 : 0.85,
        }}
      >
        {icon}
      </span>
      <span className="font-mono text-[10px] tracking-[1.5px]">{label}</span>
    </Link>
  );
}

export function BottomNav() {
  const path = usePathname();

  return (
    <nav
      className="h-[72px] shrink-0 flex items-center overflow-visible"
      style={{ background: '#111', borderTop: '1px solid #2a2a2a' }}
    >
      {leftItems.map(i => (
        <NavItem
          key={i.href}
          href={i.href}
          label={i.label}
          icon={i.icon}
          active={path === i.href}
        />
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
            boxShadow: '0 -4px 24px rgba(232,255,71,0.25), 0 -4px 16px rgba(255,255,255,0.1)',
            transition: 'transform 100ms, box-shadow 100ms',
            WebkitTapHighlightColor: 'transparent',
            userSelect: 'none',
          }}
        >
          OS
        </button>
      </div>

      {rightItems.map(i => (
        <NavItem
          key={i.href}
          href={i.href}
          label={i.label}
          icon={i.icon}
          active={path === i.href}
        />
      ))}
    </nav>
  );
}
