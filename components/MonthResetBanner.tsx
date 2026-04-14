'use client';
import { useEffect, useState } from 'react';

export function MonthResetBanner() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(t);
  }, []);
  if (!visible) return null;
  return (
    <div
      className="shrink-0 flex items-center justify-center h-8 font-mono text-[10px] tracking-[1.5px]"
      style={{ color: '#e8ff47', background: '#e8ff4712' }}
    >
      ✦ MONTH RESET — FRESH START
    </div>
  );
}
