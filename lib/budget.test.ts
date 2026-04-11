import { describe, it, expect } from 'vitest';
import { dailyStatus, remainingFree, dailyFreeBudget } from './budget';

describe('budget', () => {
  it('computes remaining free from free spending', () => {
    expect(remainingFree(1120, 0)).toBe(1120);
    expect(remainingFree(1120, 700)).toBe(420);
    expect(remainingFree(1120, 2000)).toBe(-880);
  });

  it('derives daily free from month length', () => {
    // 1120 / 30 = 37.33
    expect(dailyFreeBudget(1120, 30)).toBeCloseTo(37.33, 1);
  });

  it('flags daily status', () => {
    expect(dailyStatus(20).status).toBe('ok');
    expect(dailyStatus(40).status).toBe('warn');
    expect(dailyStatus(60).status).toBe('over');
  });
});
