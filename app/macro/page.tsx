import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { MacroManager } from '@/components/MacroManager';
import { getMacroBalance, getMacros } from '@/app/actions/macro';
import { currentMonthKey } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function MacroPage() {
  const month = currentMonthKey();
  const [rows, balance] = await Promise.all([getMacros(), getMacroBalance()]);

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">MACRO</span>
        <span className="font-mono text-[11px] text-muted">{month}</span>
      </header>
      <MacroManager
        items={rows.map(r => ({
          id: r.id,
          date: r.date,
          amountRMB: r.amountRMB,
          type: r.type,
          category: r.category,
          note: r.note,
        }))}
        balanceRMB={balance.balanceRMB}
        incomeRMB={balance.incomeRMB}
        expenseRMB={balance.expenseRMB}
      />
      <BottomNav />
    </AppShell>
  );
}
