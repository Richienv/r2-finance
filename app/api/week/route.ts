import type { NextRequest } from 'next/server';
import { ok, fail, preflight } from '@/lib/http';
import { getWeekData } from '@/lib/hermes';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  try {
    const startDate = req.nextUrl.searchParams.get('startDate') ?? undefined;
    return ok(await getWeekData(startDate));
  } catch (e) {
    return fail('week-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
