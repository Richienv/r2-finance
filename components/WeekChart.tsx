import { cn } from '@/lib/cn';

export function WeekChart({
  days, totalsByDay, today,
}: { days: string[]; totalsByDay: Record<string, number>; today: string }) {
  const max = Math.max(50, ...days.map(d => totalsByDay[d] ?? 0));
  const labels = ['MON','TUE','WED','THU','FRI','SAT','SUN'];
  return (
    <div className="h-40 shrink-0 px-5 pt-4 flex items-end gap-2">
      {days.map((d, i) => {
        const v = totalsByDay[d] ?? 0;
        const h = Math.round((v / max) * 100);
        const over = v > 37;
        const isToday = d === today;
        return (
          <div key={d} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full h-28 flex items-end">
              <div
                className={cn('w-full rounded-sm', over ? 'bg-danger' : 'bg-success', isToday && 'outline outline-1 outline-accent')}
                style={{ height: `${h}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-muted">{labels[i]}</div>
          </div>
        );
      })}
    </div>
  );
}
