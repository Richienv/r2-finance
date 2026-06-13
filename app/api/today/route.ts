import { ok, fail, preflight } from '@/lib/http';
import { getTodayData } from '@/lib/hermes';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  try {
    return ok(await getTodayData());
  } catch (e) {
    return fail('today-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
