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
import { getOwnerUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

// This CRUD surface is the agent's (owner-scoped). Mutations are gated by the
// R2_FINANCE_API_KEY in middleware; everything here operates on the owner's data.
async function requireOwner(): Promise<string | null> {
  return getOwnerUserId();
}

// GET /api/expenses?from=YYYY-MM-DD — recent owner rows.
export async function GET(req: NextRequest) {
  const ownerId = await requireOwner();
  if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
  try {
    const from = req.nextUrl.searchParams.get('from');
    const where =
      from && /^\d{4}-\d{2}-\d{2}$/.test(from)
        ? { userId: ownerId, date: { gte: from } }
        : { userId: ownerId };
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
  const ownerId = await requireOwner();
  if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
  let body: LogExpenseBody;
  try {
    body = (await req.json()) as LogExpenseBody;
  } catch {
    return fail('bad-json', 'Request body must be valid JSON', 400);
  }
  try {
    const result = await logExpenseFromInput(ownerId, body);
    await logActivity({
      userId: ownerId,
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
  const ownerId = await requireOwner();
  if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
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
    data.amountIDR = rmbToIdr(body.amountRMB, await getRate(ownerId));
  }
  if (typeof body.note === 'string') data.note = body.note.trim() || null;
  if (body.category) {
    const cat = normalizeCategory(body.category);
    if (!cat) return fail('invalid-category', 'unknown category', 400);
    data.category = cat;
  }
  if (Object.keys(data).length === 0) return fail('no-changes', 'nothing to update', 400);

  const { count } = await prisma.expense.updateMany({ where: { id: body.id, userId: ownerId }, data });
  if (count === 0) return fail('not-found', `No expense with id ${body.id}`, 404);
  await logActivity({
    userId: ownerId,
    actor: getActor(req),
    action: 'expense.update',
    entityId: body.id,
    entityType: 'Expense',
    payload: { changes: data },
  });
  return ok({ id: body.id, changes: data });
}

// DELETE /api/expenses?id=... — delete by id (auth). Completes the CRUD surface.
export async function DELETE(req: NextRequest) {
  const ownerId = await requireOwner();
  if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return fail('missing-id', 'id query param is required', 400);
  const { count } = await prisma.expense.deleteMany({ where: { id, userId: ownerId } });
  if (count === 0) return fail('not-found', `No expense with id ${id}`, 404);
  await logActivity({
    userId: ownerId,
    actor: getActor(req),
    action: 'expense.delete',
    entityId: id,
    entityType: 'Expense',
    payload: { deleted: id },
  });
  return ok({ deleted: id });
}
