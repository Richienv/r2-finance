import { NextResponse } from 'next/server';
import { ensureDailyBudget } from '@/lib/rolling-budget';
import { cstDateString } from '@/lib/date';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = cstDateString();
  const row = await ensureDailyBudget(today);
  const carryoverLabel =
    row.carryover > 0
      ? `+${Math.round(row.carryover)} bonus from yesterday`
      : row.carryover < 0
        ? `${Math.round(row.carryover)} carried from yesterday`
        : '';

  return NextResponse.json({
    date: row.date,
    baseAmount: row.baseAmount,
    carryover: Math.round(row.carryover * 10) / 10,
    budgetAmount: Math.round(row.budgetAmount * 10) / 10,
    spent: Math.round(row.spent * 10) / 10,
    remaining: Math.round(row.remaining * 10) / 10,
    carryoverLabel,
  });
}
