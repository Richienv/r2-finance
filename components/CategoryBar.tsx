export function CategoryBar({
  label, amount, pct, color,
}: { label: string; amount: string; pct: number; color: string }) {
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between font-mono text-[11px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums">{amount}  ({Math.round(pct)}%)</span>
      </div>
      <div className="mt-1 h-1.5 bg-border/60 rounded-sm overflow-hidden">
        <div className="h-full" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
    </div>
  );
}
