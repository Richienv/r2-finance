'use client';

import { useEffect } from 'react';
import { MacroForm, type MacroFormInitial } from './MacroForm';
import { cn } from '@/lib/cn';
import type { MacroType } from '@/lib/macro';

type Props = {
  open: boolean;
  onClose: () => void;
  initial?: MacroFormInitial | null;
  defaultType?: MacroType;
  defaultDate?: string;
};

export function MacroSheet({ open, onClose, initial, defaultType = 'INCOME', defaultDate }: Props) {
  // Lock background scroll while sheet is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const editing = !!initial;

  return (
    <div
      className={cn(
        'absolute inset-0 z-50',
        open ? 'pointer-events-auto' : 'pointer-events-none',
      )}
    >
      {/* backdrop */}
      <div
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black transition-opacity duration-300',
          open ? 'opacity-70' : 'opacity-0',
        )}
      />

      {/* sheet */}
      <div
        className={cn(
          'absolute left-0 right-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-2xl border-t hairline transition-transform duration-300 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ background: '#0a0a0a' }}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-2 pb-1">
          <div className="w-10 h-1 rounded-full bg-[#222]" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between px-4 py-2">
          <span className="font-display text-base tracking-wider">
            {editing ? 'EDIT MACRO' : 'NEW MACRO'}
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 flex items-center justify-center font-mono text-[14px] text-[#888] active:text-white"
          >
            ✕
          </button>
        </div>

        {open && (
          <MacroForm
            initial={initial ?? null}
            defaultType={defaultType}
            defaultDate={defaultDate}
            onSaved={onClose}
          />
        )}

        {/* extra spacer so submit button isn't covered by the iOS home bar */}
        <div className="h-6" />
      </div>
    </div>
  );
}
