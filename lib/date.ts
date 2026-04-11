const TZ = 'Asia/Shanghai';

function cstParts(d: Date) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
  const parts = Object.fromEntries(fmt.formatToParts(d).map(p => [p.type, p.value]));
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

export function cstDateString(d: Date = new Date()): string {
  const { year, month, day } = cstParts(d);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function currentMonthKey(d: Date = new Date()): string {
  const { year, month } = cstParts(d);
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

export function daysUntilPayday(now: Date, paydayDay: number): number {
  const { year, month, day } = cstParts(now);
  const thisMonthDays = daysInMonth(`${year}-${String(month).padStart(2, '0')}`);
  if (day < paydayDay) return paydayDay - day;
  // next month's payday
  return (thisMonthDays - day) + paydayDay;
}

export function weekRange(d: Date = new Date()): { start: string; end: string; days: string[] } {
  const { year, month, day } = cstParts(d);
  // Build a Date at CST midnight by using UTC math with a +8 offset
  const base = new Date(Date.UTC(year, month - 1, day));
  const weekday = base.getUTCDay(); // 0=Sun..6=Sat
  const mondayOffset = (weekday + 6) % 7; // days since Monday
  const monday = new Date(base);
  monday.setUTCDate(base.getUTCDate() - mondayOffset);

  const days: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d2 = new Date(monday);
    d2.setUTCDate(monday.getUTCDate() + i);
    const y = d2.getUTCFullYear();
    const m = String(d2.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d2.getUTCDate()).padStart(2, '0');
    days.push(`${y}-${m}-${dd}`);
  }
  return { start: days[0], end: days[6], days };
}
