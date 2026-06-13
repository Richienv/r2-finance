import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ok, fail, preflight } from '@/lib/http';
import {
  logExpenseFromInput,
  normalizeCategory,
  getRate,
  type LogExpenseBody,
} from '@/lib/hermes';
import { rmbToIdr } from '@/lib/money';
import { logActivity, getActor } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

// GET /api/expenses?from=YYYY-MM-DD — recent rows (public). Used by any puller
// and for general read access. Defaults to the last 30 days if `from` omitted.
export async function GET(req: NextRequest) {
  try {
    const from = req.nextUrl.searchParams.get('from');
    const where = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? { date: { gte: from } } : {};
    const rows = await prisma.expense.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      take: 500,
    });
    return ok({ expenses: rows, count: rows.length });
  } catch (e) {
    return fail('list-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}

// POST /api/expenses — create (auth). Structured/NL, same as log-expense.
export async function POST(req: NextRequest) {
  let body: LogExpenseBody;
  try {
    body = (await req.json()) as LogExpenseBody;
  } catch {
    return fail('bad-json', 'Request body must be valid JSON', 400);
  }
  try {
    const result = await logExpenseFromInput(body);
    await logActivity({
      actor: getActor(req),
      action: 'expense.create',
      entityId: result.expense.id,
      entityType: 'Expense',
      payload: { via: 'expenses', ...result.expense },
    });
    return ok(result, 201);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code) return fail(err.code, err.message ?? 'invalid', 400);
    return fail('create-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}

// PATCH /api/expenses — update amount/note/category by id (auth).
export async function PATCH(req: NextRequest) {
  let body: { id?: string; amountRMB?: number; note?: string; category?: string };
  try {
    body = await req.json();
  } catch {
    return fail('bad-json', 'Request body must be valid JSON', 400);
  }
  if (!body.id) return fail('missing-id', 'id is required', 400);

  const data: { amountRMB?: number; amountIDR?: number; note?: string | null; category?: string } = {};
  if (typeof body.amountRMB === 'number') {
    if (!(body.amountRMB > 0)) return fail('invalid-amount', 'amountRMB must be > 0', 400);
    data.amountRMB = body.amountRMB;
    data.amountIDR = rmbToIdr(body.amountRMB, await getRate());
  }
  if (typeof body.note === 'string') data.note = body.note.trim() || null;
  if (body.category) {
    const cat = normalizeCategory(body.category);
    if (!cat) return fail('invalid-category', 'unknown category', 400);
    data.category = cat;
  }
  if (Object.keys(data).length === 0) return fail('no-changes', 'nothing to update', 400);

  try {
    const expense = await prisma.expense.update({ where: { id: body.id }, data });
    await logActivity({
      actor: getActor(req),
      action: 'expense.update',
      entityId: expense.id,
      entityType: 'Expense',
      payload: { changes: data },
    });
    return ok({ expense });
  } catch {
    return fail('not-found', `No expense with id ${body.id}`, 404);
  }
}

// DELETE /api/expenses?id=... — delete by id (auth). Completes the CRUD surface.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('missing-id', 'id query param is required', 400);
  try {
    const expense = await prisma.expense.delete({ where: { id } });
    await logActivity({
      actor: getActor(req),
      action: 'expense.delete',
      entityId: id,
      entityType: 'Expense',
      payload: { deleted: expense },
    });
    return ok({ deleted: expense });
  } catch {
    return fail('not-found', `No expense with id ${id}`, 404);
  }
}
