import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { SummaryCard } from '@/components/SummaryCard';
import { CategoryBar } from '@/components/CategoryBar';
import { getMonthExpenses, sumRMB } from '@/lib/queries';
import { currentMonthKey, daysUntilPayday } from '@/lib/date';
import { MONTHLY_ALLOWANCE_RMB, MONTHLY_ALLOWANCE_IDR, VARIABLE_BUDGET, FIXED_COSTS, CATEGORY_META, CATEGORIES, PAYDAY_DAY } from '@/lib/constants';
import { formatRMB, formatIDR } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function MonthPage() {
  const month = currentMonthKey();
  const rows = await getMonthExpenses(month);
  const spentTotal = sumRMB(rows);
  const spentFree = sumRMB(rows, { excludeFixed: true });
  const remainingFree = Math.max(0, VARIABLE_BUDGET.freeSpending - spentFree);
  const daysLeft = daysUntilPayday(new Date(), PAYDAY_DAY);

  const perCat: Record<string, number> = {};
  for (const r of rows) perCat[r.category] = (perCat[r.category] ?? 0) + r.amountRMB;
  const totalForPct = Math.max(1, spentTotal);

  const [y, m] = month.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">{monthLabel}</span>
      </header>

      <div className="p-4 grid grid-cols-2 gap-3 shrink-0">
        <SummaryCard label="ALLOWANCE" value={`${formatRMB(MONTHLY_ALLOWANCE_RMB)} RMB`} sub={formatIDR(MONTHLY_ALLOWANCE_IDR)} />
        <SummaryCard label="SPENT"     value={`${formatRMB(spentTotal)} RMB`} />
        <SummaryCard label="FIXED OUT" value={`${formatRMB(FIXED_COSTS.total)} RMB`} sub="(auto)" />
        <SummaryCard label="FREE"      value={`${formatRMB(remainingFree)} RMB`} sub="remaining" accent />
      </div>

      <div className="flex-1 px-5 overflow-y-auto">
        <div className="font-mono text-[10px] tracking-widest text-muted">CATEGORY BREAKDOWN</div>
        <div className="mt-1">
          {CATEGORIES.map(c => (
            <CategoryBar
              key={c}
              label={CATEGORY_META[c].label}
              amount={`${formatRMB(perCat[c] ?? 0)} RMB`}
              pct={((perCat[c] ?? 0) / totalForPct) * 100}
              color={CATEGORY_META[c].color}
            />
          ))}
        </div>
      </div>

      <div className="h-14 shrink-0 flex flex-col items-center justify-center border-t hairline">
        <div className="font-mono text-[10px] text-muted tracking-widest">NEXT ALLOWANCE IN {daysLeft} DAYS</div>
        <div className="font-mono text-[10px] text-accent">{formatIDR(MONTHLY_ALLOWANCE_IDR)}</div>
      </div>

      <BottomNav />
    </AppShell>
  );
}
