import { prisma } from '@/lib/prisma';
import { currentMonthKey, cstDateString, weekRange } from '@/lib/date';

export async function getMonthExpenses(monthKey = currentMonthKey()) {
  return prisma.expense.findMany({
    where: { date: { startsWith: monthKey } },
    orderBy: { date: 'desc' },
  });
}

export async function getTodayExpenses(today = cstDateString()) {
  return prisma.expense.findMany({
    where: { date: today },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getWeekExpenses(now = new Date()) {
  const { start, end, days } = weekRange(now);
  const rows = await prisma.expense.findMany({
    where: { date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });
  return { start, end, days, rows };
}

export function sumRMB(rows: { amountRMB: number; category: string }[], opts?: { excludeFixed?: boolean }) {
  return rows
    .filter(r => !opts?.excludeFixed || r.category !== 'FIXED')
    .reduce((s, r) => s + r.amountRMB, 0);
}

export async function getBankBalance() {
  const [macroIncome, macroExpense, dailyExpense] = await Promise.all([
    prisma.macro.aggregate({
      _sum: { amountRMB: true },
      where: { type: 'INCOME' },
    }),
    prisma.macro.aggregate({
      _sum: { amountRMB: true },
      where: { type: 'EXPENSE' },
    }),
    prisma.expense.aggregate({
      _sum: { amountRMB: true },
    }),
  ]);

  const incomeRMB = macroIncome._sum.amountRMB ?? 0;
  const macroExpenseRMB = macroExpense._sum.amountRMB ?? 0;
  const dailyExpenseRMB = dailyExpense._sum.amountRMB ?? 0;
  const expenseRMB = macroExpenseRMB + dailyExpenseRMB;

  return {
    balanceRMB: incomeRMB - expenseRMB,
    incomeRMB,
    expenseRMB,
    macroExpenseRMB,
    dailyExpenseRMB,
  };
}

export type TopPurchase = {
  id: string;
  label: string;
  category: string;
  amountRMB: number;
  date: string;
  source: 'DAILY' | 'MACRO';
};

export async function getTopPurchases(limit = 3): Promise<TopPurchase[]> {
  const [topExpenses, topMacro] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { amountRMB: 'desc' },
      take: limit,
      select: { id: true, note: true, category: true, amountRMB: true, date: true },
    }),
    prisma.macro.findMany({
      where: { type: 'EXPENSE' },
      orderBy: { amountRMB: 'desc' },
      take: limit,
      select: { id: true, note: true, category: true, amountRMB: true, date: true },
    }),
  ]);

  const merged: TopPurchase[] = [
    ...topExpenses.map(e => ({
      id: `e:${e.id}`,
      label: e.note?.trim() || e.category,
      category: e.category,
      amountRMB: e.amountRMB,
      date: e.date,
      source: 'DAILY' as const,
    })),
    ...topMacro.map(m => ({
      id: `m:${m.id}`,
      label: m.note?.trim() || m.category,
      category: m.category,
      amountRMB: m.amountRMB,
      date: m.date,
      source: 'MACRO' as const,
    })),
  ];

  merged.sort((a, b) => b.amountRMB - a.amountRMB);
  return merged.slice(0, limit);
}
