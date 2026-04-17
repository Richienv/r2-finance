import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { WeekChart } from '@/components/WeekChart';
import { WeekDayList } from '@/components/WeekDayList';
import { getMonthExpenses, getWeekExpenses, sumRMB } from '@/lib/queries';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { formatRMB } from '@/lib/money';
import { DAILY_BUDGET, WEEKLY_BUDGET, MONTHLY_FREE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

function labelFor(date: string) {
  const [, m, d] = date.split('-');
  const wd = ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(`${date}T00:00:00+08:00`).getUTCDay()];
  return `${wd}, ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][Number(m)-1]} ${Number(d)}`;
}

export default async function WeekPage() {
  const { days, rows, start, end } = await getWeekExpenses();
  const today = cstDateString();
  const monthRows = await getMonthExpenses(currentMonthKey());
  const monthSpent = sumRMB(monthRows, { excludeFixed: true });

  const totalsByDay: Record<string, number> = Object.fromEntries(days.map(d => [d, 0]));
  const byDay: Record<string, typeof rows> = Object.fromEntries(days.map(d => [d, []]));
  for (const r of rows) {
    if (r.category === 'FIXED') continue;
    totalsByDay[r.date] += r.amountRMB;
    byDay[r.date].push(r);
  }

  const weekTotal = Object.values(totalsByDay).reduce((a,b) => a+b, 0);
  const avg = Math.round(weekTotal / 7);
  const headerLabel = `${start.slice(5).replace('-','/')}–${end.slice(5).replace('-','/')}`;

  // Expectations
  const daysElapsedInWeek = Math.min(7, days.filter(d => d <= today).length);
  const expectedSoFar = DAILY_BUDGET * daysElapsedInWeek;
  const weekDelta = expectedSoFar - weekTotal; // positive = saved, negative = over
  const weekProjected = daysElapsedInWeek > 0 ? Math.round((weekTotal / daysElapsedInWeek) * 7) : 0;

  // Month projection
  const [, mStr] = currentMonthKey().split('-');
  const [y, m] = currentMonthKey().split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const todayDay = Number(today.slice(8, 10));
  const monthProjected = todayDay > 0 ? Math.round((monthSpent / todayDay) * daysInMonth) : 0;
  const monthProjectedDelta = MONTHLY_FREE - monthProjected;
  void mStr;

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">THIS WEEK</span>
        <span className="font-mono text-[11px] text-muted">{headerLabel}</span>
      </header>

      <WeekChart days={days} totalsByDay={totalsByDay} today={today} />

      <WeekDayList
        today={today}
        days={days.map(d => ({
          date: d,
          label: labelFor(d),
          total: totalsByDay[d],
          expenses: byDay[d],
          isToday: d === today,
        }))}
      />

      <div className="shrink-0 border-t hairline px-5 py-3 grid grid-cols-2 gap-y-1.5 font-mono text-[10px] tracking-widest text-muted">
        <span>WEEK SPENT</span>
        <span className="text-right text-white tabular-nums">{formatRMB(weekTotal)} RMB</span>
        <span>EXPECTED ({daysElapsedInWeek}d × {DAILY_BUDGET})</span>
        <span className="text-right tabular-nums text-muted">{formatRMB(expectedSoFar)} RMB</span>
        <span>{weekDelta >= 0 ? 'SAVED' : 'OVER'}</span>
        <span className={`text-right tabular-nums ${weekDelta >= 0 ? 'text-success' : 'text-danger'}`}>
          {weekDelta >= 0 ? '+' : '−'}{formatRMB(Math.abs(weekDelta))} RMB
        </span>
        <span>PROJECTED WEEK</span>
        <span className={`text-right tabular-nums ${weekProjected > WEEKLY_BUDGET ? 'text-danger' : 'text-success'}`}>
          {formatRMB(weekProjected)} / {WEEKLY_BUDGET}
        </span>
        <span>PROJECTED MONTH</span>
        <span className={`text-right tabular-nums ${monthProjected > MONTHLY_FREE ? 'text-danger' : 'text-success'}`}>
          {formatRMB(monthProjected)} / {MONTHLY_FREE}
        </span>
        <span>AVG / DAY</span>
        <span className="text-right tabular-nums text-muted">{avg} RMB</span>
        <span className="col-span-2 text-[9px] text-[#444] text-center pt-1">
          {monthProjectedDelta >= 0
            ? `ON TRACK TO SAVE ${formatRMB(monthProjectedDelta)} THIS MONTH`
            : `PROJECTED OVER BY ${formatRMB(Math.abs(monthProjectedDelta))}`}
        </span>
      </div>

      <BottomNav />
    </AppShell>
  );
}
