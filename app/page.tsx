import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { StatRing } from '@/components/StatRing';
import { MonthResetBanner } from '@/components/MonthResetBanner';
import { QuickAddRow } from '@/components/QuickAddRow';
import { getMonthExpenses, getWeekExpenses, sumRMB } from '@/lib/queries';
import { getMonthIncome } from '@/app/actions/income';
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

function headline(dayLeft: number): string {
  if (dayLeft < 0) return 'TOMORROW RESETS.';
  if (dayLeft === 0) return 'ON TRACK.';
  return 'GOOD PACE.';
}

export default async function HomePage() {
  const month = currentMonthKey();
  const today = cstDateString();

  const [monthRows, week, todayBudget, incomeRows] = await Promise.all([
    getMonthExpenses(month),
    getWeekExpenses(),
    ensureDailyBudget(today),
    getMonthIncome(month),
  ]);
  const monthIncome = incomeRows.reduce((s, r) => s + r.amountRMB, 0);

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
  const weekLeft = weekBudget - weekSpent;
  const weekPct = weekBudget > 0 ? weekSpent / weekBudget : 0;
  const weekOver = weekSpent > weekBudget;

  // Month
  const monthBudget = MONTHLY_FREE;
  const monthLeft = monthBudget - monthSpent;
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
      <div className="flex-1 flex flex-col items-center justify-center px-4">
        <div
          className="font-display text-[32px] tracking-[2px] text-center"
          style={{
            backgroundImage:
              'linear-gradient(180deg, #f6ffa0 0%, #e8ff47 45%, #b8cc30 100%)',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent',
            WebkitTextFillColor: 'transparent',
          }}
        >
          {headline(dayLeft)}
        </div>

        <div className="mt-8 flex items-start justify-center gap-6">
          <StatRing
            value={dayOver ? `−${formatRMB(Math.abs(dayLeft))}` : formatRMB(dayLeft)}
            unit={dayOver ? 'RMB OVER' : 'RMB LEFT'}
            pct={dayPct}
            gradientId="ring-day"
            gradientFrom={dayOver ? '#ff4444' : '#e8ff47'}
            gradientTo={dayOver ? '#cc2200' : '#b8cc00'}
            numberColor={dayOver ? '#ff4444' : '#e8ff47'}
            label="DAY"
          />
          <StatRing
            value={weekOver ? `−${formatRMB(Math.abs(weekLeft))}` : formatRMB(weekLeft)}
            unit={weekOver ? 'RMB OVER' : 'RMB LEFT'}
            pct={weekPct}
            gradientId="ring-week"
            gradientFrom="#e8ff47"
            gradientTo="#a0c000"
            numberColor={weekOver ? '#ff4444' : '#e8ff47'}
            label="WEEK"
          />
          <StatRing
            value={monthOver ? `−${formatRMB(Math.abs(monthLeft))}` : formatRMB(monthLeft)}
            unit={monthOver ? 'RMB OVER' : 'RMB LEFT'}
            pct={monthPct}
            gradientId="ring-month"
            gradientFrom="#e8ff47"
            gradientTo="#555500"
            numberColor={monthOver ? '#ff4444' : '#e8ff47'}
            label="MONTH"
          />
        </div>

        <div className="mt-6 font-mono text-[9px] tracking-[1.5px] text-[#555] text-center">
          {formatIDR(idr)} · FREE POOL
        </div>
        <Link
          href="/income"
          className="mt-2 font-mono text-[10px] tracking-[1.5px] text-center"
          style={{ color: monthIncome > 0 ? '#e8ff47' : '#555' }}
        >
          {monthIncome > 0 ? `+${formatRMB(monthIncome)} INCOME THIS MONTH →` : '+ LOG INCOME / BONUS →'}
        </Link>
      </div>

      <QuickAddRow />
      <BottomNav />
    </AppShell>
  );
}
