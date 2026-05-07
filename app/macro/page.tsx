import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { MacroBoard } from '@/components/MacroBoard';
import { getMacroBalance, getMacros } from '@/app/actions/macro';
import { getMonthExpenses } from '@/lib/queries';
import { currentMonthKey } from '@/lib/date';

export const dynamic = 'force-dynamic';

export default async function MacroPage() {
  const month = currentMonthKey();
  const [allMacros, balance, monthExpensesRaw] = await Promise.all([
    getMacros(),
    getMacroBalance(),
    getMonthExpenses(month),
  ]);

  const macros = allMacros.map(m => ({
    id: m.id,
    date: m.date,
    amountRMB: m.amountRMB,
    type: m.type,
    category: m.category,
    note: m.note,
  }));

  const monthMacros = macros.filter(m => m.date.startsWith(month));

  // Daily expenses for the calendar (skip FIXED — those are bookkeeping, not real outflows)
  const monthExpenses = monthExpensesRaw
    .filter(e => e.category !== 'FIXED')
    .map(e => ({
      id: e.id,
      date: e.date,
      amountRMB: e.amountRMB,
      category: e.category,
      note: e.note,
    }));

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">MACRO</span>
        <span className="font-mono text-[11px] text-muted">{month}</span>
      </header>
      <MacroBoard
        monthKey={month}
        macros={macros}
        monthMacros={monthMacros}
        monthExpenses={monthExpenses}
        balanceRMB={balance.balanceRMB}
        incomeRMB={balance.incomeRMB}
        expenseRMB={balance.expenseRMB}
      />
      <BottomNav />
    </AppShell>
  );
}
