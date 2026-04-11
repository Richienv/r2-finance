import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cstDateString, currentMonthKey } from '@/lib/date';
import { FIXED_COSTS, GYM_BILLING_MONTHS, IDR_PER_RMB } from '@/lib/constants';
import { rmbToIdr } from '@/lib/money';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('unauthorized', { status: 401 });
  }

  const date = cstDateString();
  const month = currentMonthKey();
  const [, mm] = month.split('-').map(Number);

  // Skip if already logged this month (idempotent)
  const already = await prisma.expense.findFirst({
    where: { date: { startsWith: month }, category: 'FIXED' },
  });
  if (already) return NextResponse.json({ skipped: true });

  const entries: { name: string; amountRMB: number }[] = [
    { name: 'Apartment', amountRMB: FIXED_COSTS.apartment },
  ];
  if (GYM_BILLING_MONTHS.includes(mm)) {
    entries.push({ name: 'Gym (quarterly)', amountRMB: FIXED_COSTS.gym * 3 });
  }

  for (const e of entries) {
    await prisma.expense.create({
      data: {
        date,
        category: 'FIXED',
        amountRMB: e.amountRMB,
        amountIDR: rmbToIdr(e.amountRMB, IDR_PER_RMB),
        note: e.name,
      },
    });
  }

  return NextResponse.json({ logged: entries.length });
}
