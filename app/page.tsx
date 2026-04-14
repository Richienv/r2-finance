import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { BigNumber } from '@/components/BigNumber';
import { RollingChart } from '@/components/RollingChart';
import { TodayStrip } from '@/components/TodayStrip';
import { MonthResetBanner } from '@/components/MonthResetBanner';
import { QuickAddRow } from '@/components/QuickAddRow';
import { getMonthExpenses, getWeekExpenses, sumRMB } from '@/lib/queries';
import { VARIABLE_BUDGET, IDR_PER_RMB } from '@/lib/constants';
import { remainingFree } from '@/lib/budget';
import { currentMonthKey, cstDateString } from '@/lib/date';
import { rmbToIdr } from '@/lib/money';
import { ensureDailyBudget, getLast7Days } from '@/lib/rolling-budget';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const month = currentMonthKey();
  const today = cstDateString();

  const [monthRows, week, todayBudget, last7] = await Promise.all([
    getMonthExpenses(month),
    getWeekExpenses(),
    ensureDailyBudget(today),
    getLast7Days(),
  ]);

  const spentFree = sumRMB(monthRows, { excludeFixed: true });
  const remaining = remainingFree(VARIABLE_BUDGET.freeSpending, spentFree);
  const idr = rmbToIdr(Math.max(0, remaining), IDR_PER_RMB);
  const weekSpent = sumRMB(week.rows, { excludeFixed: true });
  const monthSpent = spentFree;
  const isMonthResetDay = today.endsWith('-01');

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

      {isMonthResetDay && <MonthResetBanner />}

      <BigNumber remainingRMB={Math.max(0, remaining)} totalRMB={VARIABLE_BUDGET.freeSpending} idr={idr} />
      <TodayStrip today={todayBudget} />
      <RollingChart
        days={last7}
        today={today}
        weekSpent={weekSpent}
        monthSpent={monthSpent}
      />
      <QuickAddRow />
      <BottomNav />
    </AppShell>
  );
}
