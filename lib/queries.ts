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
