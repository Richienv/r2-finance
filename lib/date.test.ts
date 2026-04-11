import { describe, it, expect } from 'vitest';
import {
  cstDateString,
  currentMonthKey,
  daysInMonth,
  daysUntilPayday,
  weekRange,
} from './date';

describe('date (CST)', () => {
  it('formats a Date as YYYY-MM-DD in CST', () => {
    // 2026-04-11T02:00:00Z == 2026-04-11 10:00 CST
    expect(cstDateString(new Date('2026-04-11T02:00:00Z'))).toBe('2026-04-11');
    // 2026-04-10T17:00:00Z == 2026-04-11 01:00 CST (rolls to next day)
    expect(cstDateString(new Date('2026-04-10T17:00:00Z'))).toBe('2026-04-11');
  });

  it('returns current month key YYYY-MM', () => {
    expect(currentMonthKey(new Date('2026-04-11T02:00:00Z'))).toBe('2026-04');
  });

  it('returns days in month', () => {
    expect(daysInMonth('2026-04')).toBe(30);
    expect(daysInMonth('2026-02')).toBe(28);
  });

  it('counts days until next payday (1st)', () => {
    // Apr 11 -> May 1 = 20 days
    expect(daysUntilPayday(new Date('2026-04-11T02:00:00Z'), 1)).toBe(20);
  });

  it('returns Mon..Sun range containing date', () => {
    const r = weekRange(new Date('2026-04-11T02:00:00Z')); // Sat
    expect(r.start).toBe('2026-04-06'); // Mon
    expect(r.end).toBe('2026-04-12');   // Sun
    expect(r.days).toHaveLength(7);
    expect(r.days[0]).toBe('2026-04-06');
    expect(r.days[6]).toBe('2026-04-12');
  });
});
