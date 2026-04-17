import { prisma } from '@/lib/prisma';
import { cstDateString } from '@/lib/date';
import { DAILY_BUDGET } from '@/lib/constants';

export const MIN_DAILY_BUDGET = 10;
export const MAX_DAILY_BUDGET = 100;

export type RollingDay = {
  date: string;
  baseAmount: number;
  carryover: number;
  budgetAmount: number;
  spent: number;
  remaining: number;
};

export function clampBudget(value: number): number {
  return Math.min(MAX_DAILY_BUDGET, Math.max(MIN_DAILY_BUDGET, value));
}

function prevDateString(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() - 1);
  const yy = base.getUTCFullYear();
  const mm = String(base.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(base.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function isFirstOfMonth(date: string): boolean {
  return date.endsWith('-01');
}

async function spentOnDate(date: string): Promise<number> {
  const rows = await prisma.expense.findMany({
    where: { date },
    select: { amountRMB: true, category: true },
  });
  return rows
    .filter(r => r.category !== 'FIXED')
    .reduce((s, r) => s + r.amountRMB, 0);
}

/**
 * Ensure a DailyBudget row exists for `date`, deriving carryover from the
 * prior day. Updates `spent` from the live Expense table. Month reset on the 1st.
 */
export async function ensureDailyBudget(date: string): Promise<RollingDay> {
  const existing = await prisma.dailyBudget.findUnique({ where: { date } });
  const spent = await spentOnDate(date);

  if (existing) {
    if (existing.spent !== spent) {
      await prisma.dailyBudget.update({
        where: { date },
        data: { spent },
      });
    }
    return {
      date,
      baseAmount: existing.baseAmount,
      carryover: existing.carryover,
      budgetAmount: existing.budgetAmount,
      spent,
      remaining: existing.budgetAmount - spent,
    };
  }

  // Compute carryover from yesterday (unless month reset)
  let carryover = 0;
  if (!isFirstOfMonth(date)) {
    const yesterday = prevDateString(date);
    const prev = await prisma.dailyBudget.findUnique({ where: { date: yesterday } });
    if (prev) {
      const prevSpent = await spentOnDate(yesterday);
      carryover = Math.max(0, prev.budgetAmount - prevSpent);
    }
  }

  const budgetAmount = clampBudget(DAILY_BUDGET + carryover);

  await prisma.dailyBudget.create({
    data: {
      date,
      baseAmount: DAILY_BUDGET,
      carryover,
      budgetAmount,
      spent,
    },
  });

  return {
    date,
    baseAmount: DAILY_BUDGET,
    carryover,
    budgetAmount,
    spent,
    remaining: budgetAmount - spent,
  };
}

/**
 * Return rolling budget data for the last 7 days ending at `endDate` (inclusive).
 * Lazily backfills DailyBudget rows in order so carryover chains correctly.
 */
export async function getLast7Days(endDate: string = cstDateString()): Promise<RollingDay[]> {
  const dates: string[] = [];
  let cursor = endDate;
  for (let i = 0; i < 7; i++) {
    dates.unshift(cursor);
    cursor = prevDateString(cursor);
  }

  const results: RollingDay[] = [];
  for (const d of dates) {
    // Only create today; for historical days, return a derived view without upserting.
    if (d === endDate) {
      results.push(await ensureDailyBudget(d));
    } else {
      const row = await prisma.dailyBudget.findUnique({ where: { date: d } });
      const spent = await spentOnDate(d);
      if (row) {
        results.push({
          date: d,
          baseAmount: row.baseAmount,
          carryover: row.carryover,
          budgetAmount: row.budgetAmount,
          spent,
          remaining: row.budgetAmount - spent,
        });
      } else {
        results.push({
          date: d,
          baseAmount: DAILY_BUDGET,
          carryover: 0,
          budgetAmount: DAILY_BUDGET,
          spent,
          remaining: DAILY_BUDGET - spent,
        });
      }
    }
  }
  return results;
}
