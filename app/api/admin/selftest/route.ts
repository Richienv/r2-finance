import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getMonthExpenses, getBankBalance } from '@/lib/queries';
import { getMacros } from '@/app/actions/macro';
import { cstDateString, currentMonthKey } from '@/lib/date';

export const dynamic = 'force-dynamic';

// Key-gated multi-tenant isolation self-test. Creates two throwaway users,
// writes data for each, asserts each user sees ONLY their own data through the
// real scoped query paths, asserts cross-user deletes are refused, then removes
// both users (cascade). Returns the assertions. Safe: touches only its own rows.
function authorized(req: NextRequest): boolean {
  const bearer = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const key = (req.headers.get('x-api-key') ?? bearer ?? '').trim();
  const expected = (process.env.R2_FINANCE_API_KEY ?? '').trim();
  return !!key && !!expected && key === expected;
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const today = cstDateString();
  const month = currentMonthKey();
  const tag = Date.now();
  const emailA = `selftest-a-${tag}@example.com`;
  const emailB = `selftest-b-${tag}@example.com`;
  const checks: { name: string; pass: boolean; detail?: unknown }[] = [];
  let aId = '', bId = '';

  try {
    const a = await prisma.user.create({ data: { email: emailA, passwordHash: 'x' }, select: { id: true } });
    const b = await prisma.user.create({ data: { email: emailB, passwordHash: 'x' }, select: { id: true } });
    aId = a.id; bId = b.id;

    const eA = await prisma.expense.create({ data: { userId: aId, date: today, amountRMB: 11, amountIDR: 23914, category: 'FOOD', note: 'A-only' } });
    await prisma.expense.create({ data: { userId: bId, date: today, amountRMB: 99, amountIDR: 215226, category: 'PERSONAL', note: 'B-only' } });
    await prisma.macro.create({ data: { userId: aId, date: month + '-01', amountRMB: 500, amountIDR: 1087000, type: 'INCOME', category: 'SALARY', note: 'A income' } });

    // 1. A's month view contains only A's expense
    const aExp = await getMonthExpenses(aId, month);
    checks.push({ name: 'A sees only A expenses', pass: aExp.length === 1 && aExp[0].note === 'A-only', detail: aExp.map(e => e.note) });

    // 2. B's month view contains only B's expense
    const bExp = await getMonthExpenses(bId, month);
    checks.push({ name: 'B sees only B expenses', pass: bExp.length === 1 && bExp[0].note === 'B-only', detail: bExp.map(e => e.note) });

    // 3. A's macros isolated
    const aMac = await getMacros(aId);
    checks.push({ name: 'A sees only A macros', pass: aMac.length === 1 && aMac[0].note === 'A income', detail: aMac.length });

    // 4. B's bank does not include A's income/expense
    const bBank = await getBankBalance(bId);
    checks.push({ name: 'B bank excludes A data', pass: bBank.incomeRMB === 0 && bBank.expenseRMB === 99, detail: bBank });

    // 5. B cannot delete A's expense (ownership check pattern)
    const delAttempt = await prisma.expense.deleteMany({ where: { id: eA.id, userId: bId } });
    checks.push({ name: 'B cannot delete A expense', pass: delAttempt.count === 0, detail: delAttempt.count });

    // 6. A's expense still exists after B's attempt
    const stillThere = await prisma.expense.findFirst({ where: { id: eA.id, userId: aId } });
    checks.push({ name: 'A expense survived cross-user delete', pass: !!stillThere });
  } catch (e) {
    checks.push({ name: 'threw', pass: false, detail: e instanceof Error ? e.message : String(e) });
  } finally {
    // cleanup — cascade removes all their rows
    if (aId) await prisma.user.delete({ where: { id: aId } }).catch(() => {});
    if (bId) await prisma.user.delete({ where: { id: bId } }).catch(() => {});
  }

  const allPass = checks.every(c => c.pass);
  return NextResponse.json({ ok: allPass, checks });
}
