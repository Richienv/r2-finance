import { ok, fail, preflight } from '@/lib/http';
import { getBudgetData } from '@/lib/hermes';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  try {
    return ok(await getBudgetData());
  } catch (e) {
    return fail('budget-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
