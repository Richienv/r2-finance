import { describe, it, expect } from 'vitest';
import { rmbToIdr, formatRMB, formatIDR, percent } from './money';

describe('money', () => {
  it('converts rmb to idr using rate', () => {
    expect(rmbToIdr(100, 2174)).toBe(217_400);
  });

  it('formats RMB as integer with grouping', () => {
    expect(formatRMB(1120)).toBe('1,120');
    expect(formatRMB(1120.5)).toBe('1,121');
  });

  it('formats IDR with Rp prefix and grouping', () => {
    expect(formatIDR(2_436_080)).toBe('Rp 2,436,080');
  });

  it('percent clamps to 0..100', () => {
    expect(percent(50, 100)).toBe(50);
    expect(percent(150, 100)).toBe(100);
    expect(percent(-5, 100)).toBe(0);
    expect(percent(0, 0)).toBe(0);
  });
});
