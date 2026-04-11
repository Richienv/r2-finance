export function remainingFree(freeSpending: number, spent: number): number {
  return freeSpending - spent;
}

export function dailyFreeBudget(freeSpending: number, daysInMonth: number): number {
  return freeSpending / daysInMonth;
}

export type DailyStatus = { status: 'ok' | 'warn' | 'over'; label: string; color: string };

export function dailyStatus(spentToday: number): DailyStatus {
  if (spentToday < 37)  return { status: 'ok',   label: '✓ ON TRACK',        color: '#47ffb8' };
  if (spentToday < 50)  return { status: 'warn', label: '⚠️ SLIGHTLY OVER',   color: '#ffd447' };
  return                       { status: 'over', label: '✗ OVER BUDGET',     color: '#ff4747' };
}
