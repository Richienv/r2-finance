import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = await prisma.expense.findMany({ orderBy: { date: 'asc' } });
  const header = 'id,date,category,amountRMB,amountIDR,note\n';
  const body = rows.map(r =>
    [r.id, r.date, r.category, r.amountRMB, r.amountIDR, JSON.stringify(r.note ?? '')].join(','),
  ).join('\n');

  return new NextResponse(header + body, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="r2finance-${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
