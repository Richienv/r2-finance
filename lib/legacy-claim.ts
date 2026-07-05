import 'server-only';
import { prisma } from '@/lib/prisma';

/**
 * One-time migration: assign all pre-multitenancy rows (userId IS NULL) to the
 * owner account. Idempotent — after the first run there are no null rows left,
 * and new rows always carry a userId, so this is a no-op thereafter.
 */
export async function claimLegacyData(ownerId: string): Promise<void> {
  const where = { userId: null } as const;
  const data = { userId: ownerId };
  await prisma.$transaction([
    prisma.expense.updateMany({ where, data }),
    prisma.macro.updateMany({ where, data }),
    prisma.income.updateMany({ where, data }),
    prisma.fixedCost.updateMany({ where, data }),
    prisma.monthlySettings.updateMany({ where, data }),
    prisma.dailyBudget.updateMany({ where, data }),
    prisma.activityLog.updateMany({ where, data }),
  ]);
}
