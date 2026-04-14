'use client';
import { useState } from 'react';
import { DayRow, type Day } from './DayRow';

export function WeekDayList({ days, today }: { days: Day[]; today: string }) {
  const [openDate, setOpenDate] = useState<string | null>(today);

  return (
    <div className="flex-1 overflow-y-auto">
      {days.map(d => (
        <DayRow
          key={d.date}
          day={d}
          open={openDate === d.date}
          onToggle={() => setOpenDate(prev => (prev === d.date ? null : d.date))}
        />
      ))}
    </div>
  );
}
