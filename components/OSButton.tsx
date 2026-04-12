'use client';

const OS_URL = 'https://r2-os.vercel.app';

export default function OSButton({
  bg = '#F0F0F0',
  color = '#080808',
}: {
  bg?: string;
  color?: string;
}) {
  return (
    <button
      onClick={() => { window.location.href = OS_URL; }}
      style={{
        position: 'fixed',
        bottom: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 99,
        width: '80px',
        height: '32px',
        borderRadius: '999px',
        background: bg,
        color: color,
        border: 'none',
        cursor: 'pointer',
        fontFamily: 'Impact, Arial Narrow, sans-serif',
        fontSize: '14px',
        letterSpacing: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        WebkitTapHighlightColor: 'transparent',
        transition: 'transform 100ms, background 100ms',
        userSelect: 'none',
      }}
      onMouseDown={e => {
        e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
        e.currentTarget.style.background = '#CCCCCC';
      }}
      onMouseUp={e => {
        e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
        e.currentTarget.style.background = bg;
      }}
      onTouchStart={e => {
        e.currentTarget.style.transform = 'translateX(-50%) scale(0.95)';
        e.currentTarget.style.background = '#CCCCCC';
      }}
      onTouchEnd={e => {
        e.currentTarget.style.transform = 'translateX(-50%) scale(1)';
        e.currentTarget.style.background = bg;
      }}
    >
      OS
    </button>
  );
}
