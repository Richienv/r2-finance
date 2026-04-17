import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { IncomeManager } from '@/components/IncomeManager';
import { getMonthIncome } from '@/app/actions/income';
import { currentMonthKey } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function IncomePage() {
  const month = currentMonthKey();
  const rows = await getMonthIncome(month);
  const total = rows.reduce((s, r) => s + r.amountRMB, 0);

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">INCOME</span>
        <span className="font-mono text-[11px] text-muted">{month}</span>
      </header>
      <IncomeManager
        monthTotal={total}
        items={rows.map(r => ({
          id: r.id,
          date: r.date,
          amountRMB: r.amountRMB,
          source: r.source,
          note: r.note,
        }))}
      />
      <BottomNav />
    </AppShell>
  );
}
