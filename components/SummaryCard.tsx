export function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className="rounded-md border hairline bg-surface p-3">
      <div className="font-mono text-[10px] tracking-widest text-muted">{label}</div>
      <div className={`mt-1 font-display text-2xl ${accent ? 'text-accent' : 'text-white'}`}>{value}</div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-muted">{sub}</div>}
    </div>
  );
}
