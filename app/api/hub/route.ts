import { NextResponse } from 'next/server';
import { getMonthExpenses, getTodayExpenses, sumRMB } from '@/lib/queries';
import { VARIABLE_BUDGET, DAILY_FREE_BUDGET, PAYDAY_DAY } from '@/lib/constants';
import { daysUntilPayday } from '@/lib/date';
import { remainingFree } from '@/lib/budget';
import { getOwnerUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ownerId = await getOwnerUserId();
  if (!ownerId) {
    return NextResponse.json({
      remainingRMB: VARIABLE_BUDGET.freeSpending,
      todaySpent: 0,
      todayRemaining: DAILY_FREE_BUDGET,
      daysUntilPayday: daysUntilPayday(new Date(), PAYDAY_DAY),
      isOverBudget: false,
    });
  }
  const [monthRows, todayRows] = await Promise.all([getMonthExpenses(ownerId), getTodayExpenses(ownerId)]);
  const spentFree = sumRMB(monthRows, { excludeFixed: true });
  const todaySpent = sumRMB(todayRows, { excludeFixed: true });
  const remainingRMB = remainingFree(VARIABLE_BUDGET.freeSpending, spentFree);
  const todayRemaining = Math.max(0, DAILY_FREE_BUDGET - todaySpent);
  return NextResponse.json({
    remainingRMB,
    todaySpent,
    todayRemaining,
    daysUntilPayday: daysUntilPayday(new Date(), PAYDAY_DAY),
    isOverBudget: remainingRMB < 0,
  });
}
