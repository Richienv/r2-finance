import type { NextRequest } from 'next/server';
import { ok, fail, preflight } from '@/lib/http';
import { getMonthData } from '@/lib/hermes';
import { getOwnerUserId } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export function OPTIONS() {
  return preflight();
}

export async function GET(req: NextRequest) {
  try {
    const ownerId = await getOwnerUserId();
    if (!ownerId) return fail('no-owner', 'Owner account not set up yet', 503);
    const month = req.nextUrl.searchParams.get('month') ?? undefined;
    return ok(await getMonthData(ownerId, month));
  } catch (e) {
    return fail('month-failed', e instanceof Error ? e.message : 'unavailable', 500);
  }
}
