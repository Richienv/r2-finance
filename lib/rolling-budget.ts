import { prisma } from '@/lib/prisma';
import { cstDateString } from '@/lib/date';
import { DAILY_BUDGET } from '@/lib/constants';

export type RollingDay = {
  date: string;
  baseAmount: number;
  carryover: number;
  budgetAmount: number;
  spent: number;
  remaining: number;
};

function nextDateString(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + 1);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function monthStartOf(date: string): string {
  return date.slice(0, 7) + '-01';
}

/**
 * Rebuild the rolling-budget chain from the start of the month up to `upTo`.
 * Overspend compounds: if a prior day overspent, the deficit reduces the next
 * day's budget. Month boundary resets carry to 0.
 * Persists every computed day so historical reads stay consistent.
 */
async function rebuildChain(upTo: string): Promise<RollingDay[]> {
  const start = monthStartOf(upTo);
  const dates: string[] = [];
  let cur = start;
  while (cur <= upTo) {
    dates.push(cur);
    cur = nextDateString(cur);
  }

  const rows = await prisma.expense.findMany({
    where: { date: { in: dates } },
    select: { date: true, amountRMB: true, category: true },
  });
  const spentMap: Record<string, number> = Object.fromEntries(dates.map(d => [d, 0]));
  for (const r of rows) {
    if (r.category === 'FIXED') continue;
    spentMap[r.date] = (spentMap[r.date] ?? 0) + r.amountRMB;
  }

  const out: RollingDay[] = [];
  let prevBudget = 0;
  let prevSpent = 0;
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i];
    // Only overspend (sin) carries forward. Surplus days reset to base 37.
    const rawCarry = i === 0 ? 0 : prevBudget - prevSpent;
    const carryover = Math.min(0, rawCarry);
    const budgetAmount = DAILY_BUDGET + carryover;
    const spent = spentMap[d];
    out.push({
      date: d,
      baseAmount: DAILY_BUDGET,
      carryover,
      budgetAmount,
      spent,
      remaining: budgetAmount - spent,
    });
    prevBudget = budgetAmount;
    prevSpent = spent;
  }

  await Promise.all(
    out.map(row =>
      prisma.dailyBudget.upsert({
        where: { date: row.date },
        create: {
          date: row.date,
          baseAmount: row.baseAmount,
          carryover: row.carryover,
          budgetAmount: row.budgetAmount,
          spent: row.spent,
        },
        update: {
          baseAmount: row.baseAmount,
          carryover: row.carryover,
          budgetAmount: row.budgetAmount,
          spent: row.spent,
        },
      }),
    ),
  );

  return out;
}

export async function ensureDailyBudget(date: string): Promise<RollingDay> {
  const chain = await rebuildChain(date);
  return chain[chain.length - 1];
}

export async function getLast7Days(endDate: string = cstDateString()): Promise<RollingDay[]> {
  const chain = await rebuildChain(endDate);
  const last7 = chain.slice(-7);
  while (last7.length < 7) {
    // Pad with earlier (previous month) days as zero-spent placeholders.
    last7.unshift({
      date: '',
      baseAmount: DAILY_BUDGET,
      carryover: 0,
      budgetAmount: DAILY_BUDGET,
      spent: 0,
      remaining: DAILY_BUDGET,
    });
  }
  return last7;
}
