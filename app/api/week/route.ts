import type { NextRequest } from 'next/server';
import { ok, fail, preflight } from '@/lib/http';
import { getWeekData } from '@/lib/hermes';
import { getOwnerUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  try {
    const ownerId = await getOwnerUserId();
    if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
    const startDate = req.nextUrl.searchParams.get('startDate') ?? undefined;
    return ok(await getWeekData(ownerId, startDate));
  } catch (e) {
    return fail('week-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
