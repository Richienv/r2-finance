import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { BigNumber } from '@/components/BigNumber';
import { DailyStrip } from '@/components/DailyStrip';
import { QuickAddRow } from '@/components/QuickAddRow';
import { getMonthExpenses, getTodayExpenses, sumRMB } from '@/lib/queries';
import { VARIABLE_BUDGET, IDR_PER_RMB } from '@/lib/constants';
import { remainingFree, dailyFreeBudget } from '@/lib/budget';
import { currentMonthKey, daysInMonth } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { R2OSLink } from '@/components/R2OSLink';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const month = currentMonthKey();
  const [monthRows, todayRows] = await Promise.all([
    getMonthExpenses(month),
    getTodayExpenses(),
  ]);

  const spentFree = sumRMB(monthRows, { excludeFixed: true });
  const remaining = remainingFree(VARIABLE_BUDGET.freeSpending, spentFree);
  const idr = rmbToIdr(Math.max(0, remaining), IDR_PER_RMB);
  const dailyFree = dailyFreeBudget(VARIABLE_BUDGET.freeSpending, daysInMonth(month));
  const todaySpent = sumRMB(todayRows, { excludeFixed: true });

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <div className="flex flex-col leading-tight">
          <span className="font-display text-xl tracking-wider">R2·FIT</span>
          <span className="font-mono text-[10px] tracking-[0.25em] text-muted">FINANCE</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] tracking-widest text-muted uppercase">
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'Asia/Shanghai' })}
          </span>
          <R2OSLink />
        </div>
      </header>

      <BigNumber remainingRMB={Math.max(0, remaining)} totalRMB={VARIABLE_BUDGET.freeSpending} idr={idr} />
      <DailyStrip todaySpent={todaySpent} dailyFree={dailyFree} />
      <QuickAddRow />
      <BottomNav />
    </AppShell>
  );
}
