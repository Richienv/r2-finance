'use client';

export function R2OSLink() {
  return (
    <button
      onClick={() => { window.location.href = 'https://r2-os.vercel.app'; }}
      className="px-2 py-1 font-mono text-[9px] tracking-[1px] cursor-pointer"
      style={{ color: 'rgba(254, 232, 232, 0.3)' }}
    >
      R2·OS ↗
    </button>
  );
}
