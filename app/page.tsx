import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { BigNumber } from '@/components/BigNumber';
import { BudgetStats } from '@/components/BudgetStats';
import { QuickAddRow } from '@/components/QuickAddRow';
import { getMonthExpenses, getTodayExpenses, getWeekExpenses, sumRMB } from '@/lib/queries';
import {
  VARIABLE_BUDGET,
  IDR_PER_RMB,
  DAILY_BUDGET,
  WEEKLY_BUDGET,
  MONTHLY_FREE,
} from '@/lib/constants';
import { remainingFree } from '@/lib/budget';
import { currentMonthKey } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const month = currentMonthKey();
  const [monthRows, todayRows, week] = await Promise.all([
    getMonthExpenses(month),
    getTodayExpenses(),
    getWeekExpenses(),
  ]);

  const spentFree = sumRMB(monthRows, { excludeFixed: true });
  const remaining = remainingFree(VARIABLE_BUDGET.freeSpending, spentFree);
  const idr = rmbToIdr(Math.max(0, remaining), IDR_PER_RMB);

  const todaySpent = sumRMB(todayRows, { excludeFixed: true });
  const weekSpent = sumRMB(week.rows, { excludeFixed: true });
  const monthSpent = spentFree;

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <div className="flex flex-col leading-tight">
          <span className="font-display text-xl tracking-wider">R2·FIT</span>
          <span className="font-mono text-[10px] tracking-[0.25em] text-muted">FINANCE</span>
        </div>
        <span className="font-mono text-[11px] tracking-widest text-muted uppercase">
          {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'Asia/Shanghai' })}
        </span>
      </header>

      <BigNumber remainingRMB={Math.max(0, remaining)} totalRMB={VARIABLE_BUDGET.freeSpending} idr={idr} />
      <BudgetStats
        dailyBudget={DAILY_BUDGET}
        weeklyBudget={WEEKLY_BUDGET}
        monthlyBudget={MONTHLY_FREE}
        todaySpent={todaySpent}
        weekSpent={weekSpent}
        monthSpent={monthSpent}
      />
      <QuickAddRow />
      <BottomNav />
    </AppShell>
  );
}
