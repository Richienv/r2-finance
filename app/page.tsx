import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { StatRing } from '@/components/StatRing';
import { MonthResetBanner } from '@/components/MonthResetBanner';
import { QuickAddRow } from '@/components/QuickAddRow';
import { TopPurchases } from '@/components/TopPurchases';
import { getBankBalance, getMonthExpenses, getTopPurchases, getWeekExpenses, sumRMB } from '@/lib/queries';
import {
  VARIABLE_BUDGET,
  IDR_PER_RMB,
  WEEKLY_BUDGET,
  MONTHLY_FREE,
} from '@/lib/constants';
import { remainingFree } from '@/lib/budget';
import { currentMonthKey, cstDateString } from '@/lib/date';
import { rmbToIdr, formatIDR, formatRMB } from '@/lib/money';
import { ensureDailyBudget } from '@/lib/rolling-budget';

export const dynamic = 'force-dynamic';

function formatParts(d: Date) {
  const date = d
    .toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone: 'Asia/Shanghai',
    })
    .toUpperCase()
    .replace(/(\w+) (\w+) (\d+)/, '$1, $2 $3');
  const time = d
    .toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Shanghai',
    })
    .toUpperCase();
  const monthYear = d
    .toLocaleString('en-US', {
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Shanghai',
    })
    .toUpperCase();
  return { date, time, monthYear };
}

export default async function HomePage() {
  const month = currentMonthKey();
  const today = cstDateString();

  const [monthRows, week, todayBudget, bank, topPurchases] = await Promise.all([
    getMonthExpenses(month),
    getWeekExpenses(),
    ensureDailyBudget(today),
    getBankBalance(),
    getTopPurchases(3),
  ]);

  const spentFree = sumRMB(monthRows, { excludeFixed: true });
  const weekSpent = sumRMB(week.rows, { excludeFixed: true });
  const monthSpent = spentFree;

  // Day
  const dayBudget = todayBudget.budgetAmount;
  const daySpent = todayBudget.spent;
  const dayLeft = dayBudget - daySpent;
  const dayPct = dayBudget > 0 ? daySpent / dayBudget : 0;
  const dayOver = daySpent > dayBudget;

  // Week
  const weekBudget = WEEKLY_BUDGET;
  const weekPct = weekBudget > 0 ? weekSpent / weekBudget : 0;
  const weekOver = weekSpent > weekBudget;

  // Month
  const monthBudget = MONTHLY_FREE;
  const monthPct = monthBudget > 0 ? monthSpent / monthBudget : 0;
  const monthOver = monthSpent > monthBudget;

  // Legacy "free spending" IDR conversion — demoted to small caption
  const freeRemaining = Math.max(0, remainingFree(VARIABLE_BUDGET.freeSpending, spentFree));
  const idr = rmbToIdr(freeRemaining, IDR_PER_RMB);

  const isMonthResetDay = today.endsWith('-01');
  const now = new Date();
  const { date: dateLabel, time: timeLabel, monthYear } = formatParts(now);

  const carryover = todayBudget.carryover;
  let carryNote = '';
  if (carryover > 0.5) carryNote = `+${Math.round(carryover)} CARRY`;
  else if (carryover < -0.5) carryNote = `${Math.round(carryover)} CARRY`;

  const subline = [
    `¥${formatRMB(dayBudget)} BUDGET`,
    `${formatRMB(Math.max(0, dayLeft))} LEFT`,
    carryNote || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <AppShell>
      {/* HEADER */}
      <header className="shrink-0 pt-5 px-5 pb-2 flex items-start justify-between">
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[22px] tracking-wider text-accent">R2·FIT</span>
          <span className="mt-1.5 font-mono text-[10px] tracking-[1px] text-[#888]">
            {dateLabel} · {timeLabel}
          </span>
          <span className="mt-1 font-mono text-[10px] tracking-[1px] text-[#555]">
            {subline}
          </span>
        </div>
        <span className="font-mono text-[11px] tracking-[2px] text-[#555] uppercase mt-1">
          {monthYear}
        </span>
      </header>

      {isMonthResetDay && <MonthResetBanner />}

      {/* MAIN */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 gap-10">
        <TopPurchases items={topPurchases} />

        <div className="flex items-start justify-center gap-6">
          <StatRing
            value={formatRMB(daySpent)}
            unit={`/ ${formatRMB(dayBudget)} RMB`}
            pct={dayPct}
            over={dayOver}
            gradientId="ring-day"
            gradientFrom={dayOver ? '#ff4444' : '#e8ff47'}
            gradientTo={dayOver ? '#cc2200' : '#b8cc00'}
            numberColor={dayOver ? '#ff4444' : '#e8ff47'}
            label="DAY"
          />
          <StatRing
            value={formatRMB(weekSpent)}
            unit={`/ ${formatRMB(WEEKLY_BUDGET)} RMB`}
            pct={weekPct}
            over={weekOver}
            gradientId="ring-week"
            gradientFrom={weekOver ? '#ff4444' : '#e8ff47'}
            gradientTo={weekOver ? '#cc2200' : '#a0c000'}
            numberColor={weekOver ? '#ff4444' : '#e8ff47'}
            label="WEEK"
          />
          <StatRing
            value={formatRMB(monthSpent)}
            unit={`/ ${formatRMB(monthBudget)} RMB`}
            pct={monthPct}
            over={monthOver}
            gradientId="ring-month"
            gradientFrom={monthOver ? '#ff4444' : '#e8ff47'}
            gradientTo={monthOver ? '#cc2200' : '#555500'}
            numberColor={monthOver ? '#ff4444' : '#e8ff47'}
            label="MONTH"
          />
        </div>

        {/* Bank: total cash position = macro income − macro expenses − daily expenses */}
        <div className="flex flex-col items-center gap-1">
          <span className="font-mono text-[9px] tracking-[2px] text-[#555]">BANK</span>
          <span
            className="font-display text-[28px] leading-tight tabular-nums"
            style={{ color: bank.balanceRMB < 0 ? '#ff4747' : '#e8ff47' }}
          >
            {bank.balanceRMB < 0 ? '−' : ''}¥{formatRMB(Math.abs(bank.balanceRMB))}
          </span>
          <span className="font-mono text-[10px] text-[#555] tabular-nums">
            ≈ {bank.balanceRMB < 0 ? '−' : ''}{formatIDR(rmbToIdr(Math.abs(bank.balanceRMB), IDR_PER_RMB))}
          </span>
          <span className="font-mono text-[9px] tracking-[1px] tabular-nums mt-1">
            <span style={{ color: '#a8b840' }}>+¥{formatRMB(bank.incomeRMB)} IN</span>
            <span className="text-[#333] mx-2">·</span>
            <span style={{ color: '#cc4444' }}>−¥{formatRMB(bank.expenseRMB)} OUT</span>
          </span>
          <span className="mt-3 font-mono text-[9px] tracking-[1.5px] text-[#3a3a3a] text-center">
            {formatIDR(idr)} · FREE POOL
          </span>
        </div>
      </div>

      <QuickAddRow />
      <BottomNav />
    </AppShell>
  );
}
