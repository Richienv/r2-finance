import { AppShell } from '@/components/AppShell';
import { BottomNav } from '@/components/BottomNav';
import { WeekChart } from '@/components/WeekChart';
import { DayRow } from '@/components/DayRow';
import { getWeekExpenses } from '@/lib/queries';
import { cstDateString } from '@/lib/date';
import { formatRMB } from '@/lib/money';

export const dynamic = 'force-dynamic';

function labelFor(date: string) {
  const [, m, d] = date.split('-');
  const wd = ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date(`${date}T00:00:00+08:00`).getUTCDay()];
  return `${wd}, ${['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'][Number(m)-1]} ${Number(d)}`;
}

export default async function WeekPage() {
  const { days, rows, start, end } = await getWeekExpenses();
  const today = cstDateString();

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

  return (
    <AppShell>
      <header className="h-[60px] shrink-0 flex items-center justify-between px-4 border-b hairline">
        <span className="font-display text-xl tracking-wider">THIS WEEK</span>
        <span className="font-mono text-[11px] text-muted">{headerLabel}</span>
      </header>

      <WeekChart days={days} totalsByDay={totalsByDay} today={today} />

      <div className="flex-1 overflow-y-auto">
        {days.map(d => (
          <DayRow
            key={d}
            day={{
              date: d,
              label: labelFor(d),
              total: totalsByDay[d],
              expenses: byDay[d],
              isToday: d === today,
            }}
          />
        ))}
      </div>

      <div className="h-10 shrink-0 flex items-center justify-center border-t hairline font-mono text-[10px] tracking-widest text-muted">
        WEEK TOTAL: {formatRMB(weekTotal)} RMB · AVG {avg}/DAY
      </div>

      <BottomNav />
    </AppShell>
  );
}
