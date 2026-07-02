import { prisma } from '@/lib/prisma';
import { getMacros } from '@/app/actions/macro';
import { cstDateString, currentMonthKey, weekRange, daysInMonth, daysUntilPayday } from '@/lib/date';
import {
  MONTHLY_ALLOWANCE_IDR,
  MONTHLY_ALLOWANCE_RMB,
  IDR_PER_RMB,
  PAYDAY_DAY,
} from '@/lib/constants';

export type FinanceData = Awaited<ReturnType<typeof loadFinanceData>>;

/**
 * Loads everything the FinanceApp SPA renders, from the real DB.
 * Daily FIXED rows (auto-logged fixed costs) are excluded from the
 * variable-spending views — fixed costs surface via Settings + macro "FIXED OUT".
 */
export async function loadFinanceData() {
  const today = cstDateString();
  const monthKey = currentMonthKey();
  const { start: weekStart, end: weekEnd, days: weekDays } = weekRange(new Date());

  // Range wide enough to cover both the current month and the current week
  // (the week can straddle a month boundary).
  const lo = weekStart < `${monthKey}-01` ? weekStart : `${monthKey}-01`;
  const hi = weekEnd > `${monthKey}-31` ? weekEnd : `${monthKey}-31`;

  const [expenseRows, macroRows, settingsRow, fixedRows] = await Promise.all([
    prisma.expense.findMany({
      where: { date: { gte: lo, lte: hi }, NOT: { category: 'FIXED' } },
      orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    }),
    getMacros(),
    prisma.monthlySettings.findUnique({ where: { month: monthKey } }),
    prisma.fixedCost.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
  ]);

  const settings = settingsRow ?? {
    allowanceIDR: MONTHLY_ALLOWANCE_IDR,
    allowanceRMB: MONTHLY_ALLOWANCE_RMB,
    idrPerRmb: IDR_PER_RMB,
    paydayDay: PAYDAY_DAY,
  };

  return {
    today,
    monthKey,
    weekDays,
    daysInMonth: daysInMonth(monthKey),
    daysUntilPayday: daysUntilPayday(new Date(), settings.paydayDay),
    expenses: expenseRows.map((e) => ({
      id: e.id,
      date: e.date,
      category: e.category,
      note: e.note,
      amountRMB: e.amountRMB,
    })),
    macros: macroRows.map((m) => ({
      id: m.id,
      date: m.date,
      type: m.type,
      category: m.category,
      note: m.note,
      amountRMB: m.amountRMB,
    })),
    settings: {
      allowanceIDR: settings.allowanceIDR,
      allowanceRMB: settings.allowanceRMB,
      idrPerRmb: settings.idrPerRmb,
      paydayDay: settings.paydayDay,
    },
    fixed: fixedRows.map((f) => ({ id: f.id, name: f.name, amountRMB: f.amountRMB })),
  };
}
