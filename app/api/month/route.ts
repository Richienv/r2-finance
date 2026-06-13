import type { NextRequest } from 'next/server';
import { ok, fail, preflight } from '@/lib/http';
import { getMonthData } from '@/lib/hermes';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get('month') ?? undefined;
    return ok(await getMonthData(month));
  } catch (e) {
    return fail('month-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
