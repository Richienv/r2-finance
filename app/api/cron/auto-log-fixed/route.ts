import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { IDR_PER_RMB } from '@/lib/constants';
import { rmbToIdr } from '@/lib/money';

export const dynamic = 'force-dynamic';

// Once a month, log each user's active fixed costs as FIXED expenses.
// Idempotent per user per month.
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const date = cstDateString();
  const month = currentMonthKey();

  const users = await prisma.user.findMany({ select: { id: true } });
  let logged = 0;

  for (const { id: userId } of users) {
    const already = await prisma.expense.findFirst({
      where: { userId, date: { startsWith: month }, category: 'FIXED' },
    });
    if (already) continue;

    const [fixedCosts, settings] = await Promise.all([
      prisma.fixedCost.findMany({ where: { userId, active: true } }),
      prisma.monthlySettings.findUnique({ where: { userId_month: { userId, month } } }),
    ]);
    if (fixedCosts.length === 0) continue;
    const rate = settings?.idrPerRmb ?? IDR_PER_RMB;

    for (const fc of fixedCosts) {
      await prisma.expense.create({
        data: {
          userId,
          date,
          category: 'FIXED',
          amountRMB: fc.amountRMB,
          amountIDR: rmbToIdr(fc.amountRMB, rate),
          note: fc.name,
        },
      });
      logged++;
    }
  }

  return NextResponse.json({ logged });
}
