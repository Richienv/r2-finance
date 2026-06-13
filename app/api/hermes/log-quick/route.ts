import type { NextRequest } from 'next/server';
import { ok, fail, preflight } from '@/lib/http';
import { logExpenseFromInput, type LogExpenseBody } from '@/lib/hermes';
import { logActivity, getActor } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

// Alias of the structured log-expense path for when Ren already has clean
// fields. Same effect and response shape.
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
      payload: { via: 'log-quick', ...result.expense },
    });
    return ok(result, 201);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    if (err?.code) return fail(err.code, err.message ?? 'invalid', 400);
    return fail('log-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
